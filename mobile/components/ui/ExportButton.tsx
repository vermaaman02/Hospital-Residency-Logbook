import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Linking,
	Modal,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import { Download, FileSpreadsheet, FileText, X } from "lucide-react-native";
import { apiClient } from "@/lib/api/client";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { Button } from "./Button";
import { Text } from "./Text";
import { Heading } from "./Heading";
import { Card } from "./Card";
import { HStack } from "./Stack";

interface ExportButtonProps {
	module:
		| "rotation-postings"
		| "case-presentations"
		| "seminars"
		| "journal-clubs"
		| "internal-assessments"
		| "clinical-skills";
	label?: string;
	size?: "sm" | "md" | "lg";
	extraParams?: Record<string, string>;
}

export function ExportButton({ module, label = "Export Form", size = "sm", extraParams }: ExportButtonProps) {
	const [modalVisible, setModalVisible] = useState(false);
	const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

	const triggerDownload = async (format: "pdf" | "excel") => {
		setLoading(format);
		try {
			// 1. Request secure download token
			const { data } = await apiClient.post("/api/v1/export/token", {
				module,
				format,
				...extraParams,
			});

			const token = data.data?.token;
			if (!token) {
				throw new Error("Failed to generate secure download token");
			}

			// 2. Build direct GET export URL
			const baseURL = apiClient.defaults.baseURL || "http://localhost:3000";
			const downloadUrl = `${baseURL}/api/v1/export?token=${token}`;

			// 3. Open in device default system browser
			const supported = await Linking.canOpenURL(downloadUrl);
			if (supported) {
				await Linking.openURL(downloadUrl);
			} else {
				Alert.alert("Error", "Unable to open download link in browser.");
			}
			setModalVisible(false);
		} catch (error: any) {
			console.error("[EXPORT_ERROR]", error);
			Alert.alert(
				"Download Failed",
				error?.response?.data?.message || error?.message || "Something went wrong."
			);
		} finally {
			setLoading(null);
		}
	};

	return (
		<>
			<Button
				label={label}
				variant="secondary"
				size={size}
				leftIcon={<Download size={14} color={Colors.foreground} />}
				onPress={() => setModalVisible(true)}
			/>

			<Modal
				animationType="fade"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => !loading && setModalVisible(false)}
				>
					<Card variant="default" style={styles.modalContent}>
						<HStack justify="space-between" align="center" style={styles.header}>
							<Heading level={3}>Export Documents</Heading>
							<Pressable
								disabled={loading !== null}
								onPress={() => setModalVisible(false)}
								style={styles.closeBtn}
							>
								<X size={20} color={Colors.foreground} />
							</Pressable>
						</HStack>

						<Text variant="muted" style={styles.subtitle}>
							Select a format to download the logbook records for this module.
						</Text>

						<Pressable
							style={styles.optionItem}
							disabled={loading !== null}
							onPress={() => triggerDownload("pdf")}
						>
							<HStack gap="3" align="center" style={styles.optionRow}>
								<View style={[styles.iconContainer, styles.pdfIcon]}>
									<FileText size={20} color="#E74C3C" />
								</View>
								<View style={styles.flex1}>
									<Text variant="bodyStrong">Download as PDF</Text>
									<Text variant="bodySm" color={Colors.muted}>
										High-quality print ready log form
									</Text>
								</View>
								{loading === "pdf" && <ActivityIndicator color={Colors.accent} size="small" />}
							</HStack>
						</Pressable>

						<Pressable
							style={styles.optionItem}
							disabled={loading !== null}
							onPress={() => triggerDownload("excel")}
						>
							<HStack gap="3" align="center" style={styles.optionRow}>
								<View style={[styles.iconContainer, styles.excelIcon]}>
									<FileSpreadsheet size={20} color="#27AE60" />
								</View>
								<View style={styles.flex1}>
									<Text variant="bodyStrong">Download as Excel</Text>
									<Text variant="bodySm" color={Colors.muted}>
										Spreadsheet file for calculations & database entry
									</Text>
								</View>
								{loading === "excel" && <ActivityIndicator color={Colors.accent} size="small" />}
							</HStack>
						</Pressable>
					</Card>
				</Pressable>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing["4"],
	},
	modalContent: {
		width: "100%",
		maxWidth: 340,
		padding: Spacing["3"],
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
	},
	header: {
		marginBottom: Spacing["1"],
	},
	closeBtn: {
		padding: Spacing["1"],
	},
	subtitle: {
		marginBottom: Spacing["3"],
		fontSize: 13,
		lineHeight: 18,
	},
	optionItem: {
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: Spacing["2"],
		overflow: "hidden",
	},
	optionRow: {
		padding: Spacing["3"],
		backgroundColor: Colors.backgroundAlt,
	},
	flex1: {
		flex: 1,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: Radius.sm,
		justifyContent: "center",
		alignItems: "center",
	},
	pdfIcon: {
		backgroundColor: "rgba(231, 76, 60, 0.1)",
	},
	excelIcon: {
		backgroundColor: "rgba(39, 174, 96, 0.1)",
	},
});
