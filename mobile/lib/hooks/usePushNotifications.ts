/**
 * @module usePushNotifications
 * @description Registers for Expo push notifications, manages device token
 * registration with the backend, and handles incoming notifications.
 *
 * - Foreground: shows a native notification banner (no Alert.alert)
 * - Background/killed: native push notification in the notification tray
 * - Tap: invalidates queries to refresh data
 *
 * Gracefully degrades in Expo Go where push notifications are not supported
 * (SDK 53+). Full push functionality requires a development build.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Dynamically import expo-notifications to avoid crashes in Expo Go
let Notifications: typeof import("expo-notifications") | null = null;

try {
	Notifications = require("expo-notifications");
} catch (e) {
	console.warn("[Push] expo-notifications not available");
}

/**
 * Check if we're running inside Expo Go (where push notifications don't work).
 */
function isExpoGo(): boolean {
	return Constants.appOwnership === "expo";
}

/**
 * Configure how notifications are presented when the app is in the foreground.
 * Only runs if expo-notifications is available and NOT in Expo Go.
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
 * Request permission + get Expo push token.
 * Returns the token string or null if permissions are denied or unavailable.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
	if (!Notifications || isExpoGo()) {
		console.log("[Push] Skipping registration — Expo Go or notifications unavailable");
		return null;
	}

	// Set up Android notification channel
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "Default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#FF231F7C",
			sound: "default",
		});
	}

	// Check / request permissions
	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		console.warn("[Push] Permission not granted for push notifications");
		return null;
	}

	// Get the Expo push token
	const projectId =
		Constants?.expoConfig?.extra?.eas?.projectId ??
		Constants?.easConfig?.projectId;

	if (!projectId) {
		console.warn("[Push] No EAS projectId found — push tokens require an EAS project");
		return null;
	}

	try {
		const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
		console.log("[Push] Expo push token:", tokenData.data);
		return tokenData.data;
	} catch (e) {
		console.error("[Push] Failed to get push token:", e);
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
		console.log("[Push] Token registered with server");
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
 * - Registers for push notifications (skipped in Expo Go)
 * - Stores the token on the server
 * - Handles incoming notifications (foreground & tap)
 *
 * Returns a ref to the push token string (or null).
 */
export function usePushNotifications(userId: string | undefined) {
	const qc = useQueryClient();
	const tokenRef = useRef<string | null>(null);

	useEffect(() => {
		if (!userId) return;

		// Skip push notification setup entirely in Expo Go
		if (!Notifications || isExpoGo()) {
			console.log("[Push] Running in Expo Go — push notifications disabled");
			return;
		}

		let isMounted = true;

		// Register and store token
		registerForPushNotificationsAsync().then((token) => {
			if (!isMounted || !token) return;
			tokenRef.current = token;
			registerTokenWithServer(token);
		});

		// Listener: notification received while app is in foreground
		const receivedSub = Notifications!.addNotificationReceivedListener(
			(notification) => {
				console.log("[Push] Foreground notification:", notification.request.content.title);
				// Invalidate queries so screens refresh with new data
				qc.invalidateQueries();
			}
		);

		// Listener: user tapped on a notification
		const responseSub = Notifications!.addNotificationResponseReceivedListener(
			(response) => {
				console.log("[Push] Notification tapped:", response.notification.request.content.title);
				// Invalidate all queries to refresh data
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
