/**
 * React hook to subscribe to a Socket.IO event for the lifetime of the component.
 * Automatically reconnects when the auth token changes.
 */

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { getSocket, connectSocket, disconnectSocket } from "./socket";

export function useRealtimeEvent(event: string, handler: (...args: unknown[]) => void) {
	const { getToken, isSignedIn } = useAuth();

	useEffect(() => {
		if (!isSignedIn) return;

		let mounted = true;

		getToken().then((token) => {
			if (!mounted || !token) return;
			connectSocket(token);
			getSocket().on(event, handler);
		});

		return () => {
			mounted = false;
			getSocket().off(event, handler);
		};
	}, [event, handler, isSignedIn, getToken]);
}

export function useSocketConnection() {
	const { getToken, isSignedIn } = useAuth();

	useEffect(() => {
		if (!isSignedIn) {
			disconnectSocket();
			return;
		}

		getToken().then((token) => {
			if (token) connectSocket(token);
		});

		return () => {
			disconnectSocket();
		};
	}, [isSignedIn, getToken]);
}
