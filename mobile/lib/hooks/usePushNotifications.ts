/**
 * @module usePushNotifications
 * @description Registers for Expo push notifications, manages device token
 * registration with the backend, and handles incoming notifications.
 *
 * - Prompts user for notification permission immediately on app startup
 * - Foreground: shows a native notification banner
 * - Background/killed: native push notification in system tray
 * - Tap: invalidates queries to refresh data
 *
 * Gracefully degrades in Expo Go or local dev builds without FCM configuration.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Dynamically import expo-notifications to avoid crashes in unsupported environments
let Notifications: typeof import("expo-notifications") | null = null;

try {
	Notifications = require("expo-notifications");
} catch (e) {
	console.warn("[Push] expo-notifications not available");
}

/**
 * Check if running inside Expo Go (where remote push notifications are not supported).
 */
function isExpoGo(): boolean {
	return Constants.appOwnership === "expo";
}

/**
 * Configure how notifications are presented when the app is in foreground.
 */
if (Notifications && !isExpoGo()) {
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: true,
			shouldSetBadge: true,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	});
}

/**
 * Schedules a local native notification immediately on device screen.
 */
export async function showLocalNotification(
	title: string,
	body: string,
	data?: Record<string, any>
) {
	if (!Notifications) return;
	try {
		await Notifications.scheduleNotificationAsync({
			content: {
				title,
				body,
				data: data || {},
				sound: "default",
			},
			trigger: null,
		});
	} catch (e) {
		console.warn("[Push] Local notification dispatch note:", e);
	}
}

/**
 * Request permission + get Expo push token.
 * Prompts user for permissions on app launch if not already granted.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
	if (!Notifications || isExpoGo()) {
		console.log("[Push] Skipping registration — Expo Go or notifications unavailable");
		return null;
	}

	// Set up Android notification channel
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "Default Notifications",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#8B5CF6",
			sound: "default",
		});
	}

	// Check existing permissions
	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	// Request permission from user if not already granted
	if (existingStatus !== "granted") {
		console.log("[Push] Requesting push notification permissions from user on app open...");
		const { status } = await Notifications.requestPermissionsAsync({
			ios: {
				allowAlert: true,
				allowBadge: true,
				allowSound: true,
			},
		});
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		console.log("[Push] User did not grant push notification permission");
		return null;
	}

	// Retrieve Expo push token with fallback
	const projectId =
		Constants?.expoConfig?.extra?.eas?.projectId ??
		Constants?.easConfig?.projectId;

	try {
		const tokenData = projectId && projectId !== "00000000-0000-0000-0000-000000000000"
			? await Notifications.getExpoPushTokenAsync({ projectId })
			: await Notifications.getExpoPushTokenAsync();
		console.log("[Push] Expo push token acquired:", tokenData.data);
		return tokenData.data;
	} catch (e: any) {
		console.log("[Push] Push token initialization note: Remote push token requires FCM setup in production. Active real-time notifications configured via Socket.IO.");
		return null;
	}
}

/**
 * Send the push token to the backend for persistence.
 */
async function registerTokenWithServer(token: string): Promise<void> {
	try {
		await apiClient.post("/api/v1/push-tokens", {
			token,
			platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
		});
		console.log("[Push] Token registered with server successfully");
	} catch (e) {
		console.error("[Push] Failed to register token with server:", e);
	}
}

/**
 * Remove the push token from the backend (on sign-out).
 */
export async function unregisterPushToken(token: string | null): Promise<void> {
	if (!token) return;
	try {
		await apiClient.delete("/api/v1/push-tokens", {
			data: { token },
		});
		console.log("[Push] Token unregistered from server");
	} catch (e) {
		console.error("[Push] Failed to unregister token:", e);
	}
}

/**
 * Hook: call once inside the authenticated app shell.
 * - Prompts for push notification permissions when user opens the app
 * - Registers & stores the push token on the server
 * - Listens for incoming foreground notifications and tap responses
 */
export function usePushNotifications(userId: string | undefined) {
	const qc = useQueryClient();
	const tokenRef = useRef<string | null>(null);

	useEffect(() => {
		if (!userId) return;

		if (!Notifications || isExpoGo()) {
			console.log("[Push] Running in Expo Go — push notifications disabled");
			return;
		}

		let isMounted = true;

		// Request permission and register push token
		registerForPushNotificationsAsync().then((token) => {
			if (!isMounted || !token) return;
			tokenRef.current = token;
			registerTokenWithServer(token);
		});

		// Listener: notification received in foreground
		const receivedSub = Notifications!.addNotificationReceivedListener(
			(notification) => {
				console.log("[Push] Foreground notification received:", notification.request.content.title);
				qc.invalidateQueries();
			}
		);

		// Listener: notification tapped by user
		const responseSub = Notifications!.addNotificationResponseReceivedListener(
			(response) => {
				console.log("[Push] Notification tapped by user:", response.notification.request.content.title);
				qc.invalidateQueries();
			}
		);

		return () => {
			isMounted = false;
			receivedSub.remove();
			responseSub.remove();
		};
	}, [userId, qc]);

	return tokenRef;
}
