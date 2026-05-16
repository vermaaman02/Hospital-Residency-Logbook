/**
 * Authenticated app layout.
 * - Redirects to (auth)/sign-in if not signed in.
 * - Hits GET /api/v1/me to load role.
 * - If role !== "student" shows a "web-only" gate screen.
 * - Otherwise renders the bottom tab navigator.
 */

import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useMe } from "@/lib/hooks/useMe";
import { registerPushToken } from "@/lib/notifications/push-token";
import { useSocketConnection } from "@/lib/realtime/useRealtimeEvent";

function WebOnlyGate() {
	const { signOut } = useAuth();
	return (
		<View style={styles.gate}>
			<Text style={styles.gateIcon}>🖥️</Text>
			<Text style={styles.gateTitle}>Mobile app is student-only</Text>
			<Text style={styles.gateBody}>
				Faculty and HOD features are available on the web app at{"\n"}
				aiims-patna-logbook.railway.app
			</Text>
			<TouchableOpacity style={styles.gateBtn} onPress={() => signOut()}>
				<Text style={styles.gateBtnText}>Sign out</Text>
			</TouchableOpacity>
		</View>
	);
}

export default function AppLayout() {
	const { isSignedIn, isLoaded } = useAuth();
	const router = useRouter();
	const { data: me, isLoading, isError } = useMe();

	useSocketConnection();

	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			router.replace("/(auth)/sign-in");
		}
	}, [isLoaded, isSignedIn, router]);

	useEffect(() => {
		if (isSignedIn) {
			registerPushToken();
		}
	}, [isSignedIn]);

	if (!isLoaded || isLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#3b82f6" />
			</View>
		);
	}

	if (isError) {
		return (
			<View style={styles.center}>
				<Text style={styles.errorText}>Failed to load profile. Check your connection.</Text>
			</View>
		);
	}

	if (me && me.role !== "student") {
		return <WebOnlyGate />;
	}

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "#0f172a",
					borderTopColor: "#1e293b",
				},
				tabBarActiveTintColor: "#3b82f6",
				tabBarInactiveTintColor: "#64748b",
			}}
		>
			<Tabs.Screen
				name="index"
				options={{ title: "Home", tabBarLabel: "Home" }}
			/>
			<Tabs.Screen
				name="logbook"
				options={{ title: "Logbook", tabBarLabel: "Logbook" }}
			/>
			<Tabs.Screen
				name="attendance"
				options={{ title: "Attendance", tabBarLabel: "Attendance" }}
			/>
			<Tabs.Screen
				name="inbox"
				options={{ title: "Inbox", tabBarLabel: "Inbox" }}
			/>
			<Tabs.Screen
				name="profile"
				options={{ title: "Profile", tabBarLabel: "Profile" }}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: { color: "#f87171", textAlign: "center", padding: 24, fontSize: 14 },
	gate: {
		flex: 1,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
		gap: 16,
	},
	gateIcon: { fontSize: 48 },
	gateTitle: { fontSize: 20, fontWeight: "700", color: "#f1f5f9", textAlign: "center" },
	gateBody: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 22 },
	gateBtn: {
		marginTop: 8,
		backgroundColor: "#1e293b",
		borderRadius: 10,
		padding: 14,
		paddingHorizontal: 28,
	},
	gateBtnText: { color: "#60a5fa", fontWeight: "600" },
});
