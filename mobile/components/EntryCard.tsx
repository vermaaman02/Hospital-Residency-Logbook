import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBadge } from "./StatusBadge";
import type { EntryStatus } from "@logbook/shared/types";

export interface EntryCardData {
	id: string;
	title: string;
	subtitle?: string;
	status: EntryStatus;
	date: string;
	slNo?: number;
}

interface Props {
	item: EntryCardData;
	onPress: (id: string) => void;
}

export function EntryCard({ item, onPress }: Props) {
	return (
		<TouchableOpacity style={styles.card} onPress={() => onPress(item.id)} activeOpacity={0.75}>
			<View style={styles.row}>
				<View style={styles.meta}>
					{item.slNo !== undefined && (
						<Text style={styles.slNo}>#{item.slNo}</Text>
					)}
					<Text style={styles.title} numberOfLines={2}>{item.title}</Text>
					{item.subtitle ? (
						<Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
					) : null}
				</View>
				<View style={styles.right}>
					<StatusBadge status={item.status} size="sm" />
					<Text style={styles.date}>
						{new Date(item.date).toLocaleDateString("en-IN", {
							day: "numeric", month: "short",
						})}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 12,
		padding: 14,
	},
	row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
	meta: { flex: 1, gap: 4 },
	slNo: { fontSize: 11, color: "#475569" },
	title: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
	subtitle: { fontSize: 12, color: "#64748b" },
	right: { alignItems: "flex-end", gap: 6 },
	date: { fontSize: 11, color: "#475569" },
});
