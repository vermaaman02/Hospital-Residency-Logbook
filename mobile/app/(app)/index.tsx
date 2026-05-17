/**
 * Home / Dashboard screen — first screen after auth.
 *
 *  - Welcome banner with profile picture, name, semester/batch.
 *  - Quick stats: Total entries, Signed, Pending, Drafts.
 *  - Quick-access tiles (Logbook, Attendance, Inbox, Evaluations).
 *  - Motivation card.
 *
 * Pull-to-refresh refetches both `/api/v1/me` and `/api/v1/dashboard`.
 */

import React, { useCallback } from "react";
import {
	ActivityIndicator,
	Image,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { Link } from "expo-router";
import { useUser } from "@clerk/expo";
import {
	Activity,
	CalendarCheck,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
	Inbox,
	NotebookText,
	Sparkles,
	Stethoscope,
} from "lucide-react-native";

import { useMe } from "@/lib/hooks/useMe";
import { useDashboard, computeTotals } from "@/lib/hooks/useDashboard";
import {
	Card,
	Heading,
	HStack,
	IconBubble,
	Screen,
	SectionHeader,
	Squiggle,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Layout, Radius, Spacing } from "@/lib/theme";

export default function HomeScreen() {
	const { data: me, isLoading: meLoading, refetch: refetchMe, isRefetching: meRefetching } = useMe();
	const { data: dash, isLoading: dashLoading, refetch: refetchDash, isRefetching: dashRefetching } = useDashboard();
	const { user: clerkUser } = useUser();

	const isLoading = meLoading || dashLoading;
	const isRefetching = meRefetching || dashRefetching;
	const onRefresh = useCallback(() => {
		refetchMe();
		refetchDash();
	}, [refetchMe, refetchDash]);

	const profileUrl = clerkUser?.imageUrl ?? me?.profileImage ?? null;
	const initial = (me?.firstName?.[0] ?? "?").toUpperCase();
	const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || "Resident";
	const subtitle =
		me?.role === "student"
			? [me.batch, me.currentSemester ? `Semester ${me.currentSemester}` : null]
					.filter(Boolean)
					.join(" · ") || "MD Emergency Medicine"
			: me?.role
				? me.role.charAt(0).toUpperCase() + me.role.slice(1)
				: "Emergency Medicine";

	const totals = dash ? computeTotals(dash) : null;

	return (
		<Screen bleed pattern="dots">
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={onRefresh}
						tintColor={Colors.accent}
						colors={[Colors.accent]}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{/* ── WELCOME BANNER ── */}
				<View style={styles.bannerWrap}>
					<View style={styles.banner}>
						<View style={styles.bannerDecor1} />
						<View style={styles.bannerDecor2} />

						<View style={styles.bannerContent}>
							<View style={styles.avatarRow}>
								{profileUrl ? (
									<Image
										source={{ uri: profileUrl }}
										style={styles.avatar}
										accessibilityLabel="Profile picture"
									/>
								) : (
									<View style={[styles.avatar, styles.avatarFallback]}>
										<Text variant="h2" color={Colors.inverse}>
											{initial}
										</Text>
									</View>
								)}

								<View style={styles.greetingText}>
									<Text variant="label" color="rgba(255,255,255,0.7)">
										Welcome back,
									</Text>
									<Heading level={2} color={Colors.inverse}>
										{fullName}
									</Heading>
									<Text variant="bodySm" color="rgba(255,255,255,0.6)">
										{subtitle}
									</Text>
								</View>
							</View>

							<Squiggle
								color="rgba(255,255,255,0.2)"
								width={100}
								height={8}
								waves={3}
							/>

							<HStack gap="4" style={styles.bannerChips}>
								<HStack gap="1.5" align="center">
									<Stethoscope
										size={14}
										color={Colors.mint}
										strokeWidth={2.5}
									/>
									<Text variant="label" color={Colors.inverse}>
										{me?.department ?? "Emergency Medicine"}
									</Text>
								</HStack>
								{me?.role && (
									<View style={styles.rolePill}>
										<Text variant="label" color={Colors.accent}>
											{me.role.toUpperCase()}
										</Text>
									</View>
								)}
							</HStack>
						</View>
					</View>
				</View>

				{/* ── QUICK STATS ── */}
				<View style={styles.section}>
					<SectionHeader title="Overview" />
					<View style={styles.statsRow}>
						<StatCard
							icon={<ClipboardList size={18} color={Colors.info} strokeWidth={2.5} />}
							value={totals?.totalEntries ?? 0}
							label="Entries"
							bg={Colors.infoSoft}
						/>
						<StatCard
							icon={<CheckCircle2 size={18} color={Colors.success} strokeWidth={2.5} />}
							value={totals?.totalSigned ?? 0}
							label="Signed"
							bg={Colors.successSoft}
						/>
						<StatCard
							icon={<Clock size={18} color={Colors.warning} strokeWidth={2.5} />}
							value={totals?.totalPending ?? 0}
							label="Pending"
							bg={Colors.warningSoft}
						/>
						<StatCard
							icon={<FileText size={18} color={Colors.muted} strokeWidth={2.5} />}
							value={totals?.totalDraft ?? 0}
							label="Drafts"
							bg={Colors.surfaceMuted}
						/>
					</View>
				</View>

				{/* ── QUICK ACCESS ── */}
				<View style={styles.section}>
					<SectionHeader
						title="Quick access"
						subtitle="Jump into your day"
					/>
					<View style={styles.grid}>
						<QuickTile
							href="/(app)/logbook"
							tone="accent"
							label="Logbook"
							subtitle="Log cases & procedures"
							icon={<NotebookText size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/attendance"
							tone="mint"
							label="Attendance"
							subtitle="Mark your presence"
							icon={<CalendarCheck size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/inbox"
							tone="pink"
							label="Inbox"
							subtitle="Reviews & messages"
							icon={<Inbox size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<QuickTile
							href="/(app)/profile"
							tone="sky"
							label="Evaluations"
							subtitle="Assessments & scores"
							icon={<Activity size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
					</View>
				</View>

				{/* ── MOTIVATION CARD ── */}
				<Card variant="featured-amber">
					<HStack gap="3" align="center">
						<IconBubble
							tone="amber"
							size={48}
							icon={<Sparkles size={22} color={Colors.inverse} strokeWidth={2.5} />}
						/>
						<VStack gap="1" style={styles.motiveFlex}>
							<Heading level={4}>Keep going!</Heading>
							<Text variant="bodySm" color={Colors.muted}>
								Consistent logging builds a stronger portfolio.
								Your future self will thank you.
							</Text>
						</VStack>
					</HStack>
				</Card>

				{isLoading && (
					<ActivityIndicator
						color={Colors.accent}
						style={{ marginTop: Spacing["4"] }}
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
	subtitle,
	icon,
}: {
	href: string;
	tone: "accent" | "pink" | "amber" | "mint" | "sky";
	label: string;
	subtitle: string;
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
					<VStack gap="2" align="flex-start">
						<IconBubble tone={tone} icon={icon} size={44} />
						<Heading level={4}>{label}</Heading>
						<Text variant="bodySm" color={Colors.muted} numberOfLines={1}>
							{subtitle}
						</Text>
					</VStack>
				</Card>
			</Link>
		</View>
	);
}

function StatCard({
	icon,
	value,
	label,
	bg,
}: {
	icon: React.ReactNode;
	value: number;
	label: string;
	bg: string;
}) {
	return (
		<View style={styles.statCard}>
			<Card variant="flat" padding={Spacing["3"]}>
				<VStack gap="2" align="center">
					<View style={[styles.statIcon, { backgroundColor: bg }]}>
						{icon}
					</View>
					<Heading level={3}>{value}</Heading>
					<Text variant="label" color={Colors.muted}>
						{label}
					</Text>
				</VStack>
			</Card>
		</View>
	);
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
	scroll: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
		gap: Spacing["6"],
		paddingTop: Spacing["4"],
	},
	bannerWrap: {
		borderRadius: Radius.lg,
		overflow: "hidden",
	},
	banner: {
		backgroundColor: Colors.accent,
		padding: Spacing["5"],
		overflow: "hidden",
		position: "relative",
	},
	bannerDecor1: {
		position: "absolute",
		right: -20,
		top: -20,
		width: 100,
		height: 100,
		borderRadius: Radius.pill,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	bannerDecor2: {
		position: "absolute",
		right: 10,
		bottom: -10,
		width: 60,
		height: 60,
		borderRadius: Radius.pill,
		backgroundColor: "rgba(255,255,255,0.07)",
	},
	bannerContent: {
		gap: Spacing["3"],
	},
	avatarRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing["4"],
	},
	avatar: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		borderWidth: 3,
		borderColor: "rgba(255,255,255,0.3)",
	},
	avatarFallback: {
		backgroundColor: Colors.accentDark,
		alignItems: "center",
		justifyContent: "center",
	},
	greetingText: {
		flex: 1,
		gap: Spacing["0.5"],
	},
	bannerChips: {
		marginTop: Spacing["1"],
	},
	rolePill: {
		backgroundColor: Colors.inverse,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["0.5"],
		borderRadius: Radius.pill,
	},
	section: {
		gap: Spacing["3"],
	},
	statsRow: {
		flexDirection: "row",
		gap: Spacing["2"],
	},
	statCard: {
		flex: 1,
	},
	statIcon: {
		width: 36,
		height: 36,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing["3"],
	},
	tile: {
		width: "47%",
	},
	motiveFlex: {
		flex: 1,
	},
});
