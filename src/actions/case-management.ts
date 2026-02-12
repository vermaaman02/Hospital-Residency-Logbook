/**
 * @module Case Management Actions
 * @description Server actions for all 24 case management categories (308 sub-types).
 * One set of actions serves ALL categories via the `category` parameter.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT" (all sections)
 * @see prisma/schema.prisma — CaseManagementLog model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	caseManagementSchema,
	type CaseManagementInput,
} from "@/lib/validators/case-management";
import { revalidatePath } from "next/cache";

function revalidate(category: string) {
	revalidatePath(`/dashboard/student/case-management/${category}`);
	revalidatePath("/dashboard/student/case-management");
}

// ─── Create ─────────────────────────────────────────────────

/**
 * Create a new case management entry for any category.
 * Auto-calculates slNo per user+category and totalCaseTally per sub-category.
 */
export async function createCaseManagementEntry(data: CaseManagementInput) {
	const userId = await requireAuth();
	const validated = caseManagementSchema.parse(data);

	// Auto slNo per user+category
	const lastEntry = await prisma.caseManagementLog.findFirst({
		where: { userId, category: validated.category as never },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	// Auto tally: count existing entries for this sub-category + 1
	const existingTally = await prisma.caseManagementLog.count({
		where: {
			userId,
			category: validated.category as never,
			caseSubCategory: validated.caseSubCategory,
		},
	});

	const entry = await prisma.caseManagementLog.create({
		data: {
			userId,
			category: validated.category as never,
			slNo,
			caseSubCategory: validated.caseSubCategory,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			competencyLevel: validated.competencyLevel as never,
			totalCaseTally: existingTally + 1,
			status: "DRAFT",
		},
	});

	revalidate(validated.category);
	return { success: true, data: entry };
}

// ─── Update ─────────────────────────────────────────────────

/**
 * Update an existing case management entry.
 */
export async function updateCaseManagementEntry(
	id: string,
	data: CaseManagementInput,
) {
	const userId = await requireAuth();
	const validated = caseManagementSchema.parse(data);

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.caseManagementLog.update({
		where: { id },
		data: {
			caseSubCategory: validated.caseSubCategory,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			competencyLevel: validated.competencyLevel as never,
			status: "DRAFT",
		},
	});

	revalidate(validated.category);
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitCaseManagementEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await prisma.caseManagementLog.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidate(existing.category);
	return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteCaseManagementEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.caseManagementLog.delete({ where: { id } });

	revalidate(existing.category);
	return { success: true };
}

// ─── Read ───────────────────────────────────────────────────

/**
 * Get all case management entries for a specific category for the current student.
 */
export async function getMyCaseManagementEntries(category: string) {
	const userId = await requireAuth();

	return prisma.caseManagementLog.findMany({
		where: { userId, category: category as never },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Get summary counts per category for the current student (for landing page).
 */
export async function getMyCaseManagementSummary() {
	const userId = await requireAuth();

	const counts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId },
		_count: { id: true },
	});

	const signedCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId, status: "SIGNED" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.category, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.category, c._count.id]),
		),
	};
}

// ─── Faculty Sign / Reject ──────────────────────────────────

/**
 * Faculty: Sign a case management entry.
 */
export async function signCaseManagementEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.caseManagementLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType: "CaseManagementLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidate(entry.category);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

/**
 * Faculty: Reject a case management entry with remark.
 */
export async function rejectCaseManagementEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.caseManagementLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidate(entry.category);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}
