/**
 * Home / Dashboard screen.
 * Shows per-module entry counters fetched from GET /api/v1/dashboard.
 */

import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useMe } from "@/lib/hooks/useMe";

export default function HomeScreen() {
	const { data: me } = useMe();
	const { data, isLoading, refetch, isRefetching } = useDashboard();

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />
				}
			>
				<Text style={styles.greeting}>
					Hello, {me?.firstName ?? "Resident"} 👋
				</Text>
				<Text style={styles.sub}>Your logbook summary</Text>

				{isLoading ? (
					<ActivityIndicator color="#3b82f6" style={{ marginTop: 32 }} />
				) : (
					data?.modules?.map((mod) => (
						<View key={mod.module} style={styles.card}>
							<Text style={styles.cardTitle}>{mod.module}</Text>
							<View style={styles.statsRow}>
								<Stat label="Total" value={mod.total} />
								<Stat label="Signed" value={mod.signed} color="#34d399" />
								<Stat label="Pending" value={mod.submitted} color="#fbbf24" />
								<Stat label="Draft" value={mod.draft} color="#94a3b8" />
							</View>
						</View>
					))
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function Stat({ label, value, color = "#f1f5f9" }: { label: string; value: number; color?: string }) {
	return (
		<View style={styles.stat}>
			<Text style={[styles.statValue, { color }]}>{value}</Text>
			<Text style={styles.statLabel}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	scroll: { padding: 20, gap: 12 },
	greeting: { fontSize: 22, fontWeight: "700", color: "#f1f5f9" },
	sub: { fontSize: 13, color: "#64748b", marginBottom: 8 },
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 14,
		padding: 16,
		gap: 12,
	},
	cardTitle: { fontSize: 15, fontWeight: "600", color: "#e2e8f0" },
	statsRow: { flexDirection: "row", justifyContent: "space-between" },
	stat: { alignItems: "center", gap: 4 },
	statValue: { fontSize: 20, fontWeight: "700" },
	statLabel: { fontSize: 11, color: "#64748b" },
});
