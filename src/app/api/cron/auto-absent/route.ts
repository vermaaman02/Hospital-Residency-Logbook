/**
 * @module Auto-Absent Cron API
 * @description API route to trigger auto-absent marking for students
 * who didn't mark attendance today. Designed to be called by an
 * external cron service (e.g., Railway cron, Vercel cron, or crontab).
 *
 * Protected by a CRON_SECRET environment variable.
 *
 * Usage:
 *   POST /api/cron/auto-absent
 *   Headers: { "Authorization": "Bearer <CRON_SECRET>" }
 *
 * @see actions/attendance.ts — runAutoAbsent()
 */

import { NextRequest, NextResponse } from "next/server";
import { runAutoAbsent } from "@/actions/attendance";

export async function POST(req: NextRequest) {
	try {
		// Verify cron secret
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret) {
			console.error("[AUTO_ABSENT_CRON] CRON_SECRET not configured");
			return NextResponse.json(
				{ error: "Cron not configured" },
				{ status: 500 },
			);
		}

		const authHeader = req.headers.get("authorization");
		const token = authHeader?.replace("Bearer ", "");

		if (token !== cronSecret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const result = await runAutoAbsent();

		return NextResponse.json({
			success: true,
			markedCount: result.markedCount,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[AUTO_ABSENT_CRON]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

// Also support GET for simple cron services that only send GET
export async function GET(req: NextRequest) {
	return POST(req);
}
