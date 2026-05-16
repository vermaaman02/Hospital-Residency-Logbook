/**
 * Profile screen — shows user info and sign-out button.
 * PATCH /api/v1/me/profile for name updates (Phase 5).
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/hooks/useMe";
import { setAuthToken } from "@/lib/api/client";
import { disconnectSocket } from "@/lib/realtime/socket";

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const qc = useQueryClient();
	const { data: me, isLoading } = useMe();

	async function handleSignOut() {
		Alert.alert("Sign out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: async () => {
					disconnectSocket();
					setAuthToken(null);
					qc.clear();
					await signOut();
				},
			},
		]);
	}

	if (isLoading) {
		return (
			<SafeAreaView style={styles.safe}>
				<ActivityIndicator color="#3b82f6" style={{ marginTop: 60 }} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Profile</Text>

				<View style={styles.card}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{(me?.firstName?.[0] ?? "?").toUpperCase()}
						</Text>
					</View>
					<Text style={styles.name}>
						{[me?.firstName, me?.lastName].filter(Boolean).join(" ") || "—"}
					</Text>
					<Text style={styles.email}>{me?.email ?? "—"}</Text>
				</View>

				<View style={styles.infoCard}>
					<InfoRow label="Role" value={me?.role ?? "—"} />
					<InfoRow label="Batch" value={me?.batch ?? "—"} />
					<InfoRow label="Semester" value={me?.currentSemester?.toString() ?? "—"} />
					<InfoRow label="Department" value={me?.department ?? "—"} />
				</View>

				<TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
					<Text style={styles.signOutText}>Sign out</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.infoRow}>
			<Text style={styles.infoLabel}>{label}</Text>
			<Text style={styles.infoValue}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	container: { flex: 1, padding: 20, gap: 14 },
	title: { fontSize: 22, fontWeight: "700", color: "#f1f5f9" },
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 14,
		padding: 24,
		alignItems: "center",
		gap: 8,
	},
	avatar: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "#3b82f6",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 4,
	},
	avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
	name: { fontSize: 18, fontWeight: "600", color: "#f1f5f9" },
	email: { fontSize: 13, color: "#64748b" },
	infoCard: {
		backgroundColor: "#1e293b",
		borderRadius: 14,
		padding: 16,
		gap: 4,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#0f172a",
	},
	infoLabel: { fontSize: 13, color: "#64748b" },
	infoValue: { fontSize: 13, color: "#e2e8f0", fontWeight: "500", textTransform: "capitalize" },
	signOutBtn: {
		backgroundColor: "#7f1d1d",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		marginTop: 8,
	},
	signOutText: { color: "#fca5a5", fontWeight: "600", fontSize: 15 },
});
