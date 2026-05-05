/**
 * @module useRealtime
 * @description Hook to access the global RealtimeContext.
 * Returns the socket instance, connection status, and last event timestamp.
 *
 * @example
 *   const { isConnected, lastEventAt } = useRealtime();
 */

"use client";

import { useContext } from "react";
import { RealtimeContext, type RealtimeContextValue } from "@/context/RealtimeProvider";

export function useRealtime(): RealtimeContextValue {
	const context = useContext(RealtimeContext);
	if (!context) {
		throw new Error("useRealtime must be used within a <RealtimeProvider>");
	}
	return context;
}
