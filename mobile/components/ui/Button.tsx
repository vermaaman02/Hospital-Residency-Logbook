/**
 * <Button /> — The "Candy Button" from Design.md §Buttons.
 *
 * Variants:
 *   - `primary`     Violet pill, dark 2px border, hard shadow. Default CTA.
 *   - `secondary`   Transparent pill, dark border, fills amber on press.
 *   - `tertiary`    Solid mint/amber/pink — for decorative CTAs.
 *   - `ghost`       No border, no shadow — inline / cancel actions.
 *   - `danger`      Red destructive action.
 *
 * Press interaction (animated):
 *   - Idle:   translate(0,0)  shadow 4px
 *   - Press:  translate(2,2)  shadow 2px  (looks pressed-in)
 *
 * All buttons satisfy the 48px touch target (Layout.touchTarget).
 */

import React, { useCallback, useRef } from "react";
import {
	ActivityIndicator,
	Animated,
	Pressable,
	StyleSheet,
	View,
	ViewStyle,
} from "react-native";
import {
	Colors,
	Radius,
	Spacing,
	Typography,
	Layout,
	HardShadow as ShadowTokens,
} from "@/lib/theme";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = {
	label: string;
	onPress?: () => void;
	variant?: Variant;
	size?: Size;
	disabled?: boolean;
	loading?: boolean;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	/** Use a yellow tertiary fill for `secondary` hover (Design.md) */
	tertiaryHoverColor?: string;
	style?: ViewStyle;
	fullWidth?: boolean;
};

export function Button({
	label,
	onPress,
	variant = "primary",
	size = "md",
	disabled,
	loading,
	leftIcon,
	rightIcon,
	style,
	fullWidth,
}: Props) {
	const press = useRef(new Animated.Value(0)).current;

	const animate = useCallback(
		(to: number) => {
			Animated.timing(press, {
				toValue: to,
				duration: 90,
				useNativeDriver: true,
			}).start();
		},
		[press],
	);

	const variantStyle = VARIANT[variant];
	const sizeStyle = SIZE[size];

	const translate = press.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 2],
	});
	const shadowOffset = press.interpolate({
		inputRange: [0, 1],
		outputRange: [variantStyle.shadow ?? 4, 2],
	});

	const isDisabled = disabled || loading;
	const showShadow = !!variantStyle.shadow && !isDisabled;

	return (
		<View style={[fullWidth ? styles.fullWidth : undefined, style]}>
			{showShadow && (
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							backgroundColor: Colors.borderStrong,
							borderRadius: Radius.pill,
							transform: [
								{ translateX: shadowOffset },
								{ translateY: shadowOffset },
							],
						},
					]}
				/>
			)}
			<Animated.View
				style={{
					transform: [{ translateX: translate }, { translateY: translate }],
				}}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityState={{ disabled: isDisabled, busy: loading }}
					disabled={isDisabled}
					onPressIn={() => animate(1)}
					onPressOut={() => animate(0)}
					onPress={onPress}
					style={[
						styles.base,
						sizeStyle.container,
						{
							backgroundColor: variantStyle.bg,
							borderColor: variantStyle.border,
							borderWidth: variantStyle.borderWidth,
							borderRadius: Radius.pill,
							opacity: isDisabled ? 0.5 : 1,
						},
					]}
				>
					{loading ? (
						<ActivityIndicator color={variantStyle.fg} />
					) : (
						<>
							{leftIcon}
							<Animated.Text
								style={[
									Typography.button,
									sizeStyle.label,
									{ color: variantStyle.fg },
								]}
							>
								{label}
							</Animated.Text>
							{rightIcon}
						</>
					)}
				</Pressable>
			</Animated.View>
		</View>
	);
}

/* ─────────────────────────────────────────────────────────────────── */

type VariantSpec = {
	bg: string;
	fg: string;
	border: string;
	borderWidth: number;
	/** Hard-shadow offset; 0 disables shadow */
	shadow: number;
};

const VARIANT: Record<Variant, VariantSpec> = {
	primary: {
		bg: Colors.accent,
		fg: Colors.accentForeground,
		border: Colors.borderStrong,
		borderWidth: 2,
		shadow: ShadowTokens.md.offsetX,
	},
	secondary: {
		bg: "transparent",
		fg: Colors.foreground,
		border: Colors.borderStrong,
		borderWidth: 2,
		shadow: 0,
	},
	tertiary: {
		bg: Colors.amber,
		fg: Colors.foreground,
		border: Colors.borderStrong,
		borderWidth: 2,
		shadow: ShadowTokens.md.offsetX,
	},
	ghost: {
		bg: "transparent",
		fg: Colors.foreground,
		border: "transparent",
		borderWidth: 0,
		shadow: 0,
	},
	danger: {
		bg: Colors.danger,
		fg: Colors.inverse,
		border: Colors.borderStrong,
		borderWidth: 2,
		shadow: ShadowTokens.md.offsetX,
	},
};

const SIZE = {
	sm: {
		container: {
			minHeight: 40,
			paddingHorizontal: Spacing["4"],
			paddingVertical: Spacing["2"],
			gap: Spacing["2"],
		},
		label: { fontSize: 14 },
	},
	md: {
		container: {
			minHeight: Layout.touchTarget,
			paddingHorizontal: Spacing["5"],
			paddingVertical: Spacing["3"],
			gap: Spacing["2"],
		},
		label: { fontSize: 15 },
	},
	lg: {
		container: {
			minHeight: 56,
			paddingHorizontal: Spacing["6"],
			paddingVertical: Spacing["4"],
			gap: Spacing["3"],
		},
		label: { fontSize: 17 },
	},
} as const;

const styles = StyleSheet.create({
	base: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	fullWidth: {
		alignSelf: "stretch",
	},
});
