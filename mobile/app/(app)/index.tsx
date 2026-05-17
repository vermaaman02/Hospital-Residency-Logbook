/**
 * Home / Dashboard screen.
 * Shows welcome + role info + quick stats from /api/v1/dashboard.
 * This is the first screen after auth — proves the auth flow works.
 */

import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	RefreshControl,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMe } from "@/lib/hooks/useMe";
import { Colors, Font, Spacing, Radius } from "@/lib/theme";

export default function HomeScreen() {
	const { data: me, isLoading, refetch, isRefetching } = useMe();

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={Colors.primary}
					/>
				}
			>
				{/* Welcome header */}
				<View style={styles.welcomeCard}>
					<View style={styles.avatarCircle}>
						<Text style={styles.avatarText}>
							{(me?.firstName?.[0] ?? "?").toUpperCase()}
						</Text>
					</View>
					<View style={styles.welcomeInfo}>
						<Text style={styles.greeting}>
							Hello, {me?.firstName ?? "Resident"} 👋
						</Text>
						<Text style={styles.roleLine}>
							{me?.role === "student"
								? `Semester ${me?.currentSemester ?? "—"} • ${me?.batch ?? "—"}`
								: me?.role ?? "—"}
						</Text>
					</View>
				</View>

				{/* Auth status card (for testing) */}
				<View style={styles.statusCard}>
					<View style={styles.statusHeader}>
						<View style={styles.statusDot} />
						<Text style={styles.statusTitle}>Auth Status</Text>
					</View>
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>Signed in as</Text>
						<Text style={styles.statusValue}>
							{me?.email ?? "loading..."}
						</Text>
					</View>
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>Role</Text>
						<View style={styles.roleBadge}>
							<Text style={styles.roleBadgeText}>
								{me?.role?.toUpperCase() ?? "—"}
							</Text>
						</View>
					</View>
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>Department</Text>
						<Text style={styles.statusValue}>
							{me?.department ?? "—"}
						</Text>
					</View>
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>User ID</Text>
						<Text style={[styles.statusValue, styles.mono]}>
							{me?.id?.slice(0, 12) ?? "—"}...
						</Text>
					</View>
				</View>

				{/* Placeholder cards for future modules */}
				<Text style={styles.sectionTitle}>Quick Access</Text>
				<View style={styles.gridRow}>
					<QuickCard emoji="📋" label="Logbook" count="—" />
					<QuickCard emoji="📅" label="Attendance" count="—" />
				</View>
				<View style={styles.gridRow}>
					<QuickCard emoji="📬" label="Inbox" count="—" />
					<QuickCard emoji="📊" label="Evaluations" count="—" />
				</View>

				{isLoading && (
					<ActivityIndicator
						color={Colors.primary}
						style={{ marginTop: Spacing.xxl }}
					/>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function QuickCard({
	emoji,
	label,
	count,
}: {
	emoji: string;
	label: string;
	count: string;
}) {
	return (
		<View style={styles.quickCard}>
			<Text style={styles.quickEmoji}>{emoji}</Text>
			<Text style={styles.quickLabel}>{label}</Text>
			<Text style={styles.quickCount}>{count}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.bg },
	scroll: { padding: Spacing.xl, gap: Spacing.lg },

	// Welcome card
	welcomeCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.lg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	avatarCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: Colors.primary,
		justifyContent: "center",
		alignItems: "center",
	},
	avatarText: {
		fontSize: 22,
		fontWeight: Font.weight.bold,
		color: "#fff",
	},
	welcomeInfo: { flex: 1, gap: Spacing.xs },
	greeting: {
		fontSize: Font.size.lg,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	roleLine: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
	},

	// Auth status card
	statusCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		gap: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	statusHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginBottom: Spacing.xs,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.success,
	},
	statusTitle: {
		fontSize: Font.size.md,
		fontWeight: Font.weight.semibold,
		color: Colors.textPrimary,
	},
	statusRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: Colors.bg,
	},
	statusLabel: {
		fontSize: Font.size.sm,
		color: Colors.textMuted,
	},
	statusValue: {
		fontSize: Font.size.sm,
		color: Colors.textPrimary,
		fontWeight: Font.weight.medium,
		flexShrink: 1,
		textAlign: "right",
	},
	mono: {
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
	roleBadge: {
		backgroundColor: Colors.accent + "20",
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
	},
	roleBadgeText: {
		color: Colors.accentGlow,
		fontSize: Font.size.xs,
		fontWeight: Font.weight.bold,
		letterSpacing: 1,
	},

	// Quick access
	sectionTitle: {
		fontSize: Font.size.lg,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
		marginTop: Spacing.sm,
	},
	gridRow: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	quickCard: {
		flex: 1,
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		alignItems: "center",
		gap: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	quickEmoji: { fontSize: 28 },
	quickLabel: {
		fontSize: Font.size.sm,
		fontWeight: Font.weight.semibold,
		color: Colors.textPrimary,
	},
	quickCount: {
		fontSize: Font.size.xl,
		fontWeight: Font.weight.bold,
		color: Colors.textMuted,
	},
});

// Platform import for monospace font
import { Platform } from "react-native";
