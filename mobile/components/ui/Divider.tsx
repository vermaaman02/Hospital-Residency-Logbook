/**
 * <Divider /> — Horizontal or vertical 2px slate divider.
 * Mobile rule (Design.md §Responsive): horizontal squiggle lines become
 * vertical dividers on smaller widths. Use this primitive for both.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/lib/theme";

type Props = {
	orientation?: "horizontal" | "vertical";
	color?: string;
	thickness?: number;
	length?: number | string;
	style?: ViewStyle;
};

export function Divider({
	orientation = "horizontal",
	color = Colors.border,
	thickness = 2,
	length = "100%",
	style,
}: Props) {
	const isH = orientation === "horizontal";
	return (
		<View
			style={[
				{
					backgroundColor: color,
					width: isH ? (length as any) : thickness,
					height: isH ? thickness : (length as any),
					borderRadius: thickness,
				},
				style,
			]}
		/>
	);
}

const styles = StyleSheet.create({});
