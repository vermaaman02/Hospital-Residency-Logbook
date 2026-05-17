/**
 * <Text /> — Themed text with semantic variants.
 *
 * Always prefer this over raw `<Text>` from react-native — it enforces
 * font-family, sizes, and colors from our tokens.
 *
 *   <Text variant="body">Hello</Text>
 *   <Text variant="label">Sl. No</Text>
 *   <Text variant="muted">{date}</Text>
 */

import React from "react";
import { Text as RNText, TextProps } from "react-native";
import { Typography, type TypographyVariant } from "@/lib/theme";

type Props = TextProps & {
	variant?: TypographyVariant;
	color?: string;
};

export function Text({
	variant = "body",
	color,
	style,
	children,
	...rest
}: Props) {
	return (
		<RNText
			{...rest}
			style={[
				Typography[variant],
				color ? { color } : undefined,
				style,
			]}
		>
			{children}
		</RNText>
	);
}
