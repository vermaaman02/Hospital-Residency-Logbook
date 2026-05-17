/**
 * Logbook tab — placeholder for Phase 3 (18 entry types).
 * Shows the list of available logbook modules.
 */

import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Font, Spacing, Radius } from "@/lib/theme";

const MODULES = [
	{ key: "case-presentations", label: "Case Presentations", emoji: "📑" },
	{ key: "seminars", label: "Seminar / EBM Discussions", emoji: "🎓" },
	{ key: "journal-clubs", label: "Journal Clubs", emoji: "📰" },
	{ key: "clinical-skills-adult", label: "Clinical Skills (Adult)", emoji: "🩺" },
	{ key: "clinical-skills-pediatric", label: "Clinical Skills (Pediatric)", emoji: "👶" },
	{ key: "case-management", label: "Case Management", emoji: "🗂️" },
	{ key: "procedures", label: "Procedure Logs", emoji: "💉" },
	{ key: "diagnostics", label: "Diagnostic Skills", emoji: "🔬" },
	{ key: "imaging", label: "Imaging Logs", emoji: "📷" },
	{ key: "transport", label: "Transport Logs", emoji: "🚑" },
	{ key: "consent-bad-news", label: "Consent & Bad News", emoji: "📝" },
	{ key: "life-support", label: "Life-Support Courses", emoji: "❤️" },
	{ key: "conferences", label: "Conferences", emoji: "🏛️" },
	{ key: "research", label: "Research Activities", emoji: "🔎" },
	{ key: "disaster-drills", label: "Disaster Drills", emoji: "🚨" },
	{ key: "quality-improvement", label: "Quality Improvement", emoji: "📈" },
	{ key: "logbook-reviews", label: "Logbook Reviews", emoji: "✅" },
	{ key: "rotation-postings", label: "Rotation Postings", emoji: "🔄" },
];

export default function LogbookScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.scroll}>
				<Text style={styles.title}>Logbook</Text>
				<Text style={styles.subtitle}>
					18 entry modules • Coming in Phase 3
				</Text>

				{MODULES.map((mod) => (
					<Pressable
						key={mod.key}
						style={({ pressed }) => [
							styles.moduleCard,
							pressed && { opacity: 0.8 },
						]}
					>
						<Text style={styles.moduleEmoji}>{mod.emoji}</Text>
						<Text style={styles.moduleLabel}>{mod.label}</Text>
						<Text style={styles.moduleArrow}>→</Text>
					</Pressable>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.bg },
	scroll: { padding: Spacing.xl, gap: Spacing.md },
	title: {
		fontSize: Font.size.xxl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	subtitle: {
		fontSize: Font.size.sm,
		color: Colors.textMuted,
		marginBottom: Spacing.sm,
	},
	moduleCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	moduleEmoji: { fontSize: 24, width: 32, textAlign: "center" },
	moduleLabel: {
		flex: 1,
		fontSize: Font.size.md,
		fontWeight: Font.weight.medium,
		color: Colors.textPrimary,
	},
	moduleArrow: {
		fontSize: Font.size.lg,
		color: Colors.textMuted,
	},
});
