/**
 * <Confetti /> — Decorative primitive shapes scattered behind content.
 *
 * Renders triangles, circles, squares, and plus marks (medical nod) using
 * the design system palette. Absolutely positioned and pointer-events: none.
 *
 *   <View>
 *     <Confetti />
 *     <Heading>Hello</Heading>
 *   </View>
 */

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Polygon, Rect, Path } from "react-native-svg";
import { Colors, ZIndex } from "@/lib/theme";

type Shape = "circle" | "triangle" | "square" | "plus";

type Piece = {
	shape: Shape;
	color: string;
	x: number; // 0-100 (%)
	y: number; // 0-100 (%)
	size: number;
	rotate: number;
};

const PALETTE = [Colors.pink, Colors.amber, Colors.mint, Colors.sky, Colors.accent];

function rand(seed: number) {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

function buildPieces(count: number, seed: number): Piece[] {
	const shapes: Shape[] = ["circle", "triangle", "square", "plus"];
	return Array.from({ length: count }).map((_, i) => {
		const s = seed + i * 7;
		return {
			shape: shapes[Math.floor(rand(s) * shapes.length)],
			color: PALETTE[Math.floor(rand(s + 1) * PALETTE.length)],
			x: rand(s + 2) * 100,
			y: rand(s + 3) * 100,
			size: 8 + rand(s + 4) * 14,
			rotate: rand(s + 5) * 360,
		};
	});
}

export function Confetti({
	count = 12,
	seed = 7,
	opacity = 0.85,
}: {
	count?: number;
	seed?: number;
	opacity?: number;
}) {
	const pieces = useMemo(() => buildPieces(count, seed), [count, seed]);
	return (
		<View pointerEvents="none" style={[styles.fill, { opacity }]}>
			{pieces.map((p, i) => (
				<View
					key={i}
					style={{
						position: "absolute",
						left: `${p.x}%`,
						top: `${p.y}%`,
						transform: [{ rotate: `${p.rotate}deg` }],
					}}
				>
					<Svg width={p.size} height={p.size} viewBox="0 0 24 24">
						{p.shape === "circle" && <Circle cx="12" cy="12" r="10" fill={p.color} />}
						{p.shape === "triangle" && (
							<Polygon points="12,2 22,22 2,22" fill={p.color} />
						)}
						{p.shape === "square" && (
							<Rect x="3" y="3" width="18" height="18" rx="3" fill={p.color} />
						)}
						{p.shape === "plus" && (
							<Path
								d="M10 2h4v8h8v4h-8v8h-4v-8H2v-4h8z"
								fill={p.color}
							/>
						)}
					</Svg>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {
		...StyleSheet.absoluteFillObject,
		zIndex: ZIndex.pattern,
	},
});
