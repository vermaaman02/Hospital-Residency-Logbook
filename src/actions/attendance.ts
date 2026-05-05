/**
 * @module Attendance Actions
 * @description Server actions for the complete attendance system.
 * - HOD: configure batch attendance settings, holidays, calendar, review all
 * - Faculty: approve/reject submitted attendance for assigned batches
 * - Student: mark daily attendance, view history & analytics
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 * @see prisma/schema.prisma — AttendanceSheet, AttendanceEntry, AttendanceConfig, AttendanceHoliday
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	attendanceSheetSchema,
	type AttendanceSheetInput,
	dailyAttendanceSchema,
	type DailyAttendanceInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "@/actions/auto-review";

const DAYS_OF_WEEK = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

/** Resolve the DB user from Clerk userId */
async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

async function assertNoOverlappingSheet(
	userId: string,
	weekStartDate: Date,
	weekEndDate: Date,
	excludeId?: string,
) {
	const existing = await prisma.attendanceSheet.findFirst({
		where: {
			userId,
			...(excludeId ? { id: { not: excludeId } } : {}),
			weekStartDate: { lte: weekEndDate },
			weekEndDate: { gte: weekStartDate },
		},
		select: { id: true },
	});
	if (existing) {
		throw new Error("Attendance already exists for these dates");
	}
}

// ======================== HOD: ATTENDANCE CONFIG ========================

export async function getAttendanceConfig(batchId: string) {
	await requireRole(["hod"]);
	return prisma.attendanceConfig.findUnique({ where: { batchId } });
}

export async function getAllAttendanceConfigs() {
	await requireRole(["hod"]);
	return prisma.attendanceConfig.findMany({
		include: { batch: { select: { id: true, name: true, isActive: true } } },
		orderBy: { createdAt: "desc" },
	});
}

export async function upsertAttendanceConfig(data: {
	batchId: string;
	batchStartDate: Date;
	batchEndDate: Date;
	classStartTime: string;
	classEndTime: string;
	locationEnabled: boolean;
	locationLatitude?: number | null;
	locationLongitude?: number | null;
	locationRadiusMeters?: number | null;
	weeklyOffDays: string[];
	minimumAttendancePct: number;
	manualAttendanceEnabled?: boolean;
	faceRecognitionEnabled?: boolean;
}) {
	await requireRole(["hod"]);

	const config = await prisma.attendanceConfig.upsert({
		where: { batchId: data.batchId },
		create: {
			batchId: data.batchId,
			batchStartDate: data.batchStartDate,
			batchEndDate: data.batchEndDate,
			classStartTime: data.classStartTime,
			classEndTime: data.classEndTime,
			locationEnabled: data.locationEnabled,
			locationLatitude: data.locationLatitude ?? null,
			locationLongitude: data.locationLongitude ?? null,
			locationRadiusMeters: data.locationRadiusMeters ?? 500,
			weeklyOffDays: data.weeklyOffDays,
			minimumAttendancePct: data.minimumAttendancePct,
			manualAttendanceEnabled: data.manualAttendanceEnabled ?? true,
			faceRecognitionEnabled: data.faceRecognitionEnabled ?? false,
		},
		update: {
			batchStartDate: data.batchStartDate,
			batchEndDate: data.batchEndDate,
			classStartTime: data.classStartTime,
			classEndTime: data.classEndTime,
			locationEnabled: data.locationEnabled,
			locationLatitude: data.locationLatitude ?? null,
			locationLongitude: data.locationLongitude ?? null,
			locationRadiusMeters: data.locationRadiusMeters ?? 500,
			weeklyOffDays: data.weeklyOffDays,
			minimumAttendancePct: data.minimumAttendancePct,
			manualAttendanceEnabled: data.manualAttendanceEnabled ?? true,
			faceRecognitionEnabled: data.faceRecognitionEnabled ?? false,
		},
	});

	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, data: config };
}

// ======================== HOD: HOLIDAY CALENDAR ========================

export async function getHolidays(batchId?: string) {
	const { role } = await requireRole(["hod", "faculty", "student"]);
	if (role === "student") {
		const clerkId = await requireAuth();
		const user = await resolveUser(clerkId);
		return prisma.attendanceHoliday.findMany({
			where:
				user.batchId ?
					{ OR: [{ batchId: null }, { batchId: user.batchId }] }
				:	{ batchId: null },
			orderBy: { date: "asc" },
			include: { batch: { select: { name: true } } },
		});
	}
	return prisma.attendanceHoliday.findMany({
		where: batchId ? { OR: [{ batchId: null }, { batchId }] } : {},
		orderBy: { date: "asc" },
		include: { batch: { select: { name: true } } },
	});
}

export async function addHoliday(data: {
	date: Date;
	name: string;
	batchId?: string | null;
}) {
	await requireRole(["hod"]);
	const holiday = await prisma.attendanceHoliday.create({
		data: { date: data.date, name: data.name, batchId: data.batchId ?? null },
	});
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, data: holiday };
}

export async function removeHoliday(holidayId: string) {
	await requireRole(["hod"]);
	await prisma.attendanceHoliday.delete({ where: { id: holidayId } });
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function toggleHoliday(data: {
	date: Date;
	name: string;
	batchId?: string | null;
}) {
	await requireRole(["hod"]);
	const existing = await prisma.attendanceHoliday.findFirst({
		where: { date: data.date, batchId: data.batchId ?? null },
	});
	if (existing) {
		await prisma.attendanceHoliday.delete({ where: { id: existing.id } });
		revalidatePath("/dashboard/hod/attendance");
		emitRealtimeEvent("entry:updated");
	return { success: true, action: "removed" as const };
	}
	const holiday = await prisma.attendanceHoliday.create({
		data: { date: data.date, name: data.name, batchId: data.batchId ?? null },
	});
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, action: "added" as const, data: holiday };
}

