/**
 * <SectionHeader /> — Title + optional subtitle + squiggle underline.
 *
 *   <SectionHeader title="Today" subtitle="3 entries pending review" />
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Spacing } from "@/lib/theme";
import { Heading } from "./Heading";
import { Text } from "./Text";
import { Squiggle } from "./Squiggle";

type Props = {
	title: string;
	subtitle?: string;
	squiggleColor?: string;
	right?: React.ReactNode;
	style?: ViewStyle;
};

export function SectionHeader({
	title,
	subtitle,
	squiggleColor,
	right,
	style,
}: Props) {
	return (
		<View style={[styles.wrap, style]}>
			<View style={styles.row}>
				<View style={styles.titleCol}>
					<Heading level={2}>{title}</Heading>
					<Squiggle color={squiggleColor} width={64} height={8} waves={3} />
					{subtitle && (
						<Text variant="muted" style={styles.subtitle}>
							{subtitle}
						</Text>
					)}
				</View>
				{right}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		marginBottom: Spacing["4"],
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: Spacing["3"],
	},
	titleCol: {
		flex: 1,
		gap: Spacing["1"],
	},
	subtitle: {
		marginTop: Spacing["1"],
	},
});
