/**
 * Generic entry detail screen.
 * Route: /(app)/entries/[module]/detail?id=<entryId>
 *
 * Shows a read-only summary + revision thread.
 * Submit / Delete actions are available based on current status.
 */

import { useEffect, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { StatusBadge } from "@/components/StatusBadge";
import { RevisionThread } from "@/components/RevisionThread";
import { getModuleConfig } from "@/lib/modules/index";
import type { EntryStatus } from "@logbook/shared/types";

interface EntryDetail {
	id: string;
	status: EntryStatus;
	updatedAt: string;
	[key: string]: unknown;
}

export default function EntryDetailScreen() {
	const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
	const router = useRouter();
	const qc = useQueryClient();
	const config = getModuleConfig(module ?? "");

	const [entry, setEntry] = useState<EntryDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!module || !id) return;
		setLoading(true);
		apiClient
			.get<{ ok: boolean; data: EntryDetail }>(`/api/v1/${config.apiPath}`, {
				params: { id },
			})
			.then((res) => {
				if (res.data.ok && res.data.data) setEntry(res.data.data);
			})
			.finally(() => setLoading(false));
	}, [module, id, config.apiPath]);

	async function handleAction(action: "submit" | "delete") {
		if (!entry) return;
		const label = action === "submit" ? "Submit" : "Delete";
		Alert.alert(`${label} entry?`, `This action cannot be undone.`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: label,
				style: action === "delete" ? "destructive" : "default",
				onPress: async () => {
					setSubmitting(true);
					try {
						await apiClient.post(`/api/v1/${config.apiPath}`, {
							action,
							id: entry.id,
						});
						qc.invalidateQueries({ queryKey: ["entries", module] });
						qc.invalidateQueries({ queryKey: ["dashboard"] });
						router.back();
					} catch (err) {
						Alert.alert("Error", err instanceof Error ? err.message : "Failed");
					} finally {
						setSubmitting(false);
					}
				},
			},
		]);
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<ActivityIndicator color="#3b82f6" style={{ marginTop: 60 }} />
			</SafeAreaView>
		);
	}

	if (!entry) {
		return (
			<SafeAreaView style={styles.safe}>
				<Text style={styles.error}>Entry not found.</Text>
			</SafeAreaView>
		);
	}

	const title = config.getTitle(entry as Record<string, unknown>);
	const canSubmit = entry.status === "DRAFT" || entry.status === "NEEDS_REVISION";
	const canDelete = entry.status === "DRAFT";
	const canEdit = entry.status === "DRAFT" || entry.status === "NEEDS_REVISION";

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.back}>
					<Text style={styles.backText}>‹ Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>{config.label}</Text>
				<View style={{ width: 60 }} />
			</View>

			<ScrollView contentContainerStyle={styles.scroll}>
				<View style={styles.titleRow}>
					<Text style={styles.title}>{title}</Text>
					<StatusBadge status={entry.status} />
				</View>

				<Text style={styles.date}>
					Last updated:{" "}
					{new Date(entry.updatedAt).toLocaleString("en-IN", {
						day: "numeric", month: "short", year: "numeric",
						hour: "2-digit", minute: "2-digit",
					})}
				</Text>

				<View style={styles.divider} />

				<View style={styles.fieldSection}>
					{Object.entries(entry)
						.filter(([k]) => !["id", "status", "updatedAt", "createdAt", "clerkId", "userId", "studentId"].includes(k))
						.map(([key, value]) => {
							if (value === null || value === undefined || value === "") return null;
							if (Array.isArray(value) && value.length === 0) return null;
							const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
							const display = Array.isArray(value) ? value.join(", ") : String(value);
							return (
								<View key={key} style={styles.field}>
									<Text style={styles.fieldLabel}>{label}</Text>
									<Text style={styles.fieldValue}>{display}</Text>
								</View>
							);
						})}
				</View>

				<View style={styles.divider} />
				<RevisionThread entityType={config.apiPath} entityId={entry.id} />

				<View style={styles.actions}>
					{canEdit && (
						<TouchableOpacity
							style={styles.editBtn}
							onPress={() =>
								router.push(`/(app)/entries/${module}/form?id=${entry.id}`)
							}
						>
							<Text style={styles.editBtnText}>Edit</Text>
						</TouchableOpacity>
					)}
					{canSubmit && (
						<TouchableOpacity
							style={[styles.submitBtn, submitting && styles.disabled]}
							onPress={() => handleAction("submit")}
							disabled={submitting}
						>
							{submitting ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.submitBtnText}>Submit for Review</Text>
							)}
						</TouchableOpacity>
					)}
					{canDelete && (
						<TouchableOpacity
							style={styles.deleteBtn}
							onPress={() => handleAction("delete")}
							disabled={submitting}
						>
							<Text style={styles.deleteBtnText}>Delete</Text>
						</TouchableOpacity>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
	},
	back: { width: 60 },
	backText: { color: "#3b82f6", fontSize: 16 },
	headerTitle: { fontSize: 15, fontWeight: "700", color: "#f1f5f9", flex: 1, textAlign: "center" },
	scroll: { padding: 20, paddingBottom: 60, gap: 12 },
	titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
	title: { fontSize: 17, fontWeight: "700", color: "#f1f5f9", flex: 1 },
	date: { fontSize: 12, color: "#475569" },
	divider: { height: 1, backgroundColor: "#1e293b", marginVertical: 4 },
	fieldSection: { gap: 10 },
	field: { gap: 3 },
	fieldLabel: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4 },
	fieldValue: { fontSize: 14, color: "#cbd5e1" },
	actions: { gap: 10, marginTop: 8 },
	editBtn: {
		backgroundColor: "#1e293b",
		borderRadius: 10,
		padding: 14,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#334155",
	},
	editBtnText: { color: "#60a5fa", fontWeight: "600" },
	submitBtn: { backgroundColor: "#1d4ed8", borderRadius: 10, padding: 14, alignItems: "center" },
	submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
	deleteBtn: { backgroundColor: "#450a0a", borderRadius: 10, padding: 14, alignItems: "center" },
	deleteBtnText: { color: "#f87171", fontWeight: "600" },
	disabled: { opacity: 0.5 },
	error: { color: "#f87171", textAlign: "center", padding: 40 },
});