// ======================== STUDENT: CONFIG & HOLIDAYS ========================

export async function getMyAttendanceConfig() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	if (!user.batchId) return null;
	return prisma.attendanceConfig.findUnique({
		where: { batchId: user.batchId },
	});
}

export async function getMyHolidays() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	return prisma.attendanceHoliday.findMany({
		where:
			user.batchId ?
				{ OR: [{ batchId: null }, { batchId: user.batchId }] }
			:	{ batchId: null },
		orderBy: { date: "asc" },
	});
}

// ======================== STUDENT: DAILY ATTENDANCE ========================

const JS_DAY_TO_PRISMA = [
	"SUNDAY",
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
] as const;

/** Haversine distance in metres between two lat/lng points */
function getDistanceInMeters(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371e3; // Earth radius in metres
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Mark attendance for a single day (student-facing).
 *
 * Validations enforced:
 *  - Students can only mark TODAY (not past, not future)
 *  - Students can only choose "Present" or "Leave" (Absent is auto-triggered)
 *  - Date must fall within the batch's active period
 *  - Date must not be a holiday
 *  - Date must not be a weekly off day
 *  - Optionally checks class time window
 *  - Optionally checks geolocation within campus radius
 */
export async function markDailyAttendance(data: DailyAttendanceInput) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const validated = dailyAttendanceSchema.parse(data);

	// ===== Normalise dates for comparison =====
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const markDate = new Date(validated.date);
	markDate.setHours(0, 0, 0, 0);

	// ===== VALIDATION: Students can only mark TODAY =====
	if (markDate.getTime() !== todayStart.getTime()) {
		throw new Error(
			"You can only mark attendance for today. Past and future dates are not allowed.",
		);
	}

	// ===== VALIDATION: Only "Present" or "Leave" for students =====
	if (
		validated.presentAbsent !== "Present" &&
		validated.presentAbsent !== "Leave"
	) {
		throw new Error(
			'Students can only mark "Present" or "Leave". Absent is triggered automatically.',
		);
	}

	// ===== Load config & holidays in parallel =====
	const [config, holidayCheck] = await Promise.all([
		user.batchId ?
			prisma.attendanceConfig.findUnique({
				where: { batchId: user.batchId },
			})
		:	Promise.resolve(null),
		prisma.attendanceHoliday.findFirst({
			where: {
				date: todayStart,
				...(user.batchId ?
					{ OR: [{ batchId: null }, { batchId: user.batchId }] }
				:	{ batchId: null }),
			},
		}),
	]);

	// ===== VALIDATION: Check if today is a holiday =====
	if (holidayCheck) {
		throw new Error(
			`Cannot mark attendance — today is a holiday (${holidayCheck.name})`,
		);
	}

	// ===== VALIDATION: Check batch date range =====
	if (config) {
		const batchStart = new Date(config.batchStartDate);
		batchStart.setHours(0, 0, 0, 0);
		const batchEnd = new Date(config.batchEndDate);
		batchEnd.setHours(23, 59, 59, 999);
		if (markDate < batchStart || markDate > batchEnd) {
			throw new Error(
				"Today is outside your batch's active attendance period.",
			);
		}
	}

	// ===== VALIDATION: Check weekly off day =====
	if (config?.weeklyOffDays?.length) {
		const dayName = JS_DAY_TO_PRISMA[validated.date.getDay()];
		if (config.weeklyOffDays.includes(dayName)) {
			throw new Error(
				`Cannot mark attendance — ${dayName.charAt(0) + dayName.slice(1).toLowerCase()} is a weekly off day.`,
			);
		}
	}

	// ===== VALIDATION: Check class time window =====
	if (config?.classStartTime && config?.classEndTime) {
		const [startH, startM] = config.classStartTime.split(":").map(Number);
		const [endH, endM] = config.classEndTime.split(":").map(Number);
		const currentMinutes = now.getHours() * 60 + now.getMinutes();
		const startMinutes = startH * 60 + startM;
		const endMinutes = endH * 60 + endM;
		if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
			throw new Error(
				`Attendance can only be marked between ${config.classStartTime} and ${config.classEndTime}`,
			);
		}
	}

	// ===== VALIDATION: Check geolocation =====
	let withinLocation: boolean | null = null;
	if (
		config?.locationEnabled &&
		config.locationLatitude != null &&
		config.locationLongitude != null
	) {
		if (validated.latitude != null && validated.longitude != null) {
			const dist = getDistanceInMeters(
				validated.latitude,
				validated.longitude,
				config.locationLatitude,
				config.locationLongitude,
			);
			withinLocation = dist <= (config.locationRadiusMeters ?? 500);
			if (!withinLocation) {
				throw new Error(
					`You are too far from the campus (${Math.round(dist)}m away). Attendance marking requires you to be within ${config.locationRadiusMeters ?? 500}m.`,
				);
			}
		}
		// If location is required but not provided, we allow but note it
	}

	// ===== Create / update entry =====
	// Calculate week boundaries (Monday–Sunday) — sheet is just a container
	const jsDay = validated.date.getDay(); // 0=Sun
	const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
	const weekStart = new Date(validated.date);
	weekStart.setDate(weekStart.getDate() + mondayOffset);
	weekStart.setHours(0, 0, 0, 0);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);

	// Find or create weekly sheet (as container only)
	let sheet = await prisma.attendanceSheet.findFirst({
		where: {
			userId: user.id,
			weekStartDate: { gte: weekStart, lte: weekStart },
		},
		include: { entries: true },
	});

	if (!sheet) {
		sheet = await prisma.attendanceSheet.create({
			data: {
				userId: user.id,
				weekStartDate: weekStart,
				weekEndDate: weekEnd,
				batch: user.batch,
				postedDepartment: validated.postedDepartment,
				status: "DRAFT",
			},
			include: { entries: true },
		});
	}

	// Update department on sheet if provided
	if (
		validated.postedDepartment &&
		validated.postedDepartment !== sheet.postedDepartment
	) {
		await prisma.attendanceSheet.update({
			where: { id: sheet.id },
			data: { postedDepartment: validated.postedDepartment },
		});
	}

	const dayName = JS_DAY_TO_PRISMA[validated.date.getDay()];
	const existing = sheet.entries.find((e) => e.day === dayName);

	if (existing) {
		if (existing.status === "SIGNED") {
			throw new Error("This day is already signed and cannot be modified");
		}
		if (existing.status === "SUBMITTED") {
			throw new Error(
				"This day is submitted for review. Retract it first to make changes.",
			);
		}
		await prisma.attendanceEntry.update({
			where: { id: existing.id },
			data: {
				date: validated.date,
				presentAbsent: validated.presentAbsent,
				hodName: validated.hodName || null,
				markedAt: new Date(),
				latitude: validated.latitude ?? null,
				longitude: validated.longitude ?? null,
				withinLocation,
				status: "DRAFT",
			},
		});
	} else {
		await prisma.attendanceEntry.create({
			data: {
				attendanceSheetId: sheet.id,
				day: dayName as never,
				date: validated.date,
				presentAbsent: validated.presentAbsent,
				hodName: validated.hodName || null,
				markedAt: new Date(),
				latitude: validated.latitude ?? null,
				longitude: validated.longitude ?? null,
				withinLocation,
			},
		});
	}

	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/**
 * HOD/Faculty: Mark attendance on behalf of a student.
 * Can mark any date within the student's batch date range.
 * Can set any status including "Absent" and "Holiday".
 */
