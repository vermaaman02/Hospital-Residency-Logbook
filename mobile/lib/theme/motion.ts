/**
 * Motion helpers — bouncy "pop-in", wiggle, and reduced-motion respect.
 *
 * Built on top of `Animated` (we ship Reanimated separately if needed).
 * Respects `prefers-reduced-motion` via AccessibilityInfo.
 */

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { Motion } from "./tokens";

/** Returns true if the OS has reduce-motion enabled. */
export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		let mounted = true;
		AccessibilityInfo.isReduceMotionEnabled().then((v) => {
			if (mounted) setReduced(!!v);
		});
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) =>
			setReduced(!!v),
		);
		return () => {
			mounted = false;
			sub.remove();
		};
	}, []);

	return reduced;
}

/**
 * Pop-in animation: scale 0 → 1 with overshoot.
 *
 *   const { style } = usePopIn();
 *   return <Animated.View style={style}>...</Animated.View>;
 */
export function usePopIn(delay = 0, enabled = true) {
	const scale = useRef(new Animated.Value(0)).current;
	const reduced = useReducedMotion();

	useEffect(() => {
		if (!enabled || reduced) {
			scale.setValue(1);
			return;
		}
		Animated.timing(scale, {
			toValue: 1,
			delay,
			duration: Motion.duration.base,
			easing: Easing.bezier(...Motion.easing.overshoot),
			useNativeDriver: true,
		}).start();
	}, [scale, delay, enabled, reduced]);

	return {
		style: { transform: [{ scale }] },
	};
}

/**
 * Wiggle: rotate keyframes (0 → 3 → -3 → 0) — used on icon focus.
 */
export function useWiggle() {
	const rotate = useRef(new Animated.Value(0)).current;
	const reduced = useReducedMotion();

	const start = () => {
		if (reduced) return;
		Animated.sequence([
			Animated.timing(rotate, {
				toValue: 1,
				duration: 90,
				useNativeDriver: true,
			}),
			Animated.timing(rotate, {
				toValue: -1,
				duration: 90,
				useNativeDriver: true,
			}),
			Animated.timing(rotate, {
				toValue: 0,
				duration: 90,
				useNativeDriver: true,
			}),
		]).start();
	};

	const interpolated = rotate.interpolate({
		inputRange: [-1, 0, 1],
		outputRange: ["-3deg", "0deg", "3deg"],
	});

	return {
		start,
		style: { transform: [{ rotate: interpolated }] },
	};
}
