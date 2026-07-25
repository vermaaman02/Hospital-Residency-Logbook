/**
 * GET  /api/v1/attendance — fetch attendance entries, analytics, holidays, or config
 * POST /api/v1/attendance — mark, update, delete, submit, or retract attendance entries
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	markDailyAttendance,
	updateDailyEntry,
	deleteDailyEntry,
	submitDailyEntry,
	submitMultipleDailyEntries,
	retractDailyEntry,
	getMyAttendanceSheets,
	submitAttendanceSheet,
	retractAttendanceSheet,
	getMyAttendanceConfig,
	getMyAttendanceAnalytics,
	getMyHolidays,
} from "@/actions/attendance";

export async function GET(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();
		const user = await prisma.user.findFirst({
			where: { OR: [{ clerkId }, { id: clerkId }] },
		});
		if (!user) return err("User not found", 404);

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

		if (view === "holidays") {
			const holidays = await getMyHolidays();
			return ok(holidays);
		}

		if (view === "faculty") {
			const faculty = await prisma.user.findMany({
				where: {
					role: { in: ["HOD", "FACULTY"] },
					status: "ACTIVE",
				},
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
				},
				orderBy: {
					firstName: "asc",
				},
			});
			return ok(faculty);
		}

		// Fetch all daily entries for the student
		const entries = await prisma.attendanceEntry.findMany({
			where: { attendanceSheet: { userId: user.id } },
			include: {
				attendanceSheet: {
					select: {
						id: true,
						postedDepartment: true,
						batch: true,
						weekStartDate: true,
					},
				},
			},
			orderBy: { date: "desc" },
		});

		return ok(entries);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const action = body?.action as string | undefined;

		if (action === "update") {
			const { entryId, presentAbsent, hodName } = body;
			if (!entryId) return err("entryId is required", 400);
			const result = await updateDailyEntry(entryId, { presentAbsent, hodName });
			return ok(result);
		}

		if (action === "delete") {
			const { entryId } = body;
			if (!entryId) return err("entryId is required", 400);
			const result = await deleteDailyEntry(entryId);
			return ok(result);
		}

		if (action === "submit") {
			const { entryId, sheetId } = body;
			if (entryId) {
				const result = await submitDailyEntry(entryId);
				return ok(result);
			}
			if (sheetId) {
				const result = await submitAttendanceSheet(sheetId);
				return ok(result);
			}
			return err("entryId or sheetId is required", 400);
		}

		if (action === "submitMultiple") {
			const { entryIds } = body;
			if (!Array.isArray(entryIds)) return err("entryIds array is required", 400);
			const result = await submitMultipleDailyEntries(entryIds);
			return ok(result);
		}

		if (action === "retract") {
			const { entryId, sheetId } = body;
			if (entryId) {
				const result = await retractDailyEntry(entryId);
				return ok(result);
			}
			if (sheetId) {
				const result = await retractAttendanceSheet(sheetId);
				return ok(result);
			}
			return err("entryId or sheetId is required", 400);
		}

		// Default: mark daily attendance
		const { date, presentAbsent, hodName, postedDepartment, latitude, longitude } = body;
		if (!date || !presentAbsent) {
			return err("date and presentAbsent are required", 400);
		}

		const result = await markDailyAttendance({
			date: new Date(date),
			presentAbsent,
			hodName: hodName || undefined,
			postedDepartment: postedDepartment || undefined,
			latitude: typeof latitude === "number" ? latitude : undefined,
			longitude: typeof longitude === "number" ? longitude : undefined,
		});
		return ok(result, 201);
	} catch (e) {
		return handleError(e);
	}
}