export async function markAttendanceForStudent(data: {
	studentId: string;
	date: Date;
	presentAbsent: "Present" | "Absent" | "Leave" | "Holiday";
	hodName?: string;
	postedDepartment?: string;
	remark?: string;
}) {
	await requireRole(["hod", "faculty"]);

	const student = await prisma.user.findUnique({
		where: { id: data.studentId },
		select: { id: true, batch: true, batchId: true },
	});
	if (!student) throw new Error("Student not found");

	// Validate date within batch range
	if (student.batchId) {
		const config = await prisma.attendanceConfig.findUnique({
			where: { batchId: student.batchId },
		});
		if (config) {
			const markDate = new Date(data.date);
			markDate.setHours(0, 0, 0, 0);
			const batchStart = new Date(config.batchStartDate);
			batchStart.setHours(0, 0, 0, 0);
			const batchEnd = new Date(config.batchEndDate);
			batchEnd.setHours(23, 59, 59, 999);
			if (markDate < batchStart || markDate > batchEnd) {
				throw new Error("Date is outside the batch's active attendance period");
			}
		}
	}

	const dateObj = new Date(data.date);
	dateObj.setHours(0, 0, 0, 0);
	const jsDay = dateObj.getDay();
	const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
	const weekStart = new Date(dateObj);
	weekStart.setDate(weekStart.getDate() + mondayOffset);
	weekStart.setHours(0, 0, 0, 0);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);

	let sheet = await prisma.attendanceSheet.findFirst({
		where: {
			userId: student.id,
			weekStartDate: { gte: weekStart, lte: weekStart },
		},
		include: { entries: true },
	});

	if (!sheet) {
		sheet = await prisma.attendanceSheet.create({
			data: {
				userId: student.id,
				weekStartDate: weekStart,
				weekEndDate: weekEnd,
				batch: student.batch,
				postedDepartment: data.postedDepartment,
				status: "DRAFT",
			},
			include: { entries: true },
		});
	}

	const dayName = JS_DAY_TO_PRISMA[dateObj.getDay()];
	const existing = sheet.entries.find((e) => e.day === dayName);

	if (existing) {
		if (existing.status === "SIGNED") {
			throw new Error("This day is already signed and cannot be modified");
		}
		await prisma.attendanceEntry.update({
			where: { id: existing.id },
			data: {
				date: dateObj,
				presentAbsent: data.presentAbsent,
				hodName: data.hodName || null,
				markedAt: new Date(),
				status: "DRAFT",
				facultyRemark: data.remark ?? existing.facultyRemark,
			},
		});
	} else {
		await prisma.attendanceEntry.create({
			data: {
				attendanceSheetId: sheet.id,
				day: dayName as never,
				date: dateObj,
				presentAbsent: data.presentAbsent,
				hodName: data.hodName || null,
				markedAt: new Date(),
				facultyRemark: data.remark || null,
			},
		});
	}

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/**
 * Auto-absent: Mark "Absent" for all students who did not mark attendance today.
 * Called by a cron job / API route at end of day.
 */
