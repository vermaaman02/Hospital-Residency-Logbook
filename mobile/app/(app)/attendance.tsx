/**
 * Attendance screen — Phase 4 will build this out fully.
 * Stub shows current week summary and a placeholder CTA.
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttendanceScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Attendance</Text>
				<Text style={styles.sub}>
					Camera + GPS attendance marking coming in Phase 4.
				</Text>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>This feature is coming soon</Text>
					<Text style={styles.cardBody}>
						You can mark attendance on the web app in the meantime.
					</Text>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	container: { flex: 1, padding: 20, gap: 12 },
	title: { fontSize: 22, fontWeight: "700", color: "#f1f5f9" },
	sub: { fontSize: 13, color: "#64748b" },
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 14,
		padding: 20,
		marginTop: 12,
		gap: 8,
	},
	cardTitle: { fontSize: 16, fontWeight: "600", color: "#e2e8f0" },
	cardBody: { fontSize: 13, color: "#94a3b8", lineHeight: 20 },
});
