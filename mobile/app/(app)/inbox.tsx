/**
 * Inbox screen — unified timeline of submissions across all modules.
 * Uses cursor-based pagination via GET /api/v1/inbox.
 */

import { useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInbox } from "@/lib/hooks/useInbox";
import type { InboxItem } from "@logbook/shared/types";

const STATUS_COLOR: Record<string, string> = {
	DRAFT: "#64748b",
	SUBMITTED: "#fbbf24",
	SIGNED: "#34d399",
	REJECTED: "#f87171",
	NEEDS_REVISION: "#fb923c",
};

function InboxCard({ item }: { item: InboxItem }) {
	return (
		<View style={styles.card}>
			<View style={styles.cardHeader}>
				<Text style={styles.entityType}>{item.entityType.replace(/-/g, " ")}</Text>
				<View
					style={[
						styles.badge,
						{ backgroundColor: STATUS_COLOR[item.status] ?? "#64748b" },
					]}
				>
					<Text style={styles.badgeText}>{item.status}</Text>
				</View>
			</View>
			{item.summary ? (
				<Text style={styles.summary} numberOfLines={2}>
					{item.summary}
				</Text>
			) : null}
			<Text style={styles.date}>
				{new Date(item.updatedAt).toLocaleDateString("en-IN", {
					day: "numeric",
					month: "short",
					year: "numeric",
				})}
			</Text>
		</View>
	);
}

export default function InboxScreen() {
	const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInbox();

	const items: InboxItem[] = data?.pages.flatMap((p) => p.items as InboxItem[]) ?? [];

	const onEndReached = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) fetchNextPage();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<SafeAreaView style={styles.safe}>
			<Text style={styles.title}>Inbox</Text>
			<FlatList
				data={items}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <InboxCard item={item} />}
				contentContainerStyle={styles.list}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.3}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor="#3b82f6"
					/>
				}
				ListHeaderComponent={
					isLoading ? (
						<ActivityIndicator color="#3b82f6" style={{ marginTop: 32 }} />
					) : null
				}
				ListFooterComponent={
					isFetchingNextPage ? (
						<ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
					) : null
				}
				ListEmptyComponent={
					!isLoading ? (
						<View style={styles.empty}>
							<Text style={styles.emptyText}>No items in your inbox</Text>
						</View>
					) : null
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	title: { fontSize: 22, fontWeight: "700", color: "#f1f5f9", padding: 20, paddingBottom: 8 },
	list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 12,
		padding: 14,
		gap: 6,
	},
	cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	entityType: { fontSize: 14, fontWeight: "600", color: "#e2e8f0", textTransform: "capitalize" },
	badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
	badgeText: { fontSize: 10, fontWeight: "700", color: "#0f172a" },
	summary: { fontSize: 13, color: "#94a3b8", lineHeight: 18 },
	date: { fontSize: 11, color: "#475569" },
	empty: { alignItems: "center", marginTop: 60 },
	emptyText: { color: "#475569", fontSize: 14 },
});
