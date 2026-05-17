/**
 * <Heading /> — Outfit-based headings (h1–h4 + display).
 *
 *   <Heading level={1}>Logbook</Heading>
 *   <Heading level={3} accent>Featured</Heading>  // colored
 */

import React from "react";
import { Text as RNText, TextProps } from "react-native";
import { Typography, Colors } from "@/lib/theme";

type Level = 1 | 2 | 3 | 4 | "display";

type Props = TextProps & {
	level?: Level;
	color?: string;
	/** Apply the violet accent color */
	accent?: boolean;
};

const variantFor: Record<Level, keyof typeof Typography> = {
	display: "display",
	1: "h1",
	2: "h2",
	3: "h3",
	4: "h4",
};

export function Heading({
	level = 2,
	color,
	accent,
	style,
	children,
	...rest
}: Props) {
	const variant = variantFor[level];
	return (
		<RNText
			{...rest}
			style={[
				Typography[variant],
				accent ? { color: Colors.accent } : color ? { color } : undefined,
				style,
			]}
		>
			{children}
		</RNText>
	);
}
