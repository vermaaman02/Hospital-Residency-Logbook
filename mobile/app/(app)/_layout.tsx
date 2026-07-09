/**
 * Protected app shell — handles auth gating, role gating, and tab navigation.
 *
 * Flow:
 *   1. Wait for Clerk session.
 *   2. If signed out → redirect to /(auth)/sign-in.
 *   3. If signed in → fetch DB user via GET /api/v1/me.
 *   4. If non-student → render a friendly "use web app" gate.
 *   5. If student → render the 5-tab navigator.
 */

import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
	Home,
	NotebookText,
	CalendarCheck,
	Inbox,
	UserRound,
	Stethoscope,
	AlertTriangle,
	LogOut,
} from "lucide-react-native";

import { useMe } from "@/lib/hooks/useMe";
import { setAuthToken } from "@/lib/api/client";
import {
	Button,
	Card,
	Heading,
	IconBubble,
	Screen,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, FontFamily, Layout, Spacing } from "@/lib/theme";

export default function AppLayout() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) return <FullScreenSpinner />;
	if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

	return <AuthenticatedShell />;
}

function AuthenticatedShell() {
	const { signOut } = useAuth();
	const qc = useQueryClient();
	const { data: me, isLoading, isError, error, refetch } = useMe();

	const handleSignOut = async () => {
		setAuthToken(null);
		qc.clear();
		await signOut();
	};

	if (isLoading) return <FullScreenSpinner label="Loading your profile…" />;

	if (isError) {
		return (
			<Screen scroll>
				<View style={styles.fill}>
					<Card variant="featured-amber">
						<VStack gap="3" align="center">
							<IconBubble
								icon={<AlertTriangle color={Colors.inverse} size={22} strokeWidth={2.5} />}
								tone="warning"
								size={56}
							/>
							<Heading level={3}>Connection error</Heading>
							<Text variant="muted" style={styles.center}>
								{error?.message ?? "Could not reach the server"}
							</Text>
							<Button label="Try again" onPress={() => refetch()} fullWidth />
							<Button
								label="Sign out"
								variant="ghost"
								leftIcon={<LogOut size={16} color={Colors.danger} strokeWidth={2.5} />}
								onPress={handleSignOut}
							/>
						</VStack>
					</Card>
				</View>
			</Screen>
		);
	}

	// Non-student → web-app gate
	if (me && me.role.toLowerCase() !== "student") {
		return (
			<Screen scroll pattern="dots">
				<View style={styles.fill}>
					<Card variant="featured-violet">
						<VStack gap="3" align="center">
							<IconBubble
								icon={<Stethoscope color={Colors.inverse} size={26} strokeWidth={2.5} />}
								tone="accent"
								size={64}
							/>
							<Heading level={2} style={styles.center}>
								Welcome, {me.firstName ?? "Doctor"}!
							</Heading>
							<Text variant="body" style={styles.center}>
								The mobile app is available for{" "}
								<Text variant="bodyStrong">students only</Text>.
							</Text>
							<Text variant="muted" style={styles.center}>
								As a <Text variant="bodyStrong" color={Colors.accent}>{me.role}</Text>,
								please use the web application for full access.
							</Text>
							<Button
								label="Sign out"
								variant="secondary"
								leftIcon={<LogOut size={16} color={Colors.foreground} strokeWidth={2.5} />}
								onPress={handleSignOut}
								fullWidth
							/>
						</VStack>
					</Card>
				</View>
			</Screen>
		);
	}

	// Student → tab navigator
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: Colors.surface,
					borderTopColor: Colors.borderStrong,
					borderTopWidth: 2,
					height: Layout.tabBarHeight,
					paddingBottom: 10,
					paddingTop: 8,
				},
				tabBarActiveTintColor: Colors.accent,
				tabBarInactiveTintColor: Colors.muted,
				tabBarLabelStyle: {
					fontFamily: FontFamily.bodyBold,
					fontSize: 11,
					letterSpacing: 0.4,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, focused }) => (
						<Home size={focused ? 26 : 22} color={color} strokeWidth={2.5} />
					),
				}}
			/>
			<Tabs.Screen
				name="logbook"
				options={{
					title: "Logbook",
					tabBarIcon: ({ color, focused }) => (
						<NotebookText size={focused ? 26 : 22} color={color} strokeWidth={2.5} />
					),
				}}
			/>
			<Tabs.Screen
				name="attendance"
				options={{
					title: "Attendance",
					tabBarIcon: ({ color, focused }) => (
						<CalendarCheck size={focused ? 26 : 22} color={color} strokeWidth={2.5} />
					),
				}}
			/>
			<Tabs.Screen
				name="inbox"
				options={{
					title: "Inbox",
					tabBarIcon: ({ color, focused }) => (
						<Inbox size={focused ? 26 : 22} color={color} strokeWidth={2.5} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, focused }) => (
						<UserRound size={focused ? 26 : 22} color={color} strokeWidth={2.5} />
					),
				}}
			/>
			<Tabs.Screen
				name="account-settings"
				options={{
					href: null,
				}}
			/>
			<Tabs.Screen
				name="rotation-postings"
				options={{
					href: null,
				}}
			/>
			<Tabs.Screen
				name="academic-cases-seminars"
				options={{
					href: null,
				}}
			/>
		</Tabs>
	);
}

function FullScreenSpinner({ label }: { label?: string }) {
	return (
		<View style={styles.fill}>
			<ActivityIndicator size="large" color={Colors.accent} />
			{label && (
				<Text variant="muted" style={{ marginTop: Spacing["4"] }}>
					{label}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {
		flex: 1,
		backgroundColor: Colors.background,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing["3"],
		padding: Spacing["5"],
	},
	center: { textAlign: "center" },
});
