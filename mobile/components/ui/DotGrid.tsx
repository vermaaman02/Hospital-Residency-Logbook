/**
 * <DotGrid /> — Background dot pattern from Design.md §Textures.
 *
 *  - Renders an SVG pattern of small filled circles in a strict grid.
 *  - Absolutely positioned, fills the parent, sits behind content (z=-1).
 *
 *   <Screen pattern="dots"> ... </Screen>
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { Colors, ZIndex } from "@/lib/theme";

type Props = {
	dotColor?: string;
	spacing?: number;
	radius?: number;
	opacity?: number;
};

export function DotGrid({
	dotColor = Colors.patternDot,
	spacing = 18,
	radius = 1.4,
	opacity = 1,
}: Props) {
	return (
		<View pointerEvents="none" style={styles.fill}>
			<Svg width="100%" height="100%" opacity={opacity}>
				<Defs>
					<Pattern
						id="dots"
						x="0"
						y="0"
						width={spacing}
						height={spacing}
						patternUnits="userSpaceOnUse"
					>
						<Circle cx={spacing / 2} cy={spacing / 2} r={radius} fill={dotColor} />
					</Pattern>
				</Defs>
				<Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
			</Svg>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {
		...StyleSheet.absoluteFillObject,
		zIndex: ZIndex.pattern,
	},
});
