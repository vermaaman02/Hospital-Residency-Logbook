/**
 * @module socket
 * @description Client-side Socket.IO singleton.
 * Ensures only ONE socket connection exists per browser tab,
 * even if multiple components import this module.
 *
 * The socket connects to the SAME origin (since Socket.IO
 * is embedded in the custom server on the same port).
 */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Get or create the singleton Socket.IO client connection.
 * Safe to call multiple times — returns the same instance.
 */
export function getSocket(): Socket {
	if (socket) return socket;

	// Connect to same origin — Socket.IO runs on the same port as Next.js
	const url =
		process.env.NEXT_PUBLIC_SOCKET_URL ||
		(typeof window !== "undefined" ? window.location.origin : "");

	socket = io(url, {
		// Performance: prefer WebSocket, fall back to polling
		transports: ["websocket", "polling"],
		// Don't auto-connect — we connect in the RealtimeProvider
		autoConnect: false,
		// Reconnection settings
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 10000,
		// Timeout
		timeout: 20000,
	});

	return socket;
}

/**
 * Disconnect and destroy the socket instance.
 * Used for cleanup when the app unmounts.
 */
export function destroySocket(): void {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}

import { useEffect } from "react";

/**
 * Hook to listen to a specific socket event.
 */
export function useSocketEvent(event: string, callback: (...args: any[]) => void) {
	useEffect(() => {
		const s = getSocket();
		s.on(event, callback);
		return () => {
			s.off(event, callback);
		};
	}, [event, callback]);
}
