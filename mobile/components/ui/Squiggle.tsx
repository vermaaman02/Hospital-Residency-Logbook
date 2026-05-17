/**
 * <Squiggle /> — Hand-drawn wavy divider from Design.md §Textures.
 *
 *  - Used under section headings or as visual breaks between content.
 *  - Configurable color, width, height, and number of waves.
 */

import React, { useMemo } from "react";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/lib/theme";

type Props = {
	color?: string;
	width?: number | string;
	height?: number;
	waves?: number;
	strokeWidth?: number;
};

export function Squiggle({
	color = Colors.accent,
	width = 120,
	height = 12,
	waves = 4,
	strokeWidth = 2.5,
}: Props) {
	const d = useMemo(() => {
		// Build a smooth wavy path
		const w = typeof width === "number" ? width : 120;
		const step = w / waves;
		const h = height;
		let path = `M0 ${h / 2}`;
		for (let i = 0; i < waves; i++) {
			const x1 = step * i + step / 2;
			const y1 = i % 2 === 0 ? 0 : h;
			const x2 = step * (i + 1);
			const y2 = h / 2;
			path += ` Q${x1} ${y1} ${x2} ${y2}`;
		}
		return path;
	}, [width, height, waves]);

	return (
		<Svg width={width} height={height}>
			<Path
				d={d}
				stroke={color}
				strokeWidth={strokeWidth}
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</Svg>
	);
}