export async function runAutoAbsent() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dayName = JS_DAY_TO_PRISMA[today.getDay()];

	// Get all active batches with configs
	const configs = await prisma.attendanceConfig.findMany({
		where: {
			batchStartDate: { lte: today },
			batchEndDate: { gte: today },
		},
		include: { batch: { select: { id: true, isActive: true } } },
	});

	const activeBatchIds = configs
		.filter(
			(c) => c.batch.isActive && !c.weeklyOffDays.includes(dayName), // Skip weekly off days
		)
		.map((c) => c.batchId);

	if (activeBatchIds.length === 0) return { markedCount: 0 };

	// Check if today is a holiday for any batch
	const holidays = await prisma.attendanceHoliday.findMany({
		where: {
			date: today,
			OR: [{ batchId: null }, { batchId: { in: activeBatchIds } }],
		},
	});
	const holidayBatchIds = new Set<string>();
	for (const h of holidays) {
		if (h.batchId === null) {
			// Global holiday — all batches
			return { markedCount: 0, reason: "Global holiday" };
		}
		holidayBatchIds.add(h.batchId!);
	}
	const eligibleBatchIds = activeBatchIds.filter(
		(id) => !holidayBatchIds.has(id),
	);
	if (eligibleBatchIds.length === 0) return { markedCount: 0 };

	// Get all students in eligible batches
	const students = await prisma.user.findMany({
		where: {
			role: "STUDENT" as never,
			status: "ACTIVE" as never,
			batchId: { in: eligibleBatchIds },
		},
		select: { id: true, batch: true, batchId: true },
	});

	if (students.length === 0) return { markedCount: 0 };

	// Find students who already have an entry for today
	const existingEntries = await prisma.attendanceEntry.findMany({
		where: {
			date: today,
			attendanceSheet: {
				userId: { in: students.map((s) => s.id) },
			},
		},
		select: {
			attendanceSheet: { select: { userId: true } },
		},
	});
	const alreadyMarkedUserIds = new Set(
		existingEntries.map((e) => e.attendanceSheet.userId),
	);

	const unmarkedStudents = students.filter(
		(s) => !alreadyMarkedUserIds.has(s.id),
	);
	if (unmarkedStudents.length === 0) return { markedCount: 0 };

	let markedCount = 0;
	for (const student of unmarkedStudents) {
		// Get or create sheet container
		const jsDay = today.getDay();
		const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
		const weekStart = new Date(today);
		weekStart.setDate(weekStart.getDate() + mondayOffset);
		weekStart.setHours(0, 0, 0, 0);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);
		weekEnd.setHours(23, 59, 59, 999);

		let sheet = await prisma.attendanceSheet.findFirst({
			where: {
				userId: student.id,
				weekStartDate: { gte: weekStart, lte: weekStart },
			},
		});

		if (!sheet) {
			sheet = await prisma.attendanceSheet.create({
				data: {
					userId: student.id,
					weekStartDate: weekStart,
					weekEndDate: weekEnd,
					batch: student.batch,
					status: "DRAFT",
				},
			});
		}

		await prisma.attendanceEntry.create({
			data: {
				attendanceSheetId: sheet.id,
				day: dayName as never,
				date: today,
				presentAbsent: "Absent",
				markedAt: new Date(),
				status: "SIGNED", // Auto-absent entries are auto-signed
			},
		});
		markedCount++;
	}

	return { markedCount };
}

/** Update a single existing entry inline (for editing past days) */
export async function updateDailyEntry(
	entryId: string,
	data: { presentAbsent?: string; hodName?: string },
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
		include: { attendanceSheet: { select: { userId: true } } },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.attendanceSheet.userId !== user.id)
		throw new Error("Access denied");
	if (entry.status === "SIGNED") {
		throw new Error("Cannot edit — entry is signed");
	}
	if (entry.status === "SUBMITTED") {
		throw new Error("Cannot edit — entry is submitted for review");
	}

	await prisma.attendanceEntry.update({
		where: { id: entryId },
		data: {
			presentAbsent: data.presentAbsent ?? entry.presentAbsent,
			hodName:
				data.hodName !== undefined ? data.hodName || null : entry.hodName,
			markedAt: new Date(),
			status: "DRAFT",
		},
	});

	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/** Delete a single entry (for removing a mistakenly marked day) */
export async function deleteDailyEntry(entryId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
		include: { attendanceSheet: { select: { userId: true } } },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.attendanceSheet.userId !== user.id)
		throw new Error("Access denied");
	if (entry.status !== "DRAFT" && entry.status !== "NEEDS_REVISION") {
		throw new Error("Can only delete draft or revision entries");
	}

	await prisma.attendanceEntry.delete({ where: { id: entryId } });
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

// ======================== STUDENT: SHEET CRUD ========================

export async function createAttendanceSheet(data: AttendanceSheetInput) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const validated = attendanceSheetSchema.parse(data);

	await assertNoOverlappingSheet(
		user.id,
		validated.weekStartDate,
		validated.weekEndDate,
	);

	const sheet = await prisma.attendanceSheet.create({
		data: {
			userId: user.id,
			weekStartDate: validated.weekStartDate,
			weekEndDate: validated.weekEndDate,
			batch: validated.batch,
			postedDepartment: validated.postedDepartment,
			status: "DRAFT",
			entries: {
				create: validated.entries.map((entry, index) => ({
					day: entry.day ?? DAYS_OF_WEEK[index],
					date: entry.date,
					presentAbsent: entry.presentAbsent,
					hodName: entry.hodName,
					markedAt: entry.presentAbsent === "Present" ? new Date() : null,
				})),
			},
		},
		include: { entries: { orderBy: { day: "asc" } } },
	});

	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, data: sheet };
}

