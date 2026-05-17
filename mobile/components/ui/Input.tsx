/**
 * <Input /> — Themed text input from Design.md §Inputs.
 *
 *  - 2px slate-300 border (slate-800 = focus)
 *  - Hard-color shadow appears on focus (violet by default)
 *  - Uppercase label above input (`label` prop)
 *  - Error message below input (`error` prop) — borders go red
 */

import React, { useState } from "react";
import {
	StyleSheet,
	TextInput,
	TextInputProps,
	View,
	ViewStyle,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/lib/theme";
import { Text } from "./Text";

type Props = TextInputProps & {
	label?: string;
	error?: string;
	hint?: string;
	containerStyle?: ViewStyle;
	/** Color of the focus hard-shadow (defaults to violet) */
	focusShadowColor?: string;
};

export function Input({
	label,
	error,
	hint,
	containerStyle,
	focusShadowColor = Colors.accent,
	style,
	onFocus,
	onBlur,
	...rest
}: Props) {
	const [focused, setFocused] = useState(false);
	const showShadow = focused && !error;
	const borderColor = error
		? Colors.danger
		: focused
			? Colors.borderStrong
			: Colors.inputBorder;
	const shadowColor = error ? Colors.danger : focusShadowColor;

	return (
		<View style={[styles.wrap, containerStyle]}>
			{label && (
				<Text variant="label" style={styles.label}>
					{label}
				</Text>
			)}
			<View style={styles.inputWrap}>
				<TextInput
					{...rest}
					placeholderTextColor={Colors.inputPlaceholder}
					onFocus={(e) => {
						setFocused(true);
						onFocus?.(e);
					}}
					onBlur={(e) => {
						setFocused(false);
						onBlur?.(e);
					}}
					style={[
						styles.input,
						Typography.body,
						{
							backgroundColor: Colors.inputBg,
							borderColor,
						},
						style,
					]}
				/>
			</View>
			{error ? (
				<Text variant="bodySm" color={Colors.danger} style={styles.helper}>
					{error}
				</Text>
			) : hint ? (
				<Text variant="muted" style={styles.helper}>
					{hint}
				</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: Spacing["2"],
	},
	label: {
		marginBottom: Spacing["1"],
	},
	inputWrap: {},
	input: {
		borderWidth: 2,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["4"],
		paddingVertical: Spacing["3"],
		minHeight: 48,
	},
	helper: {
		marginTop: Spacing["1"],
	},
});
