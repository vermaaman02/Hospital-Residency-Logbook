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
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";
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
		},
	});

	revalidatePath("/dashboard/hod/attendance");
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
	return { success: true, data: holiday };
}

export async function removeHoliday(holidayId: string) {
	await requireRole(["hod"]);
	await prisma.attendanceHoliday.delete({ where: { id: holidayId } });
	revalidatePath("/dashboard/hod/attendance");
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
		return { success: true, action: "removed" as const };
	}
	const holiday = await prisma.attendanceHoliday.create({
		data: { date: data.date, name: data.name, batchId: data.batchId ?? null },
	});
	revalidatePath("/dashboard/hod/attendance");
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

	const sheets = await prisma.attendanceSheet.findMany({
		where: { userId: user.id },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "asc" },
	});

	let totalDays = 0,
		presentDays = 0,
		absentDays = 0,
		leaveDays = 0,
		holidayDays = 0;

	const weeklyData: {
		week: string;
		present: number;
		absent: number;
		leave: number;
		holiday: number;
		total: number;
	}[] = [];
	const monthlyData: Record<
		string,
		{ present: number; absent: number; total: number }
	> = {};

	for (const sheet of sheets) {
		let wP = 0,
			wA = 0,
			wL = 0,
			wH = 0;
		for (const entry of sheet.entries) {
			if (!entry.presentAbsent) continue;
			totalDays++;
			const s = entry.presentAbsent;
			if (s === "Present") {
				presentDays++;
				wP++;
			} else if (s === "Absent") {
				absentDays++;
				wA++;
			} else if (s === "Leave") {
				leaveDays++;
				wL++;
			} else if (s === "Holiday") {
				holidayDays++;
				wH++;
			}

			if (entry.date) {
				const d = new Date(entry.date);
				const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
				if (!monthlyData[mk])
					monthlyData[mk] = { present: 0, absent: 0, total: 0 };
				monthlyData[mk].total++;
				if (s === "Present") monthlyData[mk].present++;
				if (s === "Absent") monthlyData[mk].absent++;
			}
		}

		const weekLabel = new Date(sheet.weekStartDate).toLocaleDateString(
			"en-IN",
			{ day: "2-digit", month: "short" },
		);
		weeklyData.push({
			week: weekLabel,
			present: wP,
			absent: wA,
			leave: wL,
			holiday: wH,
			total: wP + wA + wL + wH,
		});
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
			total: d.total,
			pct: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
		}));

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
		weeklyData: weeklyData.slice(-12),
		monthlyTrend,
		totalSheets: sheets.length,
		signedSheets: sheets.filter((s) => s.status === "SIGNED").length,
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

	const sheets = await prisma.attendanceSheet.findMany({
		where: { userId: studentId },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "asc" },
	});

	let totalDays = 0,
		presentDays = 0,
		absentDays = 0,
		leaveDays = 0,
		holidayDays = 0;
	const weeklyData: {
		week: string;
		present: number;
		absent: number;
		leave: number;
		holiday: number;
	}[] = [];

	for (const sheet of sheets) {
		let wP = 0,
			wA = 0,
			wL = 0,
			wH = 0;
		for (const entry of sheet.entries) {
			if (!entry.presentAbsent) continue;
			totalDays++;
			const s = entry.presentAbsent;
			if (s === "Present") {
				presentDays++;
				wP++;
			} else if (s === "Absent") {
				absentDays++;
				wA++;
			} else if (s === "Leave") {
				leaveDays++;
				wL++;
			} else if (s === "Holiday") {
				holidayDays++;
				wH++;
			}
		}
		const weekLabel = new Date(sheet.weekStartDate).toLocaleDateString(
			"en-IN",
			{ day: "2-digit", month: "short" },
		);
		weeklyData.push({
			week: weekLabel,
			present: wP,
			absent: wA,
			leave: wL,
			holiday: wH,
		});
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
		weeklyData: weeklyData.slice(-12),
		totalSheets: sheets.length,
		signedSheets: sheets.filter((s) => s.status === "SIGNED").length,
		sheets,
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
	return { success: true };
}

export async function rejectAttendanceSheet(sheetId: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const sheet = await prisma.attendanceSheet.findUnique({
		where: { id: sheetId },
	});
	if (!sheet) throw new Error("Sheet not found");
	if (sheet.status !== "SUBMITTED") throw new Error("Sheet is not submitted");

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "NEEDS_REVISION", facultyRemark: remark },
	});

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
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
		signedCount++;
	}

	revalidatePath("/dashboard/faculty/attendance");
	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
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
			attendanceSheets: { include: { entries: true } },
		},
		orderBy: [{ firstName: "asc" }],
	});

	const batchIds = [
		...new Set(students.map((s) => s.batchId).filter(Boolean)),
	] as string[];
	const configs = await prisma.attendanceConfig.findMany({
		where: { batchId: { in: batchIds } },
	});
	const configMap = new Map(configs.map((c) => [c.batchId, c]));

	return students.map((student) => {
		let totalDays = 0,
			presentDays = 0,
			absentDays = 0,
			holidayDays = 0;
		for (const sheet of student.attendanceSheets) {
			for (const entry of sheet.entries) {
				if (!entry.presentAbsent) continue;
				totalDays++;
				if (entry.presentAbsent === "Present") presentDays++;
				else if (entry.presentAbsent === "Absent") absentDays++;
				else if (entry.presentAbsent === "Holiday") holidayDays++;
			}
		}
		const workingDays = totalDays - holidayDays;
		const attendancePct =
			workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
		const config = student.batchId ? configMap.get(student.batchId) : undefined;
		const minimumPct = config?.minimumAttendancePct ?? 75;

		return {
			id: student.id,
			name: `${student.firstName} ${student.lastName}`,
			batch: student.batch,
			batchId: student.batchId,
			semester: student.currentSemester,
			profileImage: student.profileImage,
			totalDays,
			presentDays,
			absentDays,
			workingDays,
			attendancePct,
			minimumPct,
			meetsMinimum: attendancePct >= minimumPct,
			totalSheets: student.attendanceSheets.length,
			signedSheets: student.attendanceSheets.filter(
				(s) => s.status === "SIGNED",
			).length,
		};
	});
}
