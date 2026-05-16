/**
 * Registers the device's Expo push token with the backend via POST /api/v1/push-tokens.
 * Called once after sign-in inside the (app) layout.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiClient } from "@/lib/api/client";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

export async function registerPushToken(): Promise<void> {
	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		return;
	}

	const tokenData = await Notifications.getExpoPushTokenAsync();
	const token = tokenData.data;
	const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";

	try {
		await apiClient.post("/api/v1/push-tokens", { token, platform });
	} catch {
		// Non-fatal — push will still work, just not registered server-side
	}
}
