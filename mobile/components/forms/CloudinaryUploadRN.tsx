/**
 * Image upload component backed by POST /api/v1/cloudinary-sign.
 * Lets the user pick images from the gallery or camera,
 * gets a signed upload URL from the backend, then uploads directly to Cloudinary.
 */

import { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Image,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/lib/api/client";

interface UploadResult {
	url: string;
	publicId: string;
}

interface Props {
	value: string[];
	onChange: (urls: string[]) => void;
	folder?: string;
	maxImages?: number;
	label?: string;
}

async function signAndUpload(uri: string, folder?: string): Promise<string> {
	const signRes = await apiClient.post<{
		ok: boolean;
		data: { signature: string; timestamp: number; cloudName: string; apiKey: string; folder?: string };
	}>("/api/v1/cloudinary-sign", { folder });

	if (!signRes.data.ok || !signRes.data.data) throw new Error("Failed to get upload signature");

	const { signature, timestamp, cloudName, apiKey, folder: signedFolder } = signRes.data.data;

	const formData = new FormData();
	const fileName = uri.split("/").pop() ?? "upload.jpg";
	formData.append("file", { uri, name: fileName, type: "image/jpeg" } as never);
	formData.append("api_key", apiKey);
	formData.append("timestamp", String(timestamp));
	formData.append("signature", signature);
	if (signedFolder) formData.append("folder", signedFolder);

	const uploadRes = await fetch(
		`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
		{ method: "POST", body: formData },
	);
	const data = (await uploadRes.json()) as UploadResult & { error?: { message: string } };
	if (data.error) throw new Error(data.error.message);
	return data.url;
}

export function CloudinaryUploadRN({
	value,
	onChange,
	folder,
	maxImages = 5,
	label = "Images",
}: Props) {
	const [uploading, setUploading] = useState(false);

	async function pick(source: "camera" | "gallery") {
		if (value.length >= maxImages) {
			Alert.alert("Limit reached", `You can upload up to ${maxImages} images.`);
			return;
		}

		const result =
			source === "camera"
				? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
				: await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: false });

		if (result.canceled) return;
		const uri = result.assets[0].uri;

		setUploading(true);
		try {
			const url = await signAndUpload(uri, folder);
			onChange([...value, url]);
		} catch (err) {
			Alert.alert("Upload failed", err instanceof Error ? err.message : "Unknown error");
		} finally {
			setUploading(false);
		}
	}

	function remove(url: string) {
		onChange(value.filter((u) => u !== url));
	}

	return (
		<View style={styles.wrapper}>
			<Text style={styles.label}>{label}</Text>

			{value.length > 0 && (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.preview}>
					{value.map((url) => (
						<View key={url} style={styles.thumb}>
							<Image source={{ uri: url }} style={styles.thumbImg} />
							<TouchableOpacity style={styles.removeBtn} onPress={() => remove(url)}>
								<Text style={styles.removeText}>✕</Text>
							</TouchableOpacity>
						</View>
					))}
				</ScrollView>
			)}

			{value.length < maxImages && (
				<View style={styles.actions}>
					<TouchableOpacity
						style={styles.btn}
						onPress={() => pick("camera")}
						disabled={uploading}
					>
						{uploading ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<Text style={styles.btnText}>📷 Camera</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.btn}
						onPress={() => pick("gallery")}
						disabled={uploading}
					>
						<Text style={styles.btnText}>🖼 Gallery</Text>
					</TouchableOpacity>
				</View>
			)}

			<Text style={styles.hint}>{value.length}/{maxImages} images</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { gap: 8 },
	label: { fontSize: 13, fontWeight: "500", color: "#94a3b8" },
	preview: { flexGrow: 0 },
	thumb: { marginRight: 8, position: "relative" },
	thumbImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#1e293b" },
	removeBtn: {
		position: "absolute",
		top: -6,
		right: -6,
		backgroundColor: "#7f1d1d",
		borderRadius: 10,
		width: 20,
		height: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	removeText: { color: "#fca5a5", fontSize: 10, fontWeight: "700" },
	actions: { flexDirection: "row", gap: 10 },
	btn: {
		flex: 1,
		backgroundColor: "#1e293b",
		borderRadius: 10,
		padding: 12,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#334155",
	},
	btnText: { color: "#94a3b8", fontSize: 13, fontWeight: "500" },
	hint: { fontSize: 11, color: "#334155" },
});
