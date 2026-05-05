/**
 * @module useSocketEvent
 * @description Hook to subscribe to a specific Socket.IO event.
 * Automatically cleans up the listener when the component unmounts
 * or when the event/handler changes.
 *
 * @example
 *   useSocketEvent("entry:signed", (data) => {
 *     console.log("Entry signed:", data);
 *     toast.success("An entry was just signed!");
 *   });
 */

"use client";

import { useEffect, useRef } from "react";
import { useRealtime } from "./useRealtime";

export function useSocketEvent<T = unknown>(
	event: string,
	handler: (data: T) => void,
) {
	const { socket } = useRealtime();
	// Use a ref so we always call the latest handler without re-subscribing
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		if (!socket) return;

		const listener = (data: T) => {
			handlerRef.current(data);
		};

		socket.on(event, listener);

		return () => {
			socket.off(event, listener);
		};
	}, [socket, event]);
}
