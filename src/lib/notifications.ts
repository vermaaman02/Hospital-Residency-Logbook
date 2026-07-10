import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/realtime-emit";

const VAPID_PUBLIC = process.env.WEB_PUSH_VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.WEB_PUSH_VAPID_PRIVATE;
const VAPID_SUBJECT =
	process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
	console.warn(
		"[web-push] VAPID keys not configured. Server push will fail until keys are provided.",
	);
}

export async function saveSubscription(userId: string, subscription: any) {
	const keys = subscription.keys || {};
	const endpoint = subscription.endpoint;
	if (!endpoint) throw new Error("Invalid subscription: missing endpoint");
	// Upsert: if endpoint exists, do nothing
	await prisma.notificationSubscription.upsert({
		where: { endpoint },
		update: { userId, p256dh: keys.p256dh ?? "", auth: keys.auth ?? "" },
		create: {
			userId,
			endpoint,
			p256dh: keys.p256dh ?? "",
			auth: keys.auth ?? "",
		},
	});
}

export async function removeSubscription(userId: string, endpoint: string) {
	await prisma.notificationSubscription.deleteMany({
		where: { userId, endpoint },
	});
}

export async function getSubscriptions(userId: string) {
	return await prisma.notificationSubscription.findMany({ where: { userId } });
}

export async function sendPushToSubscription(
	subscription: { endpoint: string; p256dh: string; auth: string },
	payload: Record<string, any>,
) {
	if (!VAPID_PUBLIC || !VAPID_PRIVATE)
		throw new Error("VAPID keys not configured");
	const pushSubscription = {
		endpoint: subscription.endpoint,
		keys: { p256dh: subscription.p256dh, auth: subscription.auth },
	};
	const payloadStr = JSON.stringify(payload);
	try {
		await webpush.sendNotification(pushSubscription as any, payloadStr);
		return { ok: true };
	} catch (e) {
		console.error("[web-push] send error", e);
		return { ok: false, error: String(e) };
	}
}

export async function sendNotificationToUser(
	userId: string,
	payload: Record<string, any>,
) {
	const subs = await getSubscriptions(userId);
	const results = [];
	for (const s of subs) {
		// eslint-disable-next-line no-await-in-loop
		const r = await sendPushToSubscription(
			{ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
			payload,
		);
		results.push({ endpoint: s.endpoint, result: r });
	}
	return results;
}

export async function sendNotificationToAllSubscribedUsers(
	payload: Record<string, any>,
) {
	const subs = await prisma.notificationSubscription.findMany();
	const results = [];
	for (const s of subs) {
		// eslint-disable-next-line no-await-in-loop
		const r = await sendPushToSubscription(
			{ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
			payload,
		);
		results.push({ endpoint: s.endpoint, userId: s.userId, result: r });
	}
	return results;
}

/**
 * Sends a real-time notification to a student user:
 * 1. Broadcasts to user's Socket.io room (foreground real-time updates)
 * 2. Delivers Expo Push Notification (background alert messages)
 */
export async function sendRealtimeNotification(
	userId: string,
	title: string,
	body: string,
	data?: Record<string, any>
) {
	try {
		// 1. Send via WebSocket for live in-app updates
		await emitToUser(userId, "notification:received", { title, body, data });

		// 2. Query Expo mobile push tokens
		const pushTokens = await prisma.mobilePushToken.findMany({
			where: { userId },
			select: { token: true },
		});

		if (pushTokens.length > 0) {
			const messages = pushTokens.map((t) => ({
				to: t.token,
				sound: "default",
				title,
				body,
				data,
			}));

			// Deliver to Expo push notification server
			const res = await fetch("https://exp.host/--/api/v2/push/send", {
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Accept-Encoding": "gzip, deflate",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messages),
				signal: AbortSignal.timeout(5000),
			});

			if (!res.ok) {
				console.warn(`[Expo Push] Dispatch failed with code ${res.status}`);
			}
		}
	} catch (e) {
		console.error("[Realtime Notification] Failed to deliver", e);
	}
}