export async function updateAttendanceSheet(
	sheetId: string,
	data: AttendanceSheetInput,
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const validated = attendanceSheetSchema.parse(data);

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId: user.id },
	});
	if (!existing) throw new Error("Sheet not found or access denied");
	if (existing.status === "SIGNED")
		throw new Error("Cannot edit a signed sheet");

	await assertNoOverlappingSheet(
		user.id,
		validated.weekStartDate,
		validated.weekEndDate,
		sheetId,
	);

	await prisma.attendanceEntry.deleteMany({
		where: { attendanceSheetId: sheetId },
	});

	const sheet = await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: {
			weekStartDate: validated.weekStartDate,
			weekEndDate: validated.weekEndDate,
			batch: validated.batch,
			postedDepartment: validated.postedDepartment,
			entries: {
				create: validated.entries.map((entry, index) => ({
					day: entry.day ?? DAYS_OF_WEEK[index],
					date: entry.date,
					presentAbsent: entry.presentAbsent,
					hodName: entry.hodName,
					markedAt: entry.presentAbsent === "Present" ? new Date() : null,
				})),
			},
		},
		include: { entries: true },
	});

	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, data: sheet };
}

export async function submitAttendanceSheet(sheetId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId: user.id },
	});
	if (!existing) throw new Error("Sheet not found");
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Cannot submit this sheet");
	}

	const autoReview = await isAutoReviewEnabled("attendance");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: newStatus, facultyRemark: null },
	});

	if (autoReview) {
		await prisma.digitalSignature.create({
			data: {
				signedById: "AUTO_REVIEW",
				entityType: "AttendanceSheet",
				entityId: sheetId,
				remark: "Auto-reviewed",
			},
		});
	}

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function retractAttendanceSheet(sheetId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId: user.id },
	});
	if (!existing) throw new Error("Sheet not found or access denied");
	if (existing.status !== "SUBMITTED") {
		throw new Error("Only submitted sheets can be retracted");
	}

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "DRAFT", facultyRemark: null },
	});

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function deleteAttendanceSheet(sheetId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId: user.id, status: "DRAFT" as never },
	});
	if (!existing) throw new Error("Only draft sheets can be deleted");

	await prisma.attendanceSheet.delete({ where: { id: sheetId } });
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function getMyAttendanceSheets() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.attendanceSheet.findMany({
		where: { userId: user.id },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "desc" },
	});
}

// ======================== STUDENT: ANALYTICS ========================

export async function getMyAttendanceAnalytics() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	// Fetch all entries directly (daily-based)
	const allEntries = await prisma.attendanceEntry.findMany({
		where: { attendanceSheet: { userId: user.id } },
		orderBy: { date: "asc" },
		select: {
			date: true,
			presentAbsent: true,
			status: true,
		},
	});

	let totalDays = 0,
		presentDays = 0,
		absentDays = 0,
		leaveDays = 0,
		holidayDays = 0;

	const monthlyData: Record<
		string,
		{
			present: number;
			absent: number;
			leave: number;
			holiday: number;
			total: number;
		}
	> = {};

	for (const entry of allEntries) {
		if (!entry.presentAbsent) continue;
		totalDays++;
		const s = entry.presentAbsent;
		if (s === "Present") presentDays++;
		else if (s === "Absent") absentDays++;
		else if (s === "Leave") leaveDays++;
		else if (s === "Holiday") holidayDays++;

		if (entry.date) {
			const d = new Date(entry.date);
			const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			if (!monthlyData[mk])
				monthlyData[mk] = {
					present: 0,
					absent: 0,
					leave: 0,
					holiday: 0,
					total: 0,
				};
			monthlyData[mk].total++;
			if (s === "Present") monthlyData[mk].present++;
			if (s === "Absent") monthlyData[mk].absent++;
			if (s === "Leave") monthlyData[mk].leave++;
			if (s === "Holiday") monthlyData[mk].holiday++;
		}
	}

	const workingDays = totalDays - holidayDays;
	const attendancePct =
		workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

	let minimumPct = 75;
	if (user.batchId) {
		const config = await prisma.attendanceConfig.findUnique({
			where: { batchId: user.batchId },
		});
		if (config) minimumPct = config.minimumAttendancePct;
	}

	const monthlyTrend = Object.entries(monthlyData)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, d]) => ({
			month,
			present: d.present,
			absent: d.absent,
			leave: d.leave,
			holiday: d.holiday,
			total: d.total,
			pct:
				d.total - d.holiday > 0 ?
					Math.round((d.present / (d.total - d.holiday)) * 100)
				:	0,
		}));

	const totalEntries = allEntries.length;
	const signedEntries = allEntries.filter((e) => e.status === "SIGNED").length;

	return {
		totalDays,
		presentDays,
		absentDays,
		leaveDays,
		holidayDays,
		workingDays,
		attendancePct,
		minimumPct,
		meetsMinimum: attendancePct >= minimumPct,
		monthlyTrend,
		totalEntries,
		signedEntries,
	};
}

// ======================== FACULTY & HOD: REVIEW ========================

