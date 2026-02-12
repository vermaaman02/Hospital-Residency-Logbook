/**
 * @module Rotation Posting Actions
 * @description Server actions for CRUD operations on rotation postings.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 * @see prisma/schema.prisma — RotationPosting model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	rotationPostingSchema,
	type RotationPostingInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";

/**
 * Create a new rotation posting entry.
 */
export async function createRotationPosting(data: RotationPostingInput) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	// Auto-generate Sl. No.
	const lastEntry = await prisma.rotationPosting.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.rotationPosting.create({
		data: {
			userId,
			slNo,
			rotationName: validated.rotationName,
			isElective: validated.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
			status: "DRAFT",
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Update an existing rotation posting entry.
 */
export async function updateRotationPosting(
	id: string,
	data: RotationPostingInput,
) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	// Ensure user owns this entry
	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId },
	});
	if (!existing) {
		throw new Error("Entry not found or access denied");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.rotationPosting.update({
		where: { id },
		data: {
			rotationName: validated.rotationName,
			isElective: validated.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Submit a rotation posting for faculty review.
 */
export async function submitRotationPosting(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Cannot submit this entry");
	}

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Delete a draft rotation posting.
 */
export async function deleteRotationPosting(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId, status: "DRAFT" },
	});
	if (!existing) throw new Error("Only draft entries can be deleted");

	await prisma.rotationPosting.delete({ where: { id } });

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Get all rotation postings for the current user.
 */
export async function getMyRotationPostings() {
	const userId = await requireAuth();

	return prisma.rotationPosting.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty: sign a rotation posting.
 */
export async function signRotationPosting(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: {
			status: "SIGNED",
			facultyRemark: remark ?? null,
		},
	});

	// Create digital signature record
	await prisma.digitalSignature.create({
		data: {
			signedById: userId,
			entityType: "RotationPosting",
			entityId: id,
			remark,
		},
	});

	revalidatePath("/dashboard/faculty/reviews");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Faculty: reject/request revision of a rotation posting.
 */
export async function rejectRotationPosting(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidatePath("/dashboard/faculty/reviews");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}
