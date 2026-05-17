/**
 * <IconBubble /> — Lucide icon inside a colored circle.
 *
 * From Design.md §Iconography: "Icons enclosed in shapes. Never floating
 * alone. A 'Check' icon isn't just a check; it's a check inside a green
 * circle."
 *
 *   <IconBubble icon={<Stethoscope />} tone="accent" />
 *   <IconBubble icon={<Check />} tone="success" size={32} />
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/lib/theme";

type Tone =
	| "accent"
	| "pink"
	| "amber"
	| "mint"
	| "sky"
	| "neutral"
	| "success"
	| "warning"
	| "danger";

type Props = {
	icon: React.ReactNode;
	tone?: Tone;
	size?: number;
	bordered?: boolean;
	style?: ViewStyle;
};

const TONE: Record<Tone, string> = {
	accent: Colors.accent,
	pink: Colors.pink,
	amber: Colors.amber,
	mint: Colors.mint,
	sky: Colors.sky,
	neutral: Colors.surfaceMuted,
	success: Colors.success,
	warning: Colors.warning,
	danger: Colors.danger,
};

export function IconBubble({
	icon,
	tone = "accent",
	size = 44,
	bordered = true,
	style,
}: Props) {
	return (
		<View
			style={[
				styles.bubble,
				{
					width: size,
					height: size,
					backgroundColor: TONE[tone],
					borderRadius: Radius.pill,
					borderColor: bordered ? Colors.borderStrong : "transparent",
					borderWidth: bordered ? 2 : 0,
				},
				style,
			]}
		>
			{icon}
		</View>
	);
}

const styles = StyleSheet.create({
	bubble: {
		alignItems: "center",
		justifyContent: "center",
	},
});