export async function getAttendanceForReview(params?: {
	page?: number;
	pageSize?: number;
	status?: string;
	batchId?: string;
	search?: string;
}) {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const page = params?.page ?? 1;
	const pageSize = params?.pageSize ?? 15;
	const skip = (page - 1) * pageSize;

	let userIdFilter: { in: string[] } | undefined;

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return { data: [], total: 0, page, pageSize };

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		userIdFilter = { in: students.map((s) => s.id) };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const where: Record<string, any> = {};
	if (userIdFilter) where.userId = userIdFilter;
	if (params?.status && params.status !== "ALL") where.status = params.status;
	if (params?.batchId && params.batchId !== "ALL")
		where.user = { batchId: params.batchId };
	if (params?.search) {
		const q = params.search;
		where.OR = [
			{ user: { firstName: { contains: q, mode: "insensitive" } } },
			{ user: { lastName: { contains: q, mode: "insensitive" } } },
			{ batch: { contains: q, mode: "insensitive" } },
		];
	}

	const [data, total] = await Promise.all([
		prisma.attendanceSheet.findMany({
			where: where as never,
			orderBy: { createdAt: "desc" },
			skip,
			take: pageSize,
			include: {
				entries: { orderBy: { day: "asc" } },
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						batchRelation: { select: { name: true } },
						currentSemester: true,
						profileImage: true,
					},
				},
			},
		}),
		prisma.attendanceSheet.count({ where: where as never }),
	]);

	return { data, total, page, pageSize };
}

export async function getStudentAttendanceSheets(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.attendanceSheet.findMany({
		where: { userId: studentId },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "desc" },
	});
}

export async function getStudentAttendanceAnalytics(studentId: string) {
	await requireRole(["faculty", "hod"]);

	const student = await prisma.user.findUnique({
		where: { id: studentId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			batchId: true,
			currentSemester: true,
			profileImage: true,
		},
	});
	if (!student) throw new Error("Student not found");

	// Fetch all entries directly (daily-based)
	const allEntries = await prisma.attendanceEntry.findMany({
		where: { attendanceSheet: { userId: studentId } },
		orderBy: { date: "asc" },
		select: {
			id: true,
			date: true,
			day: true,
			presentAbsent: true,
			hodName: true,
			status: true,
			facultyRemark: true,
			markedAt: true,
			signedAt: true,
			attendanceSheet: {
				select: { postedDepartment: true, batch: true },
			},
		},
	});

	let totalDays = 0,
		presentDays = 0,
		absentDays = 0,
		leaveDays = 0,
		holidayDays = 0;
	const monthlyData: Record<
		string,
		{
			present: number;
			absent: number;
			leave: number;
			holiday: number;
			total: number;
		}
	> = {};

	for (const entry of allEntries) {
		if (!entry.presentAbsent) continue;
		totalDays++;
		const s = entry.presentAbsent;
		if (s === "Present") presentDays++;
		else if (s === "Absent") absentDays++;
		else if (s === "Leave") leaveDays++;
		else if (s === "Holiday") holidayDays++;

		if (entry.date) {
			const d = new Date(entry.date);
			const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			if (!monthlyData[mk])
				monthlyData[mk] = {
					present: 0,
					absent: 0,
					leave: 0,
					holiday: 0,
					total: 0,
				};
			monthlyData[mk].total++;
			if (s === "Present") monthlyData[mk].present++;
			if (s === "Absent") monthlyData[mk].absent++;
			if (s === "Leave") monthlyData[mk].leave++;
			if (s === "Holiday") monthlyData[mk].holiday++;
		}
	}

	const workingDays = totalDays - holidayDays;
	const attendancePct =
		workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

	let minimumPct = 75;
	if (student.batchId) {
		const config = await prisma.attendanceConfig.findUnique({
			where: { batchId: student.batchId },
		});
		if (config) minimumPct = config.minimumAttendancePct;
	}

	const monthlyTrend = Object.entries(monthlyData)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, d]) => ({
			month,
			present: d.present,
			absent: d.absent,
			leave: d.leave,
			holiday: d.holiday,
			total: d.total,
			pct:
				d.total - d.holiday > 0 ?
					Math.round((d.present / (d.total - d.holiday)) * 100)
				:	0,
		}));

	const totalEntries = allEntries.length;
	const signedEntries = allEntries.filter((e) => e.status === "SIGNED").length;

	return {
		student,
		totalDays,
		presentDays,
		absentDays,
		leaveDays,
		holidayDays,
		workingDays,
		attendancePct,
		minimumPct,
		meetsMinimum: attendancePct >= minimumPct,
		monthlyTrend,
		totalEntries,
		signedEntries,
		entries: allEntries,
	};
}

