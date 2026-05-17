/**
 * Protected app shell — redirects to auth if not signed in.
 *
 * After auth, fetches user from /api/v1/me to:
 *   1. Get the role (student/faculty/hod)
 *   2. Show role-appropriate tab navigation
 *   3. Non-students see a "use web app" message
 *
 * Side-effects (socket, push token) are deferred to later phases.
 */

import { useEffect } from "react";
import {
	View,
	Text,
	ActivityIndicator,
	StyleSheet,
	Pressable,
} from "react-native";
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useMe } from "@/lib/hooks/useMe";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { Colors, Font, Spacing, Radius } from "@/lib/theme";

export default function AppLayout() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={Colors.primary} />
			</View>
		);
	}

	if (!isSignedIn) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	return <AuthenticatedShell />;
}

/**
 * Inner shell — only mounts when user IS authenticated.
 * Fetches the DB user record via /api/v1/me and shows
 * role-appropriate content.
 */
function AuthenticatedShell() {
	const { signOut } = useAuth();
	const qc = useQueryClient();
	const { data: me, isLoading, isError, error, refetch } = useMe();

	// ─── Loading state ────────────────────────────────────
	if (isLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={styles.loadingText}>Loading your profile...</Text>
			</View>
		);
	}

	// ─── Error state ──────────────────────────────────────
	if (isError) {
		return (
			<View style={styles.center}>
				<View style={styles.errorCard}>
					<Text style={styles.errorEmoji}>⚠️</Text>
					<Text style={styles.errorTitle}>Connection Error</Text>
					<Text style={styles.errorMessage}>
						{error?.message ?? "Could not reach the server"}
					</Text>
					<Pressable
						style={({ pressed }) => [
							styles.retryButton,
							pressed && { opacity: 0.8 },
						]}
						onPress={() => refetch()}
					>
						<Text style={styles.retryText}>Try again</Text>
					</Pressable>
					<Pressable
						style={({ pressed }) => [
							styles.signOutBtn,
							pressed && { opacity: 0.8 },
						]}
						onPress={async () => {
							setAuthToken(null);
							qc.clear();
							await signOut();
						}}
					>
						<Text style={styles.signOutText}>Sign out</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	// ─── Non-student gate ─────────────────────────────────
	if (me && me.role !== "student") {
		return (
			<View style={styles.center}>
				<View style={styles.gateCard}>
					<Text style={styles.gateEmoji}>💻</Text>
					<Text style={styles.gateTitle}>
						Welcome, {me.firstName ?? "Doctor"}!
					</Text>
					<Text style={styles.gateMessage}>
						The mobile app is currently available for{" "}
						<Text style={{ fontWeight: "700" }}>students only</Text>.
					</Text>
					<Text style={styles.gateMessage}>
						As a <Text style={styles.roleBadge}>{me.role}</Text>, please
						use the web application for full access.
					</Text>
					<Pressable
						style={({ pressed }) => [
							styles.signOutBtn,
							pressed && { opacity: 0.8 },
						]}
						onPress={async () => {
							setAuthToken(null);
							qc.clear();
							await signOut();
						}}
					>
						<Text style={styles.signOutText}>Sign out</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	// ─── Student tab bar ──────────────────────────────────
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: Colors.tabBg,
					borderTopColor: Colors.tabBorder,
					borderTopWidth: 1,
					height: 60,
					paddingBottom: 8,
					paddingTop: 4,
				},
				tabBarActiveTintColor: Colors.tabActive,
				tabBarInactiveTintColor: Colors.tabInactive,
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "600",
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarLabel: "Home",
					tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="logbook"
				options={{
					title: "Logbook",
					tabBarLabel: "Logbook",
					tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="attendance"
				options={{
					title: "Attendance",
					tabBarLabel: "Attendance",
					tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="inbox"
				options={{
					title: "Inbox",
					tabBarLabel: "Inbox",
					tabBarIcon: ({ color }) => <TabIcon emoji="📬" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarLabel: "Profile",
					tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
				}}
			/>
		</Tabs>
	);
}

/**
 * Simple emoji-based tab icon (will replace with proper icons later).
 */
function TabIcon({ emoji }: { emoji: string; color: string }) {
	return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

/* ────────────────────────────────────────────────────── */
/*  Styles                                                */
/* ────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
	center: {
		flex: 1,
		backgroundColor: Colors.bg,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	loadingText: {
		color: Colors.textSecondary,
		fontSize: Font.size.sm,
		marginTop: Spacing.lg,
	},

	// Error card
	errorCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xxxl,
		alignItems: "center",
		gap: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		width: "100%",
		maxWidth: 340,
	},
	errorEmoji: { fontSize: 40 },
	errorTitle: {
		fontSize: Font.size.lg,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	errorMessage: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		textAlign: "center",
	},
	retryButton: {
		backgroundColor: Colors.primary,
		borderRadius: Radius.sm,
		paddingVertical: 12,
		paddingHorizontal: 32,
		marginTop: Spacing.sm,
	},
	retryText: {
		color: "#fff",
		fontWeight: Font.weight.semibold,
		fontSize: Font.size.md,
	},

	// Gate card (non-student)
	gateCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xxxl,
		alignItems: "center",
		gap: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		width: "100%",
		maxWidth: 340,
	},
	gateEmoji: { fontSize: 48 },
	gateTitle: {
		fontSize: Font.size.xl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	gateMessage: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		textAlign: "center",
		lineHeight: 22,
	},
	roleBadge: {
		color: Colors.accent,
		fontWeight: Font.weight.bold,
		textTransform: "capitalize",
	},

	// Sign out
	signOutBtn: {
		backgroundColor: Colors.errorBg,
		borderRadius: Radius.sm,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginTop: Spacing.md,
	},
	signOutText: {
		color: "#fca5a5",
		fontWeight: Font.weight.semibold,
		fontSize: Font.size.md,
	},
});
