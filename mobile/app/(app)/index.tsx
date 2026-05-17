/**
 * Home / Dashboard screen — first screen after auth.
 *
 *  - Hero card with greeting + role chip.
 *  - Quick-access tiles (Logbook, Attendance, Inbox, Evaluations).
 *  - Auth status card for sanity-checking the Clerk / API connection.
 *
 * Pull-to-refresh refetches `/api/v1/me`.
 */

import React from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { Link } from "expo-router";
import {
	Activity,
	CalendarCheck,
	ClipboardList,
	Inbox,
	NotebookText,
	WifiOff,
} from "lucide-react-native";

import { useMe } from "@/lib/hooks/useMe";
import {
	Badge,
	Card,
	Confetti,
	Heading,
	IconBubble,
	Screen,
	SectionHeader,
	Squiggle,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Layout, Spacing } from "@/lib/theme";

export default function HomeScreen() {
	const { data: me, isLoading, refetch, isRefetching } = useMe();

	return (
		<Screen bleed pattern="dots">
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={Colors.accent}
						colors={[Colors.accent]}
					/>
				}
			>
				{/* HERO */}
				<View style={styles.hero}>
					<Confetti count={10} seed={3} opacity={0.7} />
					<View style={styles.greetingRow}>
						<IconBubble
							tone="amber"
							size={56}
							icon={
								<Text variant="h3" color={Colors.foreground}>
									{(me?.firstName?.[0] ?? "?").toUpperCase()}
								</Text>
							}
						/>
						<View style={styles.greetingText}>
							<Heading level={3}>
								Hi, {me?.firstName ?? "Resident"}
							</Heading>
							<Text variant="muted">
								{me?.role === "student"
									? `Semester ${me?.currentSemester ?? "—"} · ${me?.batch ?? "—"}`
									: me?.role ?? "—"}
							</Text>
						</View>
					</View>
					<Squiggle color={Colors.pink} width={120} height={12} waves={4} />
				</View>

				{/* QUICK ACCESS */}
				<View style={styles.section}>
					<SectionHeader title="Quick access" subtitle="Jump into your day" />
					<View style={styles.grid}>
						<QuickTile
							href="/(app)/logbook"
							tone="accent"
							label="Logbook"
							icon={<NotebookText size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/attendance"
							tone="mint"
							label="Attendance"
							icon={<CalendarCheck size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/inbox"
							tone="pink"
							label="Inbox"
							icon={<Inbox size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/profile"
							tone="sky"
							label="Evaluations"
							icon={<Activity size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
					</View>
				</View>

				{/* AUTH STATUS */}
				<View style={styles.section}>
					<SectionHeader
						title="Session"
						subtitle="Status of your Clerk + DB connection"
						squiggleColor={Colors.sky}
					/>
					<Card>
						<VStack gap="3">
							<Row label="Signed in as" value={me?.email ?? "loading…"} />
							<Row
								label="Role"
								custom={
									<Badge
										label={(me?.role ?? "—").toUpperCase()}
										tone="accent"
									/>
								}
							/>
							<Row label="Department" value={me?.department ?? "—"} />
							<Row label="User ID" value={(me?.id ?? "—").slice(0, 12) + "…"} mono />
						</VStack>
					</Card>
				</View>

				{isLoading && (
					<ActivityIndicator
						color={Colors.accent}
						style={{ marginTop: Spacing["6"] }}
					/>
				)}
			</ScrollView>
		</Screen>
	);
}

/* ─────────────────────────────────────────────────────────────────── */

function QuickTile({
	href,
	tone,
	label,
	icon,
}: {
	href: string;
	tone: "accent" | "pink" | "amber" | "mint" | "sky";
	label: string;
	icon: React.ReactNode;
}) {
	const cardVariant =
		tone === "pink"
			? "featured-pink"
			: tone === "amber"
				? "featured-amber"
				: tone === "mint"
					? "featured-mint"
					: "featured-violet";

	return (
		<View style={styles.tile}>
			<Link href={href as any} asChild>
				<Card variant={cardVariant} onPress={() => {}}>
					<VStack gap="3" align="flex-start">
						<IconBubble tone={tone} icon={icon} size={44} />
						<Heading level={4}>{label}</Heading>
					</VStack>
				</Card>
			</Link>
		</View>
	);
}

function Row({
	label,
	value,
	custom,
	mono,
}: {
	label: string;
	value?: string;
	custom?: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<View style={styles.row}>
			<Text variant="muted">{label}</Text>
			{custom ?? (
				<Text variant={mono ? "mono" : "bodyStrong"} numberOfLines={1}>
					{value}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	scroll: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
		gap: Spacing["6"],
	},
	hero: {
		marginTop: Spacing["4"],
		gap: Spacing["3"],
	},
	greetingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing["3"],
	},
	greetingText: { flex: 1, gap: Spacing["1"] },
	section: { gap: Spacing["3"] },
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing["3"],
	},
	tile: {
		width: "47%",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: Spacing["3"],
	},
});
