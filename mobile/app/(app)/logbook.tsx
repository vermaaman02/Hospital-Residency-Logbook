/**
 * Logbook screen — entry point for all 18 logbook modules.
 * Phase 3 will replace this with the full module list + navigation.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getAllModules } from "@/lib/modules/index";

export default function LogbookScreen() {
	const router = useRouter();

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.scroll}>
				<Text style={styles.title}>Logbook</Text>
				<Text style={styles.sub}>Select a module to view or add entries</Text>
				{getAllModules().map((mod) => (
					<TouchableOpacity
						key={mod.slug}
						style={styles.row}
						onPress={() => router.push(`/(app)/entries/${mod.slug}` as never)}
					>
						<Text style={styles.rowLabel}>{mod.label}</Text>
						<Text style={styles.arrow}>›</Text>
					</TouchableOpacity>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	scroll: { padding: 20, gap: 8 },
	title: { fontSize: 22, fontWeight: "700", color: "#f1f5f9", marginBottom: 4 },
	sub: { fontSize: 13, color: "#64748b", marginBottom: 12 },
	row: {
		backgroundColor: "#1e293b",
		borderRadius: 12,
		padding: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	rowLabel: { fontSize: 15, color: "#e2e8f0", fontWeight: "500" },
	arrow: { fontSize: 20, color: "#475569" },
});
