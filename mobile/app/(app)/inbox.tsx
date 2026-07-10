import React from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import {
	Badge,
	Button,
	Card,
	Heading,
	HStack,
	IconBubble,
	Screen,
	SectionHeader,
	Text,
	VStack,
} from "@/components/ui";
import { Inbox, CheckCircle2, AlertTriangle, ChevronRight, Calendar, Trash2 } from "lucide-react-native";
import { Colors, Radius, Spacing, Layout } from "@/lib/theme";
import { useInbox, InboxItem } from "@/lib/hooks/useInbox";
import { notificationStore } from "@/lib/store/notifications";
import { apiClient } from "@/lib/api/client";

export default function InboxScreen() {
	const router = useRouter();
	const { items, isLoading, refetch } = useInbox();

	const [clearedIds, setClearedIds] = React.useState<string[]>([]);

	React.useEffect(() => {
		notificationStore.markAllRead();
		setClearedIds(notificationStore.getClearedIds());
		const unsubscribe = notificationStore.subscribe(() => {
			setClearedIds([...notificationStore.getClearedIds()]);
		});
		return () => {
			unsubscribe();
		};
	}, []);

	const handleItemPress = (item: InboxItem) => {
		if (item.module === "Rotation Postings") {
			router.push("/rotation-postings");
		} else if (item.module === "Case Presentations") {
			router.push({
				pathname: "/academic-cases-seminars",
				params: { tab: "cases" },
			});
		} else if (item.module === "Seminars" || item.module === "Seminar Discussions") {
			router.push({
				pathname: "/academic-cases-seminars",
				params: { tab: "seminars" },
			});
		} else {
			Alert.alert("Module View", `The details for this module (${item.module}) are available on the web dashboard.`);
		}
	};

	const formatDate = (dateStr: string) => {
		try {
			return new Date(dateStr).toLocaleDateString("en-IN", {
				day: "2-digit",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return dateStr;
		}
	};

	const visibleItems = items.filter((item) => !clearedIds.includes(item.id));

	const renderItem = ({ item }: { item: InboxItem }) => {
		const isSigned = item.status === "SIGNED";
		const isRevision = item.status === "NEEDS_REVISION";

		const cardVariant = isSigned ? "default" : "featured-amber";
		const Icon = isSigned ? CheckCircle2 : AlertTriangle;

		return (
			<Pressable
				onPress={() => handleItemPress(item)}
				style={({ pressed }) => [
					styles.itemPressable,
					pressed && styles.pressed,
				]}
			>
				<Card
					variant={cardVariant}
					style={StyleSheet.flatten([
						styles.itemCard,
						isSigned ? styles.signedBorder : styles.revisionBorder,
					])}
				>
					<VStack gap="3">
						<HStack justify="space-between" align="center">
							<HStack gap="2" align="center" style={styles.flex1}>
								<IconBubble
									icon={<Icon color={Colors.inverse} size={16} strokeWidth={2.5} />}
									tone={isSigned ? "success" : "warning"}
									size={32}
								/>
								<VStack gap="0.5" style={styles.flex1}>
									<Text variant="bodySm" color={Colors.muted} style={styles.uppercase}>
										{item.module}
									</Text>
									<Text variant="bodyStrong" numberOfLines={1}>
										{item.title}
									</Text>
								</VStack>
							</HStack>
							<HStack gap="1" align="center">
								<Pressable
									onPress={async (e) => {
										e.stopPropagation();
										try {
											const res = await apiClient.post("/api/v1/inbox/clear", { itemId: item.id });
											if (res.status === 200) {
												await notificationStore.clearNotification(item.id);
												refetch();
											}
										} catch (err) {
											console.error(err);
											Alert.alert("Error", "Failed to clear notification.");
										}
									}}
									style={({ pressed }) => [
										styles.clearBtnIcon,
										pressed && styles.clearBtnIconPressed,
									]}
								>
									<Trash2 size={16} color={Colors.muted} />
								</Pressable>
								<ChevronRight size={18} color={Colors.muted} />
							</HStack>
						</HStack>

						{isRevision && item.remark && (
							<View style={styles.remarkContainer}>
								<Text variant="bodySm" color={Colors.warning} style={styles.remarkTitle}>
									Reviewer Remarks:
								</Text>
								<Text variant="bodySm" color={Colors.foreground}>
									{item.remark}
								</Text>
							</View>
						)}

						<HStack gap="1.5" align="center" justify="space-between" style={styles.footer}>
							<HStack gap="1" align="center">
								<Calendar size={12} color={Colors.muted} />
								<Text variant="bodySm" color={Colors.muted}>
									{formatDate(item.updatedAt)}
								</Text>
							</HStack>
							<Badge
								label={isSigned ? "Signed Off" : "Needs Revision"}
								tone={isSigned ? "success" : "warning"}
							/>
						</HStack>
					</VStack>
				</Card>
			</Pressable>
		);
	};

	return (
		<Screen pattern="dots">
			<SectionHeader
				title="Inbox"
				subtitle="Real-time timeline of approvals, revisions, & feedback"
				squiggleColor={Colors.accent}
			/>

			{visibleItems.length > 0 && (
				<HStack justify="flex-end" style={styles.clearAllContainer}>
					<Button
						label="Clear All"
						variant="ghost"
						size="sm"
						leftIcon={<Trash2 size={14} color={Colors.muted} />}
						onPress={() => {
							Alert.alert(
								"Clear Inbox",
								"Are you sure you want to clear all notifications from your inbox?",
								[
									{ text: "Cancel", style: "cancel" },
									{
										text: "Clear All",
										style: "destructive",
										onPress: async () => {
											const ids = visibleItems.map(i => i.id);
											try {
												const res = await apiClient.post("/api/v1/inbox/clear", { itemIds: ids });
												if (res.status === 200) {
													await notificationStore.clearAll(ids);
													refetch();
												}
											} catch (err) {
												console.error(err);
												Alert.alert("Error", "Failed to clear notifications.");
											}
										}
									}
								]
							);
						}}
					/>
				</HStack>
			)}

			{isLoading && visibleItems.length === 0 ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={Colors.accent} />
				</View>
			) : visibleItems.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Card variant="featured-violet" style={styles.emptyCard}>
						<VStack gap="3" align="center">
							<IconBubble
								icon={<Inbox color={Colors.inverse} size={26} strokeWidth={2.5} />}
								tone="accent"
								size={64}
							/>
							<Heading level={2}>All caught up!</Heading>
							<Text variant="muted" style={styles.centerText}>
								No notifications or revision requests at the moment. As teachers sign off or request changes to your logs, updates will appear here in real-time.
							</Text>
						</VStack>
					</Card>
				</View>
			) : (
				<FlatList
					data={visibleItems}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
					onRefresh={refetch}
					refreshing={isLoading}
				/>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	listContainer: {
		paddingBottom: Layout.tabBarHeight,
	},
	itemPressable: {
		marginBottom: Spacing["2"],
		borderRadius: Radius.md,
		overflow: "hidden",
	},
	pressed: {
		opacity: 0.9,
		transform: [{ scale: 0.995 }],
	},
	itemCard: {
		backgroundColor: Colors.surface,
		borderLeftWidth: 4,
	},
	signedBorder: {
		borderLeftColor: Colors.success,
	},
	revisionBorder: {
		borderLeftColor: Colors.warning,
	},
	flex1: {
		flex: 1,
	},
	uppercase: {
		textTransform: "uppercase",
		fontSize: 10,
		letterSpacing: 0.5,
		fontFamily: "Outfit-Bold",
	},
	remarkContainer: {
		backgroundColor: "rgba(243, 156, 18, 0.08)",
		borderWidth: 1,
		borderColor: "rgba(243, 156, 18, 0.15)",
		padding: Spacing["2"],
		borderRadius: Radius.sm,
		marginTop: Spacing["0.5"],
	},
	remarkTitle: {
		fontWeight: "bold",
		marginBottom: 2,
	},
	footer: {
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		paddingTop: Spacing["2"],
		marginTop: Spacing["0.5"],
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		paddingTop: Spacing["6"],
	},
	emptyCard: {
		padding: Spacing["4"],
	},
	centerText: {
		textAlign: "center",
		lineHeight: 18,
	},
	clearAllContainer: {
		paddingHorizontal: Spacing["2"],
		marginBottom: Spacing["2"],
	},
	clearBtnIcon: {
		padding: Spacing["1.5"],
		borderRadius: Radius.sm,
	},
	clearBtnIconPressed: {
		backgroundColor: "rgba(0, 0, 0, 0.05)",
	},
});
