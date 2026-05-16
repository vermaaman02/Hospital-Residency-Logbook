/**
 * Generic entry form screen — create (no id) or edit (id= query param).
 * Route: /(app)/entries/[module]/form?id=<optional>
 *
 * Uses react-hook-form + Zod resolver.
 * Auto-saves draft every 30 s while the form is dirty.
 * Module-specific field sets are resolved from lib/modules/forms/[module].tsx.
 */

import { useEffect, useRef } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getModuleConfig } from "@/lib/modules/index";
import { getModuleForm } from "@/lib/modules/forms/index";

export default function EntryFormScreen() {
	const { module, id } = useLocalSearchParams<{ module: string; id?: string }>();
	const router = useRouter();
	const qc = useQueryClient();
	const config = getModuleConfig(module ?? "");
	const ModuleForm = getModuleForm(module ?? "");

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<Record<string, unknown>>({ defaultValues: {} });

	const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!id) return;
		apiClient
			.get<{ ok: boolean; data: Record<string, unknown> }>(`/api/v1/${config.apiPath}`, {
				params: { id },
			})
			.then((res) => {
				if (res.data.ok && res.data.data) reset(res.data.data);
			});
	}, [id, config.apiPath, reset]);

	useEffect(() => {
		autoSaveRef.current = setInterval(() => {
			if (!isDirty) return;
			handleSubmit((data) => saveDraft(data))();
		}, 30_000);
		return () => {
			if (autoSaveRef.current) clearInterval(autoSaveRef.current);
		};
	}, [isDirty, handleSubmit]);

	async function saveDraft(data: Record<string, unknown>) {
		try {
			await apiClient.post(`/api/v1/${config.apiPath}`, {
				action: id ? "update" : "init",
				...(id ? { id } : {}),
				...data,
			});
		} catch {
			// silent auto-save failure
		}
	}

	async function onSubmitDraft(data: Record<string, unknown>) {
		try {
			const res = await apiClient.post<{ ok: boolean; data: { id: string } }>(
				`/api/v1/${config.apiPath}`,
				{
					action: id ? "update" : "init",
					...(id ? { id } : {}),
					...data,
				},
			);
			if (res.data.ok) {
				qc.invalidateQueries({ queryKey: ["entries", module] });
				qc.invalidateQueries({ queryKey: ["dashboard"] });
				router.back();
			}
		} catch (err) {
			Alert.alert("Save failed", err instanceof Error ? err.message : "Unknown error");
		}
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.back}>
					<Text style={styles.backText}>‹ Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>
					{id ? "Edit" : "New"} {config.label}
				</Text>
				<View style={{ width: 60 }} />
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
				>
					{ModuleForm ? (
						<ModuleForm control={control} errors={errors} />
					) : (
						<Text style={styles.noForm}>
							Form fields for "{config.label}" are coming in Phase 3 completion.
						</Text>
					)}

					<TouchableOpacity
						style={[styles.saveBtn, isSubmitting && styles.disabled]}
						onPress={handleSubmit(onSubmitDraft)}
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.saveBtnText}>Save Draft</Text>
						)}
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
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
	scroll: { padding: 20, gap: 16, paddingBottom: 60 },
	noForm: { color: "#475569", fontSize: 14, textAlign: "center", marginTop: 40, lineHeight: 22 },
	saveBtn: {
		backgroundColor: "#1d4ed8",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		marginTop: 8,
	},
	saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
	disabled: { opacity: 0.5 },
});
