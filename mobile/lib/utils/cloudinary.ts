import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/lib/api/client";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "dl8ls89qe";
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || "117591588143369";
const API_SECRET = "qwkmzbz6gQJytokH9MfQy0YqkMc";

// ────────────────────────────────────────────────────────────
// Pure-JS SHA1 (RFC 3174) — no native module required.
// Used only for on-device Cloudinary signed upload fallback.
// ────────────────────────────────────────────────────────────

function sha1(input: string): string {
	function rotl(n: number, s: number) {
		return ((n << s) | (n >>> (32 - s))) >>> 0;
	}
	function toHex(n: number) {
		return ("0000000" + n.toString(16)).slice(-8);
	}

	const msg: number[] = [];
	for (let i = 0; i < input.length; i++) {
		const c = input.charCodeAt(i);
		if (c < 128) {
			msg.push(c);
		} else if (c < 2048) {
			msg.push((c >> 6) | 192, (c & 63) | 128);
		} else {
			msg.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
		}
	}
	const len = msg.length * 8;
	msg.push(0x80);
	while (msg.length % 64 !== 56) msg.push(0);
	msg.push(0, 0, 0, 0, (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);

	let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;

	for (let i = 0; i < msg.length; i += 64) {
		const w: number[] = [];
		for (let j = 0; j < 16; j++) {
			w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3];
		}
		for (let j = 16; j < 80; j++) {
			w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
		}
		let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
		for (let j = 0; j < 80; j++) {
			let f, k;
			if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
			else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
			else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
			else { f = b ^ c ^ d; k = 0xca62c1d6; }
			const temp = (rotl(a, 5) + f + e + k + w[j]) >>> 0;
			e = d; d = c; c = rotl(b, 30); b = a; a = temp;
		}
		h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
		h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
	}
	return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

function generateOnDeviceSignature(folder: string): { signature: string; timestamp: number } {
	const timestamp = Math.round(Date.now() / 1000);
	const stringToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
	return { signature: sha1(stringToSign), timestamp };
}

// ────────────────────────────────────────────────────────────

/**
 * Uploads a local file URI (from Expo ImagePicker) to Cloudinary.
 * Tries backend-signed upload first; falls back to on-device signing.
 */
export async function uploadUriToCloudinary(
	uri: string,
	folder = "logbook"
): Promise<string> {
	const filename = uri.split("/").pop() || `upload_${Date.now()}.jpg`;
	const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
	const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

	let cloudName = CLOUD_NAME;
	let apiKey = API_KEY;
	let signature = "";
	let timestamp = 0;

	// 1. Try backend-signed upload
	try {
		const signRes = await apiClient.post("/api/v1/cloudinary-sign", { folder });
		if (signRes?.data?.signature) {
			signature = signRes.data.signature;
			timestamp = signRes.data.timestamp;
			apiKey = signRes.data.apiKey || apiKey;
			cloudName = signRes.data.cloudName || cloudName;
		}
	} catch {
		console.log("[Cloudinary] Backend sign failed — using on-device SHA1 signing");
	}

	// 2. On-device fallback using pure-JS SHA1
	if (!signature) {
		const onDevice = generateOnDeviceSignature(folder);
		signature = onDevice.signature;
		timestamp = onDevice.timestamp;
	}

	const formData = new FormData();
	formData.append("file", { uri, name: filename, type: mimeType } as any);
	formData.append("api_key", apiKey);
	formData.append("timestamp", timestamp.toString());
	formData.append("signature", signature);
	formData.append("folder", folder);

	const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
	const response = await fetch(uploadUrl, { method: "POST", body: formData });
	const data = await response.json();

	if (data.secure_url) return data.secure_url;
	throw new Error(data.error?.message || "Cloudinary upload failed.");
}

/**
 * Opens image gallery picker and uploads selected photo to Cloudinary.
 */
export async function pickAndUploadImageToCloudinary(
	folder = "logbook"
): Promise<string | null> {
	const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!granted) {
		Alert.alert("Permission Denied", "Gallery access is required to upload photos.");
		return null;
	}

	const result = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: "images" as any,
		allowsEditing: false,
		quality: 0.8,
	});

	if (result.canceled || !result.assets?.[0]?.uri) return null;
	return uploadUriToCloudinary(result.assets[0].uri, folder);
}

/**
 * Opens camera, captures a photo, and uploads it to Cloudinary.
 */
export async function captureAndUploadImageToCloudinary(
	folder = "logbook"
): Promise<string | null> {
	const { granted } = await ImagePicker.requestCameraPermissionsAsync();
	if (!granted) {
		Alert.alert("Permission Denied", "Camera permission is required to capture photos.");
		return null;
	}

	const result = await ImagePicker.launchCameraAsync({
		allowsEditing: false,
		quality: 0.8,
	});

	if (result.canceled || !result.assets?.[0]?.uri) return null;
	return uploadUriToCloudinary(result.assets[0].uri, folder);
}
