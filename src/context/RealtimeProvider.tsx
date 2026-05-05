/**
 * @module RealtimeProvider
 * @description Global React context that manages the Socket.IO connection.
 *
 * Responsibilities:
 * - Initialize socket connection ONCE on mount
 * - Join role-based + user-specific rooms
 * - Track connection status
 * - Provide the socket instance to the entire app
 * - Trigger router.refresh() on relevant events for data consistency
 *
 * Wrap the app in this provider at the dashboard layout level.
 */

"use client";

import {
	createContext,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { Socket } from "socket.io-client";
import { getSocket, destroySocket } from "@/lib/socket";

// ======================== TYPES ========================

export interface RealtimeContextValue {
	/** The Socket.IO client instance (null during SSR) */
	socket: Socket | null;
	/** Whether the socket is currently connected */
	isConnected: boolean;
	/** Timestamp of last received event */
	lastEventAt: number | null;
}

// ======================== CONTEXT ========================

export const RealtimeContext = createContext<RealtimeContextValue>({
	socket: null,
	isConnected: false,
	lastEventAt: null,
});

// ======================== EVENTS THAT TRIGGER REFRESH ========================

/**
 * Events that should trigger a Next.js router.refresh() to re-fetch
 * server components with fresh data. This is the primary data consistency
 * mechanism — we don't try to patch client state manually.
 */
const REFRESH_EVENTS = [
	"entry:created",
	"entry:updated",
	"entry:signed",
	"entry:rejected",
	"entry:bulk-signed",
	"assessment:created",
	"assessment:updated",
	"assessment:evaluated",
	"assessment:submitted",
	"user:updated",
	"user:created",
	"batch:updated",
	"system:updated",
	"review:counts",
	"attendance:updated",
	"rotation:updated",
];

// ======================== PROVIDER ========================

interface RealtimeProviderProps {
	children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
	const router = useRouter();
	const { user, isSignedIn } = useUser();
	const [isConnected, setIsConnected] = useState(false);
	const [lastEventAt, setLastEventAt] = useState<number | null>(null);
	const socketRef = useRef<Socket | null>(null);
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Throttled refresh — if many events arrive in quick succession,
	// we only refresh once after a 500ms quiet period
	const scheduleRefresh = useCallback(() => {
		if (refreshTimerRef.current) {
			clearTimeout(refreshTimerRef.current);
		}
		refreshTimerRef.current = setTimeout(() => {
			router.refresh();
		}, 500);
	}, [router]);

	useEffect(() => {
		// Only connect when the user is signed in
		if (!isSignedIn) return;

		const socket = getSocket();
		socketRef.current = socket;

		// ── Connection lifecycle ──────────────────────────────────
		const onConnect = () => {
			setIsConnected(true);
			console.log("[Realtime] Connected:", socket.id);

			// Join role room based on Clerk metadata
			const role = (user?.publicMetadata?.role as string) || "student";
			socket.emit("join:role", role);

			// Join user-specific room
			if (user?.id) {
				socket.emit("join:user", user.id);
			}
		};

		const onDisconnect = (reason: string) => {
			setIsConnected(false);
			console.log("[Realtime] Disconnected:", reason);
		};

		const onConnectError = (err: Error) => {
			console.warn("[Realtime] Connection error:", err.message);
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("connect_error", onConnectError);

		// ── Listen to all refresh-triggering events ───────────────
		const onRefreshEvent = (data: unknown) => {
			setLastEventAt(Date.now());
			scheduleRefresh();
		};

		for (const event of REFRESH_EVENTS) {
			socket.on(event, onRefreshEvent);
		}

		// Connect!
		if (!socket.connected) {
			socket.connect();
		}

		// ── Cleanup ──────────────────────────────────────────────
		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connect_error", onConnectError);

			for (const event of REFRESH_EVENTS) {
				socket.off(event, onRefreshEvent);
			}

			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}

			destroySocket();
			socketRef.current = null;
		};
	}, [isSignedIn, user?.id, user?.publicMetadata?.role, scheduleRefresh]);

	return (
		<RealtimeContext.Provider
			value={{
				socket: socketRef.current,
				isConnected,
				lastEventAt,
			}}
		>
			{children}
		</RealtimeContext.Provider>
	);
}
