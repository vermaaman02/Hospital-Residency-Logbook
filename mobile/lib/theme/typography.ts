/**
 * Typography presets — semantic text styles built from tokens.
 * Use `Heading` / `Text` components instead of raw `<Text>` when possible.
 */

import type { TextStyle } from "react-native";
import {
	Colors,
	FontFamily,
	FontSize,
	LetterSpacing,
	LineHeight,
} from "./tokens";

type Variant = TextStyle;

export const Typography = {
	// Display & headings — Outfit (geometric, friendly)
	display: {
		fontFamily: FontFamily.headingExtra,
		fontSize: FontSize.display,
		lineHeight: FontSize.display * LineHeight.tight,
		color: Colors.foreground,
		letterSpacing: LetterSpacing.tight,
	} satisfies Variant,

	h1: {
		fontFamily: FontFamily.headingExtra,
		fontSize: FontSize["3xl"],
		lineHeight: FontSize["3xl"] * LineHeight.tight,
		color: Colors.foreground,
		letterSpacing: LetterSpacing.tight,
	} satisfies Variant,

	h2: {
		fontFamily: FontFamily.heading,
		fontSize: FontSize["2xl"],
		lineHeight: FontSize["2xl"] * LineHeight.snug,
		color: Colors.foreground,
	} satisfies Variant,

	h3: {
		fontFamily: FontFamily.heading,
		fontSize: FontSize.xl,
		lineHeight: FontSize.xl * LineHeight.snug,
		color: Colors.foreground,
	} satisfies Variant,

	h4: {
		fontFamily: FontFamily.heading,
		fontSize: FontSize.lg,
		lineHeight: FontSize.lg * LineHeight.snug,
		color: Colors.foreground,
	} satisfies Variant,

	// Body — Plus Jakarta Sans
	bodyLg: {
		fontFamily: FontFamily.bodyRegular,
		fontSize: FontSize.md,
		lineHeight: FontSize.md * LineHeight.relaxed,
		color: Colors.foreground,
	} satisfies Variant,

	body: {
		fontFamily: FontFamily.bodyRegular,
		fontSize: FontSize.base,
		lineHeight: FontSize.base * LineHeight.relaxed,
		color: Colors.foreground,
	} satisfies Variant,

	bodySm: {
		fontFamily: FontFamily.bodyRegular,
		fontSize: FontSize.sm,
		lineHeight: FontSize.sm * LineHeight.normal,
		color: Colors.foreground,
	} satisfies Variant,

	bodyStrong: {
		fontFamily: FontFamily.bodyBold,
		fontSize: FontSize.base,
		lineHeight: FontSize.base * LineHeight.relaxed,
		color: Colors.foreground,
	} satisfies Variant,

	muted: {
		fontFamily: FontFamily.bodyRegular,
		fontSize: FontSize.sm,
		lineHeight: FontSize.sm * LineHeight.normal,
		color: Colors.muted,
	} satisfies Variant,

	// Labels — chunky, uppercase, used above inputs (Design.md §Inputs)
	label: {
		fontFamily: FontFamily.bodyBold,
		fontSize: FontSize.xs,
		lineHeight: FontSize.xs * LineHeight.normal,
		color: Colors.foreground,
		textTransform: "uppercase" as const,
		letterSpacing: LetterSpacing.wider,
	} satisfies Variant,

	// Buttons
	button: {
		fontFamily: FontFamily.bodyBold,
		fontSize: FontSize.base,
		lineHeight: FontSize.base * LineHeight.snug,
		color: Colors.inverse,
		letterSpacing: LetterSpacing.wide,
	} satisfies Variant,

	// Mono — IDs, sl. numbers, attendance codes
	mono: {
		fontFamily: FontFamily.mono,
		fontSize: FontSize.sm,
		lineHeight: FontSize.sm * LineHeight.normal,
		color: Colors.foregroundSoft,
	} satisfies Variant,
} as const;

export type TypographyVariant = keyof typeof Typography;
