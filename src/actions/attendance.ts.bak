/**
 * @module Attendance Actions
 * @description Server actions for weekly attendance sheets.
 * Each sheet = one week (Mon-Sun) with 7 daily entries.
 * Student CRUD, faculty/HOD review (sign/reject), batch-scoped queries.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 * @see prisma/schema.prisma — AttendanceSheet, AttendanceEntry models
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

// ======================== STUDENT ACTIONS ========================

/**
 * Create a new weekly attendance sheet with 7 day entries.
 */
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
				})),
			},
		},
		include: { entries: { orderBy: { day: "asc" } } },
	});

	revalidatePath("/dashboard/student/attendance");
	return { success: true, data: sheet };
}

/**
 * Update an existing attendance sheet and its entries.
 */
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
				})),
			},
		},
		include: { entries: true },
	});

	revalidatePath("/dashboard/student/attendance");
	return { success: true, data: sheet };
}

/**
 * Submit an attendance sheet for review.
 * If auto-review is enabled, auto-signs.
 */
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

/**
 * Retract a submitted attendance sheet back to DRAFT so the student can edit it.
 * Only allowed when status is SUBMITTED (not yet signed by faculty).
 */
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

/**
 * Delete a draft attendance sheet.
 */
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

/**
 * Get all attendance sheets for current student.
 */
export async function getMyAttendanceSheets() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.attendanceSheet.findMany({
		where: { userId: user.id },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "desc" },
	});
}

// ======================== FACULTY & HOD ACTIONS ========================

/**
 * Faculty: Get attendance for students in assigned batches.
 * HOD: Get all attendance sheets.
 */
export async function getAttendanceForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	if (role === "hod") {
		return prisma.attendanceSheet.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				entries: { orderBy: { day: "asc" } },
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						batchRelation: { select: { name: true } },
						currentSemester: true,
					},
				},
			},
		});
	}

	// Faculty: batch-scoped
	const batchAssignments = await prisma.facultyBatchAssignment.findMany({
		where: { facultyId: user.id },
		select: { batchId: true },
	});
	const batchIds = batchAssignments.map((b) => b.batchId);
	if (batchIds.length === 0) return [];

	const students = await prisma.user.findMany({
		where: { batchId: { in: batchIds }, role: "STUDENT" as never },
		select: { id: true },
	});

	return prisma.attendanceSheet.findMany({
		where: { userId: { in: students.map((s) => s.id) } },
		orderBy: { createdAt: "desc" },
		include: {
			entries: { orderBy: { day: "asc" } },
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					batchRelation: { select: { name: true } },
					currentSemester: true,
				},
			},
		},
	});
}

/**
 * Get attendance sheets for a specific student (faculty/HOD).
 */
export async function getStudentAttendanceSheets(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.attendanceSheet.findMany({
		where: { userId: studentId },
		include: { entries: { orderBy: { day: "asc" } } },
		orderBy: { weekStartDate: "desc" },
	});
}

/**
 * Faculty/HOD: sign an attendance sheet.
 */
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

/**
 * Faculty/HOD: reject/request revision for attendance sheet.
 */
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
