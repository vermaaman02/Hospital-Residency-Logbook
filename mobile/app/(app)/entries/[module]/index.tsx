/**
 * Generic entry list screen for any logbook module.
 * Route: /(app)/entries/[module]
 *
 * Fetches from GET /api/v1/[module] with infinite scroll.
 * Each API response item must include at minimum: id, status, updatedAt.
 * The module-specific title/subtitle are derived by the adapter in lib/modules/index.ts.
 */

import { useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEntries } from "@/lib/hooks/useEntries";
import { EntryCard, type EntryCardData } from "@/components/EntryCard";
import { getModuleConfig } from "@/lib/modules/index";
import type { EntryStatus } from "@logbook/shared/types";

export default function EntryListScreen() {
	const { module } = useLocalSearchParams<{ module: string }>();
	const router = useRouter();
	const config = getModuleConfig(module ?? "");

	const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useEntries(module ?? "");

	const items = data?.pages.flatMap((p) => (p.items as Record<string, unknown>[]) ?? []) ?? [];

	const toCard = useCallback(
		(item: Record<string, unknown>): EntryCardData => ({
			id: String(item.id),
			title: config.getTitle(item),
			subtitle: config.getSubtitle?.(item),
			status: (item.status as EntryStatus) ?? "DRAFT",
			date: String(item.updatedAt ?? item.createdAt ?? ""),
			slNo: item.slNo !== undefined ? Number(item.slNo) : undefined,
		}),
		[config],
	);

	const onEndReached = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) fetchNextPage();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.back}>
					<Text style={styles.backText}>‹ Back</Text>
				</TouchableOpacity>
				<Text style={styles.title}>{config.label}</Text>
				<View style={{ width: 60 }} />
			</View>

			<FlatList
				data={items}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => (
					<EntryCard
						item={toCard(item)}
						onPress={(id) =>
							router.push(`/(app)/entries/${module}/detail?id=${id}`)
						}
					/>
				)}
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
							<Text style={styles.emptyText}>No entries yet</Text>
							<Text style={styles.emptySub}>Tap + to add your first entry</Text>
						</View>
					) : null
				}
			/>

			<TouchableOpacity
				style={styles.fab}
				onPress={() => router.push(`/(app)/entries/${module}/form`)}
			>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0f172a" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
	},
	back: { width: 60 },
	backText: { color: "#3b82f6", fontSize: 16 },
	title: { fontSize: 16, fontWeight: "700", color: "#f1f5f9", flex: 1, textAlign: "center" },
	list: { padding: 16, gap: 10, paddingBottom: 100 },
	empty: { alignItems: "center", marginTop: 80, gap: 8 },
	emptyText: { fontSize: 16, color: "#475569", fontWeight: "600" },
	emptySub: { fontSize: 13, color: "#334155" },
	fab: {
		position: "absolute",
		bottom: 28,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#3b82f6",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	fabText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 32 },
});