export async function signAttendanceSheet(sheetId: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const sheet = await prisma.attendanceSheet.findUnique({
		where: { id: sheetId },
	});
	if (!sheet) throw new Error("Sheet not found");
	if (sheet.status !== "SUBMITTED") throw new Error("Sheet is not submitted");

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "SIGNED", facultyRemark: remark ?? null },
	});
	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "AttendanceSheet",
			entityId: sheetId,
			remark,
		},
	});

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function rejectAttendanceSheet(sheetId: string, remark: string) {
	await requireRole(["faculty", "hod"]);
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");


	const sheet = await prisma.attendanceSheet.findUnique({
		where: { id: sheetId },
	});
	if (!sheet) throw new Error("Sheet not found");
	if (sheet.status !== "SUBMITTED") throw new Error("Sheet is not submitted");

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "NEEDS_REVISION", facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}` },
	});

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function bulkSignAttendanceSheets(
	sheetIds: string[],
	remark?: string,
) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	let signedCount = 0;
	for (const sheetId of sheetIds) {
		const sheet = await prisma.attendanceSheet.findUnique({
			where: { id: sheetId },
		});
		if (!sheet || sheet.status !== "SUBMITTED") continue;

		await prisma.attendanceSheet.update({
			where: { id: sheetId },
			data: { status: "SIGNED", facultyRemark: remark ? `[${user.firstName} ${user.lastName}] ${remark}` : null },
		});
		await prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "AttendanceSheet",
				entityId: sheetId,
				remark,
			},
		});
		signedCount++;
	}

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, signedCount };
}

// ======================== HOD: BATCH ATTENDANCE OVERVIEW ========================

export async function getBatchAttendanceSummary(batchId?: string) {
	await requireRole(["hod"]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const studentsWhere: Record<string, any> = { role: "STUDENT" as never };
	if (batchId && batchId !== "ALL") studentsWhere.batchId = batchId;

	const students = await prisma.user.findMany({
		where: studentsWhere as never,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			batchId: true,
			currentSemester: true,
			profileImage: true,
		},
		orderBy: [{ firstName: "asc" }],
	});

	// Fetch all entries for these students in one query
	const studentIds = students.map((s) => s.id);
	const allEntries = await prisma.attendanceEntry.findMany({
		where: {
			attendanceSheet: { userId: { in: studentIds } },
			presentAbsent: { not: null },
		},
		select: {
			presentAbsent: true,
			status: true,
			attendanceSheet: { select: { userId: true } },
		},
	});

	// Group entries by student
	const entryMap = new Map<
		string,
		{
			present: number;
			absent: number;
			holiday: number;
			total: number;
			signed: number;
			totalEntries: number;
		}
	>();
	for (const entry of allEntries) {
		const uid = entry.attendanceSheet.userId;
		let data = entryMap.get(uid);
		if (!data) {
			data = {
				present: 0,
				absent: 0,
				holiday: 0,
				total: 0,
				signed: 0,
				totalEntries: 0,
			};
			entryMap.set(uid, data);
		}
		data.total++;
		data.totalEntries++;
		if (entry.presentAbsent === "Present") data.present++;
		else if (entry.presentAbsent === "Absent") data.absent++;
		else if (entry.presentAbsent === "Holiday") data.holiday++;
		if (entry.status === "SIGNED") data.signed++;
	}

	const batchIds = [
		...new Set(students.map((s) => s.batchId).filter(Boolean)),
	] as string[];
	const configs = await prisma.attendanceConfig.findMany({
		where: { batchId: { in: batchIds } },
	});
	const configMap = new Map(configs.map((c) => [c.batchId, c]));

	return students.map((student) => {
		const data = entryMap.get(student.id) ?? {
			present: 0,
			absent: 0,
			holiday: 0,
			total: 0,
			signed: 0,
			totalEntries: 0,
		};
		const workingDays = data.total - data.holiday;
		const attendancePct =
			workingDays > 0 ? Math.round((data.present / workingDays) * 100) : 0;
		const config = student.batchId ? configMap.get(student.batchId) : undefined;
		const minimumPct = config?.minimumAttendancePct ?? 75;

		return {
			id: student.id,
			name: `${student.firstName} ${student.lastName}`,
			batch: student.batch,
			batchId: student.batchId,
			semester: student.currentSemester,
			profileImage: student.profileImage,
			totalDays: data.total,
			presentDays: data.present,
			absentDays: data.absent,
			workingDays,
			attendancePct,
			minimumPct,
			meetsMinimum: attendancePct >= minimumPct,
			totalEntries: data.totalEntries,
			signedEntries: data.signed,
		};
	});
}

// ======================== DAILY ENTRY-LEVEL REVIEW ========================

/** Submit a single daily entry for review */
export async function submitDailyEntry(entryId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
		include: { attendanceSheet: { select: { userId: true } } },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.attendanceSheet.userId !== user.id)
		throw new Error("Access denied");
	if (entry.status !== "DRAFT" && entry.status !== "NEEDS_REVISION") {
		throw new Error("Only draft or revision entries can be submitted");
	}
	if (!entry.presentAbsent) {
		throw new Error("Cannot submit — attendance status is not set");
	}

	const autoReview = await isAutoReviewEnabled("attendance");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	await prisma.attendanceEntry.update({
		where: { id: entryId },
		data: { status: newStatus, facultyRemark: null },
	});

	if (autoReview) {
		await prisma.digitalSignature.create({
			data: {
				signedById: "AUTO_REVIEW",
				entityType: "AttendanceEntry",
				entityId: entryId,
				remark: "Auto-reviewed",
			},
		});
	}

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/** Submit multiple daily entries for review at once */
export async function submitMultipleDailyEntries(entryIds: string[]) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const autoReview = await isAutoReviewEnabled("attendance");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";
	let submittedCount = 0;

	for (const entryId of entryIds) {
		const entry = await prisma.attendanceEntry.findUnique({
			where: { id: entryId },
			include: { attendanceSheet: { select: { userId: true } } },
		});
		if (!entry || entry.attendanceSheet.userId !== user.id) continue;
		if (entry.status !== "DRAFT" && entry.status !== "NEEDS_REVISION") continue;
		if (!entry.presentAbsent) continue;

		await prisma.attendanceEntry.update({
			where: { id: entryId },
			data: { status: newStatus, facultyRemark: null },
		});

		if (autoReview) {
			await prisma.digitalSignature.create({
				data: {
					signedById: "AUTO_REVIEW",
					entityType: "AttendanceEntry",
					entityId: entryId,
					remark: "Auto-reviewed",
				},
			});
		}
		submittedCount++;
	}

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, submittedCount };
}

/** Retract a submitted daily entry back to draft */
export async function retractDailyEntry(entryId: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
		include: { attendanceSheet: { select: { userId: true } } },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.attendanceSheet.userId !== user.id)
		throw new Error("Access denied");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Only submitted entries can be retracted");
	}

	await prisma.attendanceEntry.update({
		where: { id: entryId },
		data: { status: "DRAFT", facultyRemark: null },
	});

	revalidatePath("/dashboard/student/attendance");
	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/** Faculty/HOD: Sign a single daily entry */
export async function signDailyEntry(entryId: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.attendanceEntry.update({
		where: { id: entryId },
		data: {
			status: "SIGNED",
			facultyRemark: remark ? `[${user.firstName} ${user.lastName}] ${remark}` : null,
			signedAt: new Date(),
			signedBy: user.id,
		},
	});
	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "AttendanceEntry",
			entityId: entryId,
			remark,
		},
	});

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/** Faculty/HOD: Reject a single daily entry with remark */
export async function rejectDailyEntry(entryId: string, remark: string) {
	await requireRole(["faculty", "hod"]);
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");


	const entry = await prisma.attendanceEntry.findUnique({
		where: { id: entryId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.attendanceEntry.update({
		where: { id: entryId },
		data: { status: "NEEDS_REVISION", facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}` },
	});

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/** Faculty/HOD: Bulk sign multiple daily entries */
export async function bulkSignDailyEntries(
	entryIds: string[],
	remark?: string,
) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	let signedCount = 0;
	for (const entryId of entryIds) {
		const entry = await prisma.attendanceEntry.findUnique({
			where: { id: entryId },
		});
		if (!entry || entry.status !== "SUBMITTED") continue;

		await prisma.attendanceEntry.update({
			where: { id: entryId },
			data: {
				status: "SIGNED",
				facultyRemark: remark ? `[${user.firstName} ${user.lastName}] ${remark}` : null,
				signedAt: new Date(),
				signedBy: user.id,
			},
		});
		await prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "AttendanceEntry",
				entityId: entryId,
				remark,
			},
		});
		signedCount++;
	}

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	emitRealtimeEvent("entry:updated");
	return { success: true, signedCount };
}

