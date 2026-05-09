"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationContextValue {
	isSupported: boolean;
	permission: NotificationPermission | null;
	isSubscribed: boolean;
	subscribe: () => Promise<void>;
	unsubscribe: () => Promise<void>;
	sendLocalNotification: (title: string, body?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
	null,
);

export function useNotifications() {
	const ctx = useContext(NotificationContext);
	return ctx; // may be null if provider is not mounted
}

// utility to convert base64 VAPID key to UInt8Array
function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const isSupported =
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window;
	const [permission, setPermission] = useState<NotificationPermission | null>(
		typeof window !== "undefined" && "Notification" in window ?
			Notification.permission
		:	null,
	);
	const [isSubscribed, setIsSubscribed] = useState(false);

	useEffect(() => {
		if (!isSupported) return;
		// check current subscription
		navigator.serviceWorker.getRegistration().then((reg) => {
			if (!reg) return setIsSubscribed(false);
			reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub));
		});
	}, [isSupported]);

	const registerSW = useCallback(async () => {
		if (!isSupported) throw new Error("Push not supported");
		try {
			const reg = await navigator.serviceWorker.register("/sw.js");
			return reg;
		} catch (e) {
			console.error("SW registration failed", e);
			throw e;
		}
	}, [isSupported]);

	const subscribe = useCallback(async () => {
		if (!isSupported) {
			toast.error("Push not supported in this browser");
			return;
		}

		if (
			typeof Notification !== "undefined" &&
			Notification.permission === "denied"
		) {
			toast.error(
				"Notifications are blocked. Please enable them in your browser settings.",
			);
			return;
		}

		if (
			typeof Notification !== "undefined" &&
			Notification.permission !== "granted"
		) {
			const p = await Notification.requestPermission();
			setPermission(p);
			if (p !== "granted") return;
		}

		const reg = await registerSW();
		if (!reg) return;

		let sub = await reg.pushManager.getSubscription();
		if (!sub) {
			try {
				// Fetch VAPID public key from server
				const r = await fetch("/api/notifications/publicKey");
				const json = await r.json();
				const vapidKey = json?.publicKey;
				const applicationServerKey =
					vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined;
				sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey,
				});
			} catch (e) {
				console.error("subscribe failed", e);
			}
		}

		if (sub) {
			try {
				await fetch("/api/notifications/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ subscription: sub }),
				});
				setIsSubscribed(true);
				toast.success("Subscribed to notifications");
			} catch (e) {
				console.error(e);
				toast.error("Failed to save subscription");
			}
		} else {
			toast.error("Could not obtain subscription from browser");
		}
	}, [isSupported, registerSW]);

	const unsubscribe = useCallback(async () => {
		try {
			const reg = await navigator.serviceWorker.getRegistration();
			const sub = reg ? await reg.pushManager.getSubscription() : null;
			if (sub) {
				const endpoint = sub.endpoint;
				await sub.unsubscribe();
				await fetch("/api/notifications/unsubscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ endpoint }),
				});
			}
			setIsSubscribed(false);
			toast("Unsubscribed from notifications");
		} catch (e) {
			console.error(e);
			toast.error("Failed to unsubscribe");
		}
	}, []);

	const sendLocalNotification = useCallback(
		(title: string, body?: string) => {
			if (!isSupported) return;
			navigator.serviceWorker.getRegistration().then((reg) => {
				if (!reg || !reg.active) {
					try {
						new Notification(title, {
							body,
							icon: "/AIIMS%20patna%20icon.jpeg",
						});
					} catch (e) {
						console.error("notification error", e);
					}
					return;
				}
				reg.active.postMessage({
					type: "SHOW_NOTIFICATION",
					payload: { title, body },
				});
			});
		},
		[isSupported],
	);

	// utility to convert base64 VAPID key to UInt8Array
	// (moved to top-level)

	const value = useMemo(
		() => ({
			isSupported,
			permission,
			isSubscribed,
			subscribe,
			unsubscribe,
			sendLocalNotification,
		}),
		[
			isSupported,
			permission,
			isSubscribed,
			subscribe,
			unsubscribe,
			sendLocalNotification,
		],
	);

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
};

export function DemoNotificationButton({
	title = "Test notification",
	body = "This is a demo notification",
}: {
	title?: string;
	body?: string;
}) {
	const ctx = useNotifications();
	const isSubscribed = ctx?.isSubscribed ?? false;
	const sendLocalNotification = ctx?.sendLocalNotification ?? (() => {});
	return (
		<Button
			onClick={() => {
				if (!isSubscribed) {
					sendLocalNotification(title, body);
				} else {
					fetch("/api/notifications/demo", { method: "POST" })
						.then(() => sendLocalNotification(title, body))
						.catch(() => sendLocalNotification(title, body));
				}
			}}
		>
			Send Demo Notification
		</Button>
	);
}
