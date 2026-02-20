/**
 * @module FaceRecognitionAttendance
 * @description Face recognition webcam component for live attendance verification.
 * Uses face-api.js to detect and match student faces against their Clerk profile photos.
 *
 * Flow:
 * 1. Load face-api.js models
 * 2. Fetch student profile photos and build face descriptors
 * 3. Start webcam feed
 * 4. Continuously detect and match faces
 * 5. On successful match (>60% confidence), mark attendance as Present
 *
 * @see src/hooks/useFaceRecognition.ts — core face recognition hook
 * @see src/actions/attendance.ts — getStudentsForFaceRecognition, markDailyAttendance
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	ScanFace,
	Camera,
	CameraOff,
	CheckCircle2,
	Loader2,
	AlertTriangle,
	RefreshCcw,
	User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	useFaceRecognition,
	type FaceRecognitionResult,
} from "@/hooks/useFaceRecognition";
import {
	getStudentsForFaceRecognition,
	markDailyAttendance,
} from "@/actions/attendance";

interface FaceRecognitionAttendanceProps {
	batchId: string;
	currentStudentId?: string;
	currentStudentName?: string;
	currentStudentImageUrl?: string;
	onAttendanceMarked?: () => void;
	disabled?: boolean;
}

export function FaceRecognitionAttendance({
	batchId,
	currentStudentId,
	currentStudentName,
	currentStudentImageUrl,
	onAttendanceMarked,
	disabled = false,
}: FaceRecognitionAttendanceProps) {
	const {
		loading: modelsLoading,
		error: modelError,
		webcamActive,
		videoRef,
		canvasRef,
		loadModels,
		startWebcam,
		stopWebcam,
		registerFaceFromUrl,
		recognizeFace,
		drawDetections,
		clearRegisteredFaces,
	} = useFaceRecognition();

	const [phase, setPhase] = useState<
		| "idle"
		| "loading-models"
		| "registering-faces"
		| "scanning"
		| "matched"
		| "error"
		| "no-photo"
	>("idle");
	const [matchResult, setMatchResult] = useState<FaceRecognitionResult | null>(
		null,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [registrationProgress, setRegistrationProgress] = useState({
		done: 0,
		total: 0,
	});
	const [scanStatus, setScanStatus] = useState<
		"waiting" | "face-detected" | "no-face" | "matching"
	>("waiting");
	const [scanSeconds, setScanSeconds] = useState(0);
	const [markingAttendance, setMarkingAttendance] = useState(false);
	const [attendanceMarked, setAttendanceMarked] = useState(false);
	const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const recognitionActiveRef = useRef(false);
	const autoSubmittingRef = useRef(false);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			if (scanIntervalRef.current) {
				clearInterval(scanIntervalRef.current);
			}
			recognitionActiveRef.current = false;
		};
	}, []);

	/**
	 * Mark attendance after successful face match (auto-called on match)
	 */
	const handleMarkAttendance = useCallback(
		async (studentName: string) => {
			if (autoSubmittingRef.current) return; // prevent double-submission
			autoSubmittingRef.current = true;
			setMarkingAttendance(true);
			try {
				const result = await markDailyAttendance({
					date: new Date(),
					presentAbsent: "Present",
				});
				if (result.success) {
					setAttendanceMarked(true);
					toast.success(`Attendance marked for ${studentName}`);
					onAttendanceMarked?.();
				}
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to mark attendance",
				);
			} finally {
				setMarkingAttendance(false);
				autoSubmittingRef.current = false;
			}
		},
		[onAttendanceMarked],
	);

	/**
	 * Full initialization flow: load models → register faces → start cam → scan
	 */
	const startRecognition = useCallback(async () => {
		try {
			// Step 1: Load models
			setPhase("loading-models");
			await loadModels();

			// Step 2: Fetch student photos and build descriptors
			setPhase("registering-faces");
			let students = await getStudentsForFaceRecognition(batchId);

			// Fallback: if no students found but we have the current student's image
			if (
				students.length === 0 &&
				currentStudentId &&
				currentStudentName &&
				currentStudentImageUrl
			) {
				students = [
					{
						studentId: currentStudentId,
						studentName: currentStudentName,
						profileImageUrl: currentStudentImageUrl,
					},
				];
			}

			if (students.length === 0) {
				setErrorMessage(
					"No profile photo found. Please update your profile picture in your account settings.",
				);
				setPhase("no-photo");
				return;
			}

			setRegistrationProgress({ done: 0, total: students.length });
			clearRegisteredFaces();

			let registered = 0;
			for (const student of students) {
				const success = await registerFaceFromUrl(
					student.profileImageUrl,
					student.studentId,
					student.studentName,
				);
				if (success) registered++;
				setRegistrationProgress((prev) => ({ ...prev, done: prev.done + 1 }));
			}

			if (registered === 0) {
				setErrorMessage(
					"Could not detect a face in your profile photo. Please use a clear, front-facing photo with good lighting.",
				);
				setPhase("error");
				return;
			}

			toast.info(`${registered} of ${students.length} face(s) registered`);

			// Step 3: Start webcam
			await startWebcam();

			// Step 4: Start scanning loop
			setPhase("scanning");
			setScanStatus("waiting");
			setScanSeconds(0);
			recognitionActiveRef.current = true;

			scanIntervalRef.current = setInterval(async () => {
				if (!recognitionActiveRef.current) return;

				setScanSeconds((prev) => prev + 1);

				try {
					await drawDetections();
					setScanStatus("matching");
					const result = await recognizeFace();

					if (result && result.confidence >= 60) {
						// If student mode: only match current student
						if (currentStudentId && result.studentId !== currentStudentId) {
							setScanStatus("face-detected");
							return; // Face detected but not the logged-in student
						}

						recognitionActiveRef.current = false;
						setMatchResult(result);
						setPhase("matched");

						if (scanIntervalRef.current) {
							clearInterval(scanIntervalRef.current);
							scanIntervalRef.current = null;
						}

						// Auto-submit attendance immediately
						handleMarkAttendance(result.studentName);
					} else if (result) {
						// Face detected but confidence too low
						setScanStatus("face-detected");
					} else {
						setScanStatus("no-face");
					}
				} catch {
					setScanStatus("no-face");
				}
			}, 1000); // Scan every 1 second
		} catch (err) {
			console.error("Face recognition initialization failed:", err);
			const errMsg =
				err instanceof Error ? err.message : "Unknown error occurred";
			setErrorMessage(`Face recognition error: ${errMsg}`);
			setPhase("error");
			toast.error(`Face recognition error: ${errMsg}`);
		}
	}, [
		batchId,
		currentStudentId,
		currentStudentName,
		currentStudentImageUrl,
		loadModels,
		clearRegisteredFaces,
		registerFaceFromUrl,
		startWebcam,
		drawDetections,
		recognizeFace,
		handleMarkAttendance,
	]);

	/**
	 * Stop everything
	 */
	const stopRecognition = useCallback(() => {
		recognitionActiveRef.current = false;
		if (scanIntervalRef.current) {
			clearInterval(scanIntervalRef.current);
			scanIntervalRef.current = null;
		}
		stopWebcam();
		setPhase("idle");
		setMatchResult(null);
		setScanStatus("waiting");
		setScanSeconds(0);
	}, [stopWebcam]);

	/**
	 * Retry scanning after a match (e.g., wrong person in HOD mode)
	 */
	const retryScan = useCallback(() => {
		setMatchResult(null);
		setPhase("scanning");
		setScanStatus("waiting");
		setScanSeconds(0);
		recognitionActiveRef.current = true;

		scanIntervalRef.current = setInterval(async () => {
			if (!recognitionActiveRef.current) return;
			setScanSeconds((prev) => prev + 1);
			try {
				await drawDetections();
				const result = await recognizeFace();
				if (result && result.confidence >= 60) {
					if (currentStudentId && result.studentId !== currentStudentId) {
						setScanStatus("face-detected");
						return;
					}
					recognitionActiveRef.current = false;
					setMatchResult(result);
					setPhase("matched");
					if (scanIntervalRef.current) {
						clearInterval(scanIntervalRef.current);
						scanIntervalRef.current = null;
					}
					// Auto-submit attendance immediately
					handleMarkAttendance(result.studentName);
				} else if (result) {
					setScanStatus("face-detected");
				} else {
					setScanStatus("no-face");
				}
			} catch {
				setScanStatus("no-face");
			}
		}, 1000);
	}, [drawDetections, recognizeFace, currentStudentId, handleMarkAttendance]);

	if (disabled) {
		return (
			<Card className="border-dashed">
				<CardContent className="py-8 text-center text-muted-foreground">
					<CameraOff className="h-10 w-10 mx-auto mb-3 opacity-30" />
					<p>Face recognition is disabled by administrator</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm flex items-center gap-2">
					<ScanFace className="h-4 w-4" /> Face Recognition Attendance
				</CardTitle>
				<CardDescription>
					{currentStudentName ?
						`Verify identity for ${currentStudentName}`
					:	"Verify your identity to mark attendance"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Webcam Feed */}
				<div
					className={cn(
						"relative w-full max-w-lg mx-auto aspect-4/3 bg-gray-900 rounded-lg overflow-hidden border-2 transition-colors duration-300",
						phase === "scanning" &&
							scanStatus === "no-face" &&
							"border-amber-400",
						phase === "scanning" &&
							scanStatus === "face-detected" &&
							"border-blue-400",
						phase === "scanning" &&
							(scanStatus === "matching" || scanStatus === "waiting") &&
							"border-gray-600",
						phase === "matched" && "border-green-400",
						phase !== "scanning" && phase !== "matched" && "border-transparent",
					)}
				>
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						className={cn(
							"w-full h-full object-cover",
							!webcamActive && "hidden",
						)}
					/>
					<canvas
						ref={canvasRef}
						className={cn(
							"absolute inset-0 w-full h-full",
							!webcamActive && "hidden",
						)}
					/>

					{/* Overlay states */}
					{phase === "idle" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-white">
							<Camera className="h-16 w-16 mb-4 opacity-40" />
							<p className="text-sm opacity-60">
								Click start to begin face recognition
							</p>
						</div>
					)}

					{phase === "loading-models" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60">
							<Loader2 className="h-10 w-10 animate-spin mb-3" />
							<p className="text-sm">Loading face recognition models...</p>
						</div>
					)}

					{phase === "registering-faces" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 px-8">
							<User className="h-8 w-8 mb-3" />
							<p className="text-sm mb-2">Registering student faces...</p>
							<Progress
								value={
									registrationProgress.total > 0 ?
										(registrationProgress.done / registrationProgress.total) *
										100
									:	0
								}
								className="h-2 w-full max-w-xs"
							/>
							<p className="text-xs mt-1 opacity-60">
								{registrationProgress.done} / {registrationProgress.total}
							</p>
						</div>
					)}

					{phase === "scanning" && webcamActive && (
						<>
							{/* Top-left live badge */}
							<div className="absolute top-3 left-3 z-10">
								<Badge className="bg-red-500 text-white animate-pulse gap-1.5">
									<span className="h-2 w-2 rounded-full bg-white" />
									Live — {scanSeconds}s
								</Badge>
							</div>
							{/* Top-right scan status indicator */}
							<div className="absolute top-3 right-3 z-10">
								{scanStatus === "no-face" && (
									<Badge
										variant="outline"
										className="bg-amber-500/80 text-white border-amber-400 gap-1"
									>
										<AlertTriangle className="h-3 w-3" />
										No face detected
									</Badge>
								)}
								{scanStatus === "face-detected" && (
									<Badge
										variant="outline"
										className="bg-blue-500/80 text-white border-blue-400 gap-1"
									>
										<ScanFace className="h-3 w-3" />
										Face found — verifying...
									</Badge>
								)}
								{(scanStatus === "matching" || scanStatus === "waiting") && (
									<Badge
										variant="outline"
										className="bg-gray-500/70 text-white border-gray-400 gap-1"
									>
										<Loader2 className="h-3 w-3 animate-spin" />
										Scanning...
									</Badge>
								)}
							</div>
							{/* Bottom guidance text */}
							<div className="absolute bottom-3 left-0 right-0 text-center z-10">
								<p className="text-xs text-white/80 bg-black/40 mx-auto w-fit px-3 py-1 rounded-full">
									{scanStatus === "no-face" ?
										"Position your face clearly in front of the camera"
									: scanStatus === "face-detected" ?
										"Hold still — comparing with your profile photo..."
									:	"Look directly at the camera"}
								</p>
							</div>
						</>
					)}

					{phase === "matched" && matchResult && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/70">
							<CheckCircle2 className="h-16 w-16 text-green-400 mb-3" />
							<p className="text-white text-lg font-semibold">
								{matchResult.studentName}
							</p>
							<p className="text-green-300 text-sm">
								Confidence: {matchResult.confidence}%
							</p>
							{markingAttendance && (
								<div className="flex items-center gap-2 mt-3 text-white/80">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="text-xs">Marking attendance...</span>
								</div>
							)}
							{attendanceMarked && (
								<p className="text-green-200 text-sm mt-2 font-medium">
									Attendance marked successfully!
								</p>
							)}
						</div>
					)}

					{phase === "error" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 px-6">
							<AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
							<p className="text-sm text-amber-300 text-center">
								{errorMessage ?? modelError ?? "Something went wrong"}
							</p>
							<p className="text-xs text-white/50 mt-2 text-center">
								Click &quot;Try Again&quot; below to retry
							</p>
						</div>
					)}

					{phase === "no-photo" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 px-6">
							<User className="h-12 w-12 text-blue-300 mb-3" />
							<p className="text-sm text-blue-200 font-medium text-center">
								Profile Photo Required
							</p>
							<p className="text-xs text-white/70 mt-2 text-center max-w-xs">
								{errorMessage ??
									"Please upload a clear, front-facing profile photo in your account settings for face recognition to work."}
							</p>
						</div>
					)}
				</div>

				{/* Control Buttons */}
				<div className="flex items-center justify-center gap-3">
					{phase === "idle" || phase === "error" || phase === "no-photo" ?
						<Button
							onClick={startRecognition}
							disabled={modelsLoading}
							variant={phase === "no-photo" ? "outline" : "default"}
						>
							{modelsLoading ?
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							:	<Camera className="h-4 w-4 mr-1" />}
							{phase === "error" || phase === "no-photo" ?
								"Try Again"
							:	"Start Face Recognition"}
						</Button>
					: phase === "scanning" ?
						<Button variant="destructive" onClick={stopRecognition}>
							<CameraOff className="h-4 w-4 mr-1" />
							Stop
						</Button>
					: phase === "matched" && matchResult ?
						<>
							{attendanceMarked ?
								<Badge
									variant="outline"
									className="text-green-600 border-green-300 bg-green-50 px-4 py-2 text-sm"
								>
									<CheckCircle2 className="h-4 w-4 mr-1" />
									Attendance Marked Successfully
								</Badge>
							: markingAttendance ?
								<Badge
									variant="outline"
									className="text-blue-600 border-blue-300 bg-blue-50 px-4 py-2 text-sm"
								>
									<Loader2 className="h-4 w-4 mr-1 animate-spin" />
									Submitting attendance...
								</Badge>
							:	<Button
									onClick={() => handleMarkAttendance(matchResult.studentName)}
									className="bg-green-600 hover:bg-green-700"
								>
									<CheckCircle2 className="h-4 w-4 mr-1" />
									Mark Present
								</Button>
							}
							{!attendanceMarked && !markingAttendance && (
								<Button variant="outline" onClick={retryScan}>
									<RefreshCcw className="h-4 w-4 mr-1" />
									Retry
								</Button>
							)}
							<Button variant="ghost" size="sm" onClick={stopRecognition}>
								Close Camera
							</Button>
						</>
					:	null}
				</div>

				{/* Match Info Card */}
				{phase === "matched" && matchResult && (
					<div
						className={cn(
							"rounded-md border p-3 text-sm",
							attendanceMarked ?
								"bg-green-50 border-green-200 text-green-700"
							:	"bg-blue-50 border-blue-200 text-blue-700",
						)}
					>
						<p>
							<span className="font-semibold">Matched:</span>{" "}
							{matchResult.studentName}
						</p>
						<p>
							<span className="font-semibold">Confidence:</span>{" "}
							{matchResult.confidence}% (distance:{" "}
							{matchResult.distance.toFixed(3)})
						</p>
						{attendanceMarked ?
							<p className="text-xs text-green-600 mt-1 font-medium">
								Attendance has been automatically recorded.
							</p>
						: markingAttendance ?
							<p className="text-xs text-blue-600 mt-1">
								Auto-submitting attendance...
							</p>
						:	<p className="text-xs text-blue-600 mt-1">
								Click &quot;Mark Present&quot; if auto-submit didn&apos;t
								trigger.
							</p>
						}
					</div>
				)}

				{/* Tips — shown in idle and no-photo states */}
				{(phase === "idle" || phase === "no-photo") && (
					<div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
						<p className="font-medium text-sm">How face recognition works:</p>
						<ul className="list-disc list-inside space-y-0.5">
							<li>
								Ensure you have a clear, well-lit profile photo in your Clerk
								account
							</li>
							<li>Allow camera access when prompted by your browser</li>
							<li>
								Face the camera directly — the system will match your live face
								with your profile photo
							</li>
							<li>
								Once matched (&ge;60% confidence), click &quot;Mark
								Present&quot;
							</li>
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
