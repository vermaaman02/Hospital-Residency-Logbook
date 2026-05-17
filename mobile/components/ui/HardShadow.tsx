/**
 * <HardShadow /> — The signature "Pop" shadow from Design.md.
 *
 * React Native's native `shadowOffset` always blurs. To get a solid,
 * Memphis-style offset shadow, we render a filled mirror layer underneath
 * the child and translate it by (offsetX, offsetY).
 *
 * Usage:
 *   <HardShadow token="md" radius={Radius.lg}>
 *     <Card>...</Card>
 *   </HardShadow>
 *
 * Accepts a child whose outermost View defines the *visible* shape.
 * The child MUST have a solid background and a borderRadius matching `radius`.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { HardShadow as ShadowTokens, Radius, type HardShadowToken } from "@/lib/theme";

type Props = {
	children: React.ReactNode;
	/** Token from `HardShadow` in tokens (sm/md/lg/xl, or colored variants) */
	token?: HardShadowToken;
	/** Override offset/color manually */
	offsetX?: number;
	offsetY?: number;
	color?: string;
	/** Border radius of the shadow layer — should match the child */
	radius?: number;
	style?: ViewStyle;
};

export function HardShadow({
	children,
	token = "md",
	offsetX,
	offsetY,
	color,
	radius = Radius.lg,
	style,
}: Props) {
	const t = ShadowTokens[token];
	const dx = offsetX ?? t.offsetX;
	const dy = offsetY ?? t.offsetY;
	const bg = color ?? t.color;

	return (
		<View style={[styles.wrap, style]}>
			{/* Solid mirror layer — sits behind the content */}
			<View
				pointerEvents="none"
				style={[
					StyleSheet.absoluteFillObject,
					{
						transform: [{ translateX: dx }, { translateY: dy }],
						backgroundColor: bg,
						borderRadius: radius,
					},
				]}
			/>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		// Container is positionally neutral — children control their own size.
	},
});
