/**
 * <Screen /> — Standard screen wrapper.
 *
 *  - Applies the warm cream background from Design.md (#FFFDF5).
 *  - Honors safe-area insets (top + bottom).
 *  - Optional <DotGrid /> background decoration (`pattern="dots"`).
 *  - Uses `ScrollView` when `scroll` is true.
 */

import React from "react";
import {
	ScrollView,
	StyleSheet,
	View,
	ViewStyle,
	ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Layout } from "@/lib/theme";
import { DotGrid } from "./DotGrid";

type Props = {
	children: React.ReactNode;
	scroll?: boolean;
	pattern?: "none" | "dots";
	/** Removes default horizontal padding (use when child is full-bleed) */
	bleed?: boolean;
	style?: ViewStyle;
	contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
	edges?: ("top" | "bottom" | "left" | "right")[];
};

export function Screen({
	children,
	scroll = false,
	pattern = "none",
	bleed = false,
	style,
	contentContainerStyle,
	edges = ["top", "bottom"],
}: Props) {
	const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
		if (scroll) {
			return (
				<ScrollView
					style={styles.flex}
					contentContainerStyle={[
						bleed ? undefined : styles.padded,
						contentContainerStyle,
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{children}
				</ScrollView>
			);
		}
		return (
			<View style={[styles.flex, bleed ? undefined : styles.padded]}>
				{children}
			</View>
		);
	};

	return (
		<SafeAreaView
			edges={edges}
			style={[styles.safe, style]}
		>
			{pattern === "dots" && <DotGrid />}
			<Container>{children}</Container>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	flex: { flex: 1 },
	padded: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Layout.sectionGap,
	},
});