/** Faculty/HOD: Get paginated daily entries for review */
export async function getDailyEntriesForReview(params?: {
	page?: number;
	pageSize?: number;
	status?: string;
	batchId?: string;
	search?: string;
}) {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const page = params?.page ?? 1;
	const pageSize = params?.pageSize ?? 20;
	const skip = (page - 1) * pageSize;

	let studentIdFilter: { in: string[] } | undefined;

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return { data: [], total: 0, page, pageSize };

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIdFilter = { in: students.map((s) => s.id) };
	}

	// Build where clause for entries
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const where: Record<string, any> = {
		presentAbsent: { not: null }, // Only marked entries
	};

	// Filter by student through sheet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sheetWhere: Record<string, any> = {};
	if (studentIdFilter) sheetWhere.userId = studentIdFilter;
	if (params?.batchId && params.batchId !== "ALL") {
		sheetWhere.user = { batchId: params.batchId };
	}
	if (params?.search) {
		const q = params.search;
		sheetWhere.OR = [
			{ user: { firstName: { contains: q, mode: "insensitive" } } },
			{ user: { lastName: { contains: q, mode: "insensitive" } } },
		];
	}
	if (Object.keys(sheetWhere).length > 0) {
		where.attendanceSheet = sheetWhere;
	}

	// Entry-level status filter
	if (params?.status && params.status !== "ALL") {
		where.status = params.status;
	}

	const [data, total] = await Promise.all([
		prisma.attendanceEntry.findMany({
			where: where as never,
			orderBy: { date: "desc" },
			skip,
			take: pageSize,
			include: {
				attendanceSheet: {
					select: {
						userId: true,
						batch: true,
						postedDepartment: true,
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								batchRelation: { select: { name: true } },
								currentSemester: true,
								profileImage: true,
							},
						},
					},
				},
			},
		}),
		prisma.attendanceEntry.count({ where: where as never }),
	]);

	return { data, total, page, pageSize };
}

// ======================== FACE RECOGNITION: GET STUDENT PHOTOS ========================

/**
 * Get all active students (with profile photos) for a batch.
 * Used by face recognition to build reference descriptors.
 */
export async function getStudentsForFaceRecognition(batchId: string) {
	const clerkId = await requireAuth();
	const caller = await resolveUser(clerkId);

	// Only HOD/faculty or the student themselves
	if (
		caller.role !== "HOD" &&
		caller.role !== "FACULTY" &&
		caller.role !== "STUDENT"
	) {
		throw new Error("Forbidden");
	}

	const students = await prisma.user.findMany({
		where: {
			batchId,
			role: "STUDENT",
			status: "ACTIVE",
			profileImage: { not: null },
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			profileImage: true,
		},
		orderBy: { firstName: "asc" },
	});

	return students.map((s) => ({
		studentId: s.id,
		studentName: `${s.firstName} ${s.lastName}`,
		profileImageUrl: s.profileImage!,
	}));
}
