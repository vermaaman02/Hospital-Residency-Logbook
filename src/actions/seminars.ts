/**
 * @module Seminar Actions
 * @description Server actions for CRUD operations on seminar/evidence-based discussions.
 * Physical logbook allows 10 entries.
 *
 * @see PG Logbook .md — Section: "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 * @see prisma/schema.prisma — Seminar model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	seminarSchema,
	type SeminarInput,
} from "@/lib/validators/academics";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/dashboard/student/seminars";

/**
 * Create a new seminar entry.
 */
export async function createSeminar(data: SeminarInput) {
	const userId = await requireAuth();
	const validated = seminarSchema.parse(data);

	const lastEntry = await prisma.seminar.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.seminar.create({
		data: {
			userId,
			slNo,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			category: validated.category,
			status: "DRAFT",
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true, data: entry };
}

/**
 * Update an existing seminar entry.
 */
export async function updateSeminar(id: string, data: SeminarInput) {
	const userId = await requireAuth();
	const validated = seminarSchema.parse(data);

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.seminar.update({
		where: { id },
		data: {
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			category: validated.category,
			status: "DRAFT",
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true, data: entry };
}

/**
 * Submit a seminar for faculty review.
 */
export async function submitSeminar(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await prisma.seminar.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Delete a draft seminar entry.
 */
export async function deleteSeminar(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.seminar.delete({ where: { id } });

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Get all seminars for the current student.
 */
export async function getMySeminars() {
	const userId = await requireAuth();

	return prisma.seminar.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty: Sign a seminar entry.
 */
export async function signSeminar(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.seminar.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.seminar.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType: "Seminar",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

/**
 * Faculty: Reject a seminar with remark.
 */
export async function rejectSeminar(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.seminar.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.seminar.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}
