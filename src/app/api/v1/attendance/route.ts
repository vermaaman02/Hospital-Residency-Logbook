/**
 * GET  /api/v1/attendance          — list current student's attendance sheets
 * POST /api/v1/attendance          — mark daily attendance (student)
 * POST /api/v1/attendance/submit   — submit a sheet for review
 * POST /api/v1/attendance/retract  — retract a submitted sheet
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import { markDailyAttendance, getMyAttendanceSheets, submitAttendanceSheet, retractAttendanceSheet, getMyAttendanceConfig, getMyAttendanceAnalytics } from "@/actions/attendance";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const view = url.searchParams.get("view");

		if (view === "config") {
			const config = await getMyAttendanceConfig();
			return ok(config);
		}

		if (view === "analytics") {
			const analytics = await getMyAttendanceAnalytics();
			return ok(analytics);
		}

		const sheets = await getMyAttendanceSheets();
		return ok(sheets);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const action = body?.action as string | undefined;

		if (action === "submit") {
			const { sheetId } = body;
			if (!sheetId) return err("sheetId is required", 400);
			const result = await submitAttendanceSheet(sheetId);
			return ok(result);
		}

		if (action === "retract") {
			const { sheetId } = body;
			if (!sheetId) return err("sheetId is required", 400);
			const result = await retractAttendanceSheet(sheetId);
			return ok(result);
		}

		// Default: mark daily attendance
		const { date, presentAbsent, hodName, postedDepartment, latitude, longitude } = body;
		if (!date || !presentAbsent) {
			return err("date and presentAbsent are required", 400);
		}

		const result = await markDailyAttendance({
			date: new Date(date),
			presentAbsent,
			hodName,
			postedDepartment,
			latitude: latitude ?? null,
			longitude: longitude ?? null,
		});
		return ok(result, 201);
	} catch (e) {
		return handleError(e);
	}
}
