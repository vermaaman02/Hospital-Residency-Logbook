import { View, Text, StyleSheet } from "react-native";
import type { EntryStatus } from "@logbook/shared/types";

const CONFIG: Record<EntryStatus, { bg: string; text: string; label: string }> = {
	DRAFT:          { bg: "#1e293b", text: "#94a3b8", label: "Draft" },
	SUBMITTED:      { bg: "#451a03", text: "#fbbf24", label: "Submitted" },
	SIGNED:         { bg: "#052e16", text: "#34d399", label: "Signed" },
	REJECTED:       { bg: "#450a0a", text: "#f87171", label: "Rejected" },
	NEEDS_REVISION: { bg: "#431407", text: "#fb923c", label: "Needs Revision" },
};

interface Props {
	status: EntryStatus;
	size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
	const cfg = CONFIG[status] ?? CONFIG.DRAFT;
	return (
		<View style={[styles.badge, { backgroundColor: cfg.bg }, size === "sm" && styles.sm]}>
			<Text style={[styles.text, { color: cfg.text }, size === "sm" && styles.textSm]}>
				{cfg.label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
		alignSelf: "flex-start",
	},
	sm: { paddingHorizontal: 7, paddingVertical: 2 },
	text: { fontSize: 12, fontWeight: "600" },
	textSm: { fontSize: 10 },
});
