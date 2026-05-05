/**
 * @module realtime-emit
 * @description Server-side helper to emit Socket.IO events from server actions.
 * Calls the internal HTTP endpoint on the custom server to broadcast events.
 *
 * This keeps socket.io OUT of server actions entirely — the custom server
 * handles all WebSocket logic. Server actions just make a local HTTP POST.
 *
 * @example
 *   import { emitRealtimeEvent } from "@/lib/realtime-emit";
 *   await emitRealtimeEvent("entry:signed", { entryId: "abc", module: "procedures" });
 */

"use server";

const INTERNAL_EMIT_URL =
	process.env.INTERNAL_EMIT_URL ||
	(process.env.NODE_ENV === "production"
		? `http://${process.env.RAILWAY_PRIVATE_DOMAIN}:${process.env.PORT || 8080}/_internal/emit`
		: "http://localhost:3000/_internal/emit");

/**
 * Emit a realtime event to all connected clients.
 * Fire-and-forget — errors are logged but never thrown to avoid
 * breaking the server action that called this.
 */
export async function emitRealtimeEvent(
	event: string,
	data?: Record<string, unknown>,
) {
	try {
		const res = await fetch(INTERNAL_EMIT_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ event, data: { ...data, timestamp: Date.now() } }),
			// Short timeout — this is a localhost call
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) {
			console.warn(`[Realtime] Emit failed (${res.status}): ${event}`);
		}
	} catch (err) {
		// Swallow errors — realtime is best-effort, never block mutations
		console.warn(`[Realtime] Emit error for ${event}:`, err);
	}
}

/**
 * Emit a realtime event to a specific role room.
 */
export async function emitToRole(
	role: "student" | "faculty" | "hod",
	event: string,
	data?: Record<string, unknown>,
) {
	return emitRealtimeEvent(event, { ...data, _targetRole: role });
}
