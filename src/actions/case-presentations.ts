/**
 * @module Case Presentation Actions
 * @description Server actions for CRUD operations on academic case presentations.
 * Physical logbook allows 20 entries.
 *
 * @see PG Logbook .md — Section: "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see prisma/schema.prisma — CasePresentation model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	casePresentationSchema,
	type CasePresentationInput,
} from "@/lib/validators/academics";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/dashboard/student/case-presentations";

/**
 * Create a new case presentation entry.
 */
export async function createCasePresentation(data: CasePresentationInput) {
	const userId = await requireAuth();
	const validated = casePresentationSchema.parse(data);

	const lastEntry = await prisma.casePresentation.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.casePresentation.create({
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
 * Update an existing case presentation entry.
 */
export async function updateCasePresentation(
	id: string,
	data: CasePresentationInput,
) {
	const userId = await requireAuth();
	const validated = casePresentationSchema.parse(data);

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.casePresentation.update({
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
 * Submit a case presentation for faculty review.
 */
export async function submitCasePresentation(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await prisma.casePresentation.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Delete a draft case presentation entry.
 */
export async function deleteCasePresentation(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.casePresentation.delete({ where: { id } });

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Get all case presentations for the current student.
 */
export async function getMyCasePresentations() {
	const userId = await requireAuth();

	return prisma.casePresentation.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty: Sign a case presentation entry.
 */
export async function signCasePresentation(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.casePresentation.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.casePresentation.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType: "CasePresentation",
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
 * Faculty: Reject a case presentation with remark.
 */
export async function rejectCasePresentation(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.casePresentation.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.casePresentation.update({
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
