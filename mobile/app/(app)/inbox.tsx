/**
 * Inbox tab — placeholder for Phase 5.
 */

import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Font, Spacing, Radius } from "@/lib/theme";

export default function InboxScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Inbox</Text>
				<View style={styles.card}>
					<Text style={styles.emoji}>📬</Text>
					<Text style={styles.heading}>Coming Soon</Text>
					<Text style={styles.desc}>
						Unified inbox with notifications, sign-off requests, and
						revision alerts will be available in Phase 5.
					</Text>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.bg },
	container: { flex: 1, padding: Spacing.xl, gap: Spacing.lg },
	title: {
		fontSize: Font.size.xxl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	card: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xxxl,
		alignItems: "center",
		gap: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	emoji: { fontSize: 48 },
	heading: {
		fontSize: Font.size.lg,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	desc: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		textAlign: "center",
		lineHeight: 22,
	},
});
