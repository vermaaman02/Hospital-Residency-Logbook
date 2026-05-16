/**
 * Shared response helpers for /api/v1/* REST routes.
 * Normalises error handling so all handlers have a consistent shape.
 */

import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
	return NextResponse.json({ ok: true, data }, { status });
}

export function err(message: string, status: number) {
	return NextResponse.json({ ok: false, error: message }, { status });
}

export function handleError(error: unknown) {
	if (error instanceof Error) {
		if (error.message === "Unauthorized") return err("Unauthorized", 401);
		if (error.message === "Forbidden") return err("Forbidden", 403);
		return err(error.message, 400);
	}
	console.error("[API_V1]", error);
	return err("Internal Server Error", 500);
}
