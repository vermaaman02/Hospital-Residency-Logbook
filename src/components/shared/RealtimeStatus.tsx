/**
 * @module RealtimeStatus
 * @description Tiny indicator dot showing realtime connection status.
 * Green = connected, amber = connecting/reconnecting, hidden when connected for 3s.
 *
 * Place this in the TopBar or footer.
 */

"use client";

import { useRealtime } from "@/hooks/useRealtime";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function RealtimeStatus() {
	const { isConnected } = useRealtime();

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 text-xs transition-opacity",
				isConnected ? "text-emerald-600" : "text-amber-500",
			)}
			title={isConnected ? "Live — realtime updates active" : "Connecting to realtime server…"}
		>
			{isConnected ? (
				<>
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
					</span>
					<span className="hidden sm:inline">Live</span>
				</>
			) : (
				<>
					<WifiOff className="h-3 w-3" />
					<span className="hidden sm:inline">Connecting…</span>
				</>
			)}
		</div>
	);
}
