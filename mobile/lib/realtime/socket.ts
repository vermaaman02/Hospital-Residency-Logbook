/**
 * Socket.IO client for React Native.
 * Adapted from src/lib/socket.ts — replaces window.location.origin
 * with the env-configured socketUrl from app.json extra.
 */

import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { socketUrl?: string } | undefined;
const SOCKET_URL = extra?.socketUrl ?? "http://localhost:3000";

let socket: Socket | null = null;

export function getSocket(): Socket {
	if (!socket) {
		socket = io(SOCKET_URL, {
			transports: ["websocket"],
			autoConnect: false,
			reconnectionAttempts: 5,
			reconnectionDelay: 2000,
		});
	}
	return socket;
}

export function connectSocket(token: string) {
	const s = getSocket();
	s.auth = { token };
	s.connect();
}

export function disconnectSocket() {
	socket?.disconnect();
	socket = null;
}
