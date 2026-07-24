/**
 * <Card /> — "Sticker Card" from Design.md §Cards.
 *
 *  - 2px slate-800 border
 *  - Soft hard shadow (sticker) by default; colored shadow for featured
 *  - rounded-xl (Radius.lg = 16)
 *  - Optional floating icon bubble that sits half-in / half-out of the top
 *
 *   <Card>
 *     <Heading level={3}>Case 12</Heading>
 *     <Text variant="muted">{date}</Text>
 *   </Card>
 *
 *   <Card variant="featured-pink">
 *     ...
 *   </Card>
 */

import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radius, Spacing, HardShadow as ShadowTokens } from "@/lib/theme";

type Variant =
	| "default"
	| "featured-pink"
	| "featured-amber"
	| "featured-mint"
	| "featured-violet"
	| "flat"; // no shadow — used inside lists

type Props = {
	children: React.ReactNode;
	variant?: Variant;
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
	/** Override interior padding */
	padding?: number;
};

export function Card({
	children,
	variant = "default",
	onPress,
	style,
	padding = Spacing["5"],
}: Props) {
	const shadow = SHADOW_FOR[variant];
	const Container = onPress ? Pressable : View;

	return (
		<View style={styles.wrap}>
			{shadow && (
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							transform: [
								{ translateX: shadow.offsetX },
								{ translateY: shadow.offsetY },
							],
							backgroundColor: shadow.color,
							borderRadius: Radius.lg,
						},
					]}
				/>
			)}
			<Container
				onPress={onPress}
				style={[
					styles.card,
					{ padding, borderColor: Colors.borderStrong },
					style,
				]}
				android_ripple={onPress ? { color: Colors.accentSoft } : undefined}
			>
				{children}
			</Container>
		</View>
	);
}

const SHADOW_FOR: Record<Variant, (typeof ShadowTokens)[keyof typeof ShadowTokens] | null> = {
	default: ShadowTokens.sticker,
	"featured-pink": ShadowTokens.pink,
	"featured-amber": ShadowTokens.amber,
	"featured-mint": ShadowTokens.mint,
	"featured-violet": ShadowTokens.violet,
	flat: null,
};

const styles = StyleSheet.create({
	wrap: {},
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 2,
		overflow: "hidden",
	},
});
