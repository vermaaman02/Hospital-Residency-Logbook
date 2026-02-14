/**
 * @module Attendance Actions
 * @description Server actions for weekly attendance sheets.
 * Each sheet = one week (Mon-Sun) with daily entries.
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

const DAYS_OF_WEEK = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

/**
 * Create a new weekly attendance sheet with 7 day entries.
 */
export async function createAttendanceSheet(data: AttendanceSheetInput) {
	const userId = await requireAuth();
	const validated = attendanceSheetSchema.parse(data);

	const sheet = await prisma.attendanceSheet.create({
		data: {
			userId,
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
		include: {
			entries: {
				orderBy: { day: "asc" },
			},
		},
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
	const userId = await requireAuth();
	const validated = attendanceSheetSchema.parse(data);

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId },
	});
	if (!existing) throw new Error("Sheet not found or access denied");
	if (existing.status === "SIGNED")
		throw new Error("Cannot edit a signed sheet");

	// Delete and recreate entries (simpler than diffing)
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
 * Submit an attendance sheet for HOD review.
 */
export async function submitAttendanceSheet(sheetId: string) {
	const userId = await requireAuth();

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId },
	});
	if (!existing) throw new Error("Sheet not found");
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Cannot submit this sheet");
	}

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/attendance");
	return { success: true };
}

/**
 * Delete a draft attendance sheet.
 */
export async function deleteAttendanceSheet(sheetId: string) {
	const userId = await requireAuth();

	const existing = await prisma.attendanceSheet.findFirst({
		where: { id: sheetId, userId, status: "DRAFT" },
	});
	if (!existing) throw new Error("Only draft sheets can be deleted");

	await prisma.attendanceSheet.delete({ where: { id: sheetId } });

	revalidatePath("/dashboard/student/attendance");
	return { success: true };
}

/**
 * Get all attendance sheets for current user.
 */
export async function getMyAttendanceSheets() {
	const userId = await requireAuth();

	return prisma.attendanceSheet.findMany({
		where: { userId },
		include: {
			entries: {
				orderBy: { day: "asc" },
			},
		},
		orderBy: { weekStartDate: "desc" },
	});
}

/**
 * HOD: Sign an attendance sheet.
 */
export async function signAttendanceSheet(sheetId: string) {
	const { userId } = await requireRole(["hod"]);

	const sheet = await prisma.attendanceSheet.findUnique({
		where: { id: sheetId },
	});
	if (!sheet) throw new Error("Sheet not found");
	if (sheet.status !== "SUBMITTED") throw new Error("Sheet is not submitted");

	await prisma.attendanceSheet.update({
		where: { id: sheetId },
		data: { status: "SIGNED" },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: userId,
			entityType: "AttendanceSheet",
			entityId: sheetId,
		},
	});

	revalidatePath("/dashboard/hod/attendance");
	revalidatePath("/dashboard/student/attendance");
	return { success: true };
}
