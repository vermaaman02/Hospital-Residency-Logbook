/**
 * <Badge /> — Pill-shaped status indicator.
 *
 *  - `tone="signed" | "submitted" | "draft" | "rejected" | "needsRevision"`
 *    map directly to your `EntryStatus` enum and Mobile-app-roadmap
 *    (§EntryStatus). Used in inbox & detail screens.
 *  - `tone="info" | "success" | "warning" | "danger"` for generic UI.
 *  - 2px chunky border + soft-tinted background — consistent with the
 *    "sticker" feel.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/lib/theme";
import { Text } from "./Text";

type Tone =
	| "neutral"
	| "info"
	| "success"
	| "warning"
	| "danger"
	| "accent"
	| "signed"
	| "submitted"
	| "draft"
	| "rejected"
	| "needsRevision";

type Props = {
	label: string;
	tone?: Tone;
	icon?: React.ReactNode;
	style?: ViewStyle;
};

const TONE: Record<Tone, { bg: string; fg: string; border: string }> = {
	neutral: { bg: Colors.surfaceMuted, fg: Colors.foreground, border: Colors.borderStrong },
	info: { bg: Colors.infoSoft, fg: Colors.infoForeground, border: Colors.info },
	success: { bg: Colors.successSoft, fg: Colors.successForeground, border: Colors.success },
	warning: { bg: Colors.warningSoft, fg: Colors.warningForeground, border: Colors.warning },
	danger: { bg: Colors.dangerSoft, fg: Colors.dangerForeground, border: Colors.danger },
	accent: { bg: Colors.accentSoft, fg: Colors.accent, border: Colors.accent },
	// EntryStatus mapping (Mobile-app-roadmap §4)
	signed: { bg: Colors.successSoft, fg: Colors.successForeground, border: Colors.signed },
	submitted: { bg: Colors.infoSoft, fg: Colors.infoForeground, border: Colors.submitted },
	draft: { bg: Colors.surfaceMuted, fg: Colors.muted, border: Colors.draft },
	rejected: { bg: Colors.dangerSoft, fg: Colors.dangerForeground, border: Colors.rejected },
	needsRevision: { bg: Colors.warningSoft, fg: Colors.warningForeground, border: Colors.needsRevision },
};

export function Badge({ label, tone = "neutral", icon, style }: Props) {
	const t = TONE[tone];
	return (
		<View
			style={[
				styles.base,
				{ backgroundColor: t.bg, borderColor: t.border },
				style,
			]}
		>
			{icon}
			<Text variant="label" color={t.fg} style={styles.label}>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing["1"],
		alignSelf: "flex-start",
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["1"],
		borderRadius: Radius.pill,
		borderWidth: 1.5,
	},
	label: {
		letterSpacing: 0.8,
	},
});
