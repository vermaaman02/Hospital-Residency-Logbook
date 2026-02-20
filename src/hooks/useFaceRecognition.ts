/**
 * @module useFaceRecognition
 * @description Custom hook for face-api.js face recognition.
 * Loads models, captures webcam frames, detects faces, and
 * compares against registered face descriptors.
 *
 * @see https://github.com/justadudewhohacks/face-api.js
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// face-api.js types
interface FaceDetection {
	descriptor: Float32Array;
}

interface FaceMatch {
	label: string;
	distance: number;
}

interface FaceMatcher {
	findBestMatch(descriptor: Float32Array): FaceMatch;
}

export interface RegisteredFace {
	studentId: string;
	studentName: string;
	descriptor: Float32Array;
}

export interface FaceRecognitionResult {
	studentId: string;
	studentName: string;
	distance: number;
	confidence: number;
}

export function useFaceRecognition() {
	const [modelsLoaded, setModelsLoaded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [webcamActive, setWebcamActive] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const faceApiRef = useRef<any>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const registeredFacesRef = useRef<RegisteredFace[]>([]);
	const matcherRef = useRef<FaceMatcher | null>(null);

	/**
	 * Load face-api.js models from /models/
	 */
	const loadModels = useCallback(async () => {
		if (modelsLoaded) return;
		setLoading(true);
		setError(null);

		try {
			// Dynamic import for client-side only
			const faceapi = await import("face-api.js");
			faceApiRef.current = faceapi;

			const MODEL_URL = "/models";
			await Promise.all([
				faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
				faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
				faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
				faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
			]);
			setModelsLoaded(true);
		} catch (err) {
			console.error("Failed to load face-api models:", err);
			setError("Failed to load face recognition models");
		} finally {
			setLoading(false);
		}
	}, [modelsLoaded]);

	/**
	 * Start webcam stream
	 */
	const startWebcam = useCallback(async () => {
		if (!videoRef.current) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 640 },
					height: { ideal: 480 },
					facingMode: "user",
				},
			});
			videoRef.current.srcObject = stream;
			setWebcamActive(true);
		} catch (err) {
			console.error("Webcam access denied:", err);
			setError("Camera access denied. Please allow camera permissions.");
		}
	}, []);

	/**
	 * Stop webcam stream
	 */
	const stopWebcam = useCallback(() => {
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
		setWebcamActive(false);
	}, []);

	/**
	 * Register a face from an image URL (e.g., Clerk profile photo).
	 * Uses /api/face-proxy to avoid CORS issues with external CDN images.
	 * Returns true if face was successfully registered.
	 */
	const registerFaceFromUrl = useCallback(
		async (
			imageUrl: string,
			studentId: string,
			studentName: string,
		): Promise<boolean> => {
			const faceapi = faceApiRef.current;
			if (!faceapi) {
				setError("Models not loaded");
				return false;
			}

			try {
				// Proxy external images through our API to avoid CORS
				const proxyUrl = `/api/face-proxy?url=${encodeURIComponent(imageUrl)}`;

				// Load image via HTML Image element (works with same-origin proxy)
				const img = await new Promise<HTMLImageElement>((resolve, reject) => {
					const image = new Image();
					image.crossOrigin = "anonymous";
					image.onload = () => resolve(image);
					image.onerror = (e) =>
						reject(new Error(`Image load failed for ${studentName}: ${e}`));
					image.src = proxyUrl;
				});

				const detection = await faceapi
					.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
					.withFaceLandmarks()
					.withFaceDescriptor();

				if (!detection) {
					console.warn(`No face detected in image for ${studentName}`);
					return false;
				}

				registeredFacesRef.current.push({
					studentId,
					studentName,
					descriptor: detection.descriptor,
				});

				// Rebuild matcher
				rebuildMatcher();
				return true;
			} catch (err) {
				console.error(`Failed to register face for ${studentName}:`, err);
				return false;
			}
		},
		[],
	);

	/**
	 * Rebuild the face matcher with all registered faces
	 */
	const rebuildMatcher = useCallback(() => {
		const faceapi = faceApiRef.current;
		if (!faceapi || registeredFacesRef.current.length === 0) return;

		const labeledDescriptors = registeredFacesRef.current.map(
			(face) =>
				new faceapi.LabeledFaceDescriptors(face.studentId, [face.descriptor]),
		);

		matcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
	}, []);

	/**
	 * Detect and recognize a face from the current webcam frame.
	 * Returns the best match or null.
	 */
	const recognizeFace =
		useCallback(async (): Promise<FaceRecognitionResult | null> => {
			const faceapi = faceApiRef.current;
			if (!faceapi || !videoRef.current || !matcherRef.current) return null;

			try {
				const detection = await faceapi
					.detectSingleFace(
						videoRef.current,
						new faceapi.TinyFaceDetectorOptions(),
					)
					.withFaceLandmarks()
					.withFaceDescriptor();

				if (!detection) return null;

				const match = matcherRef.current.findBestMatch(detection.descriptor);

				if (match.label === "unknown") return null;

				// Find student info
				const registered = registeredFacesRef.current.find(
					(f) => f.studentId === match.label,
				);

				return {
					studentId: match.label,
					studentName: registered?.studentName ?? "Unknown",
					distance: match.distance,
					confidence: Math.round((1 - match.distance) * 100),
				};
			} catch (err) {
				console.error("Face recognition error:", err);
				return null;
			}
		}, []);

	/**
	 * Draw face detection overlay on canvas
	 */
	const drawDetections = useCallback(async () => {
		const faceapi = faceApiRef.current;
		if (!faceapi || !videoRef.current || !canvasRef.current) return;

		const displaySize = {
			width: videoRef.current.videoWidth,
			height: videoRef.current.videoHeight,
		};
		faceapi.matchDimensions(canvasRef.current, displaySize);

		const detections = await faceapi
			.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks();

		const resizedDetections = faceapi.resizeResults(detections, displaySize);
		const ctx = canvasRef.current.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		}

		faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
	}, []);

	/**
	 * Clear all registered faces
	 */
	const clearRegisteredFaces = useCallback(() => {
		registeredFacesRef.current = [];
		matcherRef.current = null;
	}, []);

	// Cleanup webcam on unmount
	useEffect(() => {
		return () => {
			stopWebcam();
		};
	}, [stopWebcam]);

	return {
		modelsLoaded,
		loading,
		error,
		webcamActive,
		videoRef,
		canvasRef,
		registeredFaceCount: registeredFacesRef.current.length,
		loadModels,
		startWebcam,
		stopWebcam,
		registerFaceFromUrl,
		recognizeFace,
		drawDetections,
		clearRegisteredFaces,
	};
}
