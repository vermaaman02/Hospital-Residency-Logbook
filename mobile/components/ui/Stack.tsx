/**
 * <Stack /> — Layout primitives: VStack, HStack, Spacer.
 *
 * Removes the noise of repeated `flexDirection` + `gap` props from screens.
 */

import React from "react";
import { View, ViewProps, ViewStyle } from "react-native";
import { Spacing, type SpacingToken } from "@/lib/theme";

type StackProps = ViewProps & {
	gap?: SpacingToken;
	align?: ViewStyle["alignItems"];
	justify?: ViewStyle["justifyContent"];
	wrap?: boolean;
	style?: ViewStyle | ViewStyle[];
};

export function VStack({
	gap = "3",
	align,
	justify,
	style,
	children,
	...rest
}: StackProps) {
	return (
		<View
			{...rest}
			style={[
				{
					flexDirection: "column",
					gap: Spacing[gap],
					alignItems: align,
					justifyContent: justify,
				},
				style as ViewStyle,
			]}
		>
			{children}
		</View>
	);
}

export function HStack({
	gap = "3",
	align = "center",
	justify,
	wrap,
	style,
	children,
	...rest
}: StackProps) {
	return (
		<View
			{...rest}
			style={[
				{
					flexDirection: "row",
					gap: Spacing[gap],
					alignItems: align,
					justifyContent: justify,
					flexWrap: wrap ? "wrap" : "nowrap",
				},
				style as ViewStyle,
			]}
		>
			{children}
		</View>
	);
}

export function Spacer({ size = "4" }: { size?: SpacingToken }) {
	return <View style={{ height: Spacing[size], width: Spacing[size] }} />;
}
