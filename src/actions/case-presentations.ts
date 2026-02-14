/**
 * @module Case Presentation Actions
 * @description Server actions for CRUD on academic case presentations.
 * Supports inline editing, faculty assignment, auto-sign, faculty/HOD review.
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

const STUDENT_PATH = "/dashboard/student/case-presentations";
const FACULTY_PATH = "/dashboard/faculty/case-presentation-reviews";
const REVIEW_PATH = "/dashboard/faculty/reviews";

// ======================== STUDENT ACTIONS ========================

/**
 * Create a new case presentation entry (inline row insert).
 */
export async function createCasePresentation(data: CasePresentationInput) {
	const clerkId = await requireAuth();
	const validated = casePresentationSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const lastEntry = await prisma.casePresentation.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	// Check if auto-review is enabled for case presentations
	const autoReview = await prisma.hodAutoReviewSetting.findUnique({
		where: { category: "casePresentations" },
	});
	const autoSign = autoReview?.enabled ?? false;

	const entry = await prisma.casePresentation.create({
		data: {
			userId: user.id,
			slNo,
			date: validated.date ?? null,
			patientName: validated.patientName ?? null,
			patientAge: validated.patientAge ?? null,
			patientSex: validated.patientSex ?? null,
			uhid: validated.uhid ?? null,
			completeDiagnosis: validated.completeDiagnosis ?? null,
			category: validated.category ?? null,
			facultyRemark: validated.facultyRemark ?? null,
			facultyId: validated.facultyId ?? null,
			status: autoSign ? "SIGNED" : "DRAFT",
		},
	});

	if (autoSign && validated.facultyId) {
		await prisma.digitalSignature.create({
			data: {
				signedById: validated.facultyId,
				entityType: "CasePresentation",
				entityId: entry.id,
				remark: "Auto-signed",
			},
		});
	}

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	return { success: true, data: entry };
}

/**
 * Update an existing case presentation entry (inline cell edit).
 */
export async function updateCasePresentation(
	id: string,
	data: CasePresentationInput,
) {
	const clerkId = await requireAuth();
	const validated = casePresentationSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.casePresentation.update({
		where: { id },
		data: {
			date: validated.date ?? null,
			patientName: validated.patientName ?? null,
			patientAge: validated.patientAge ?? null,
			patientSex: validated.patientSex ?? null,
			uhid: validated.uhid ?? null,
			completeDiagnosis: validated.completeDiagnosis ?? null,
			category: validated.category ?? null,
			facultyRemark: validated.facultyRemark ?? null,
			facultyId: validated.facultyId ?? null,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidatePath(STUDENT_PATH);
	return { success: true, data: entry };
}

/**
 * Submit a case presentation for faculty review.
 */
export async function submitCasePresentation(id: string) {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Only draft or revision entries can be submitted");
	}

	// Check if auto-review is enabled
	const autoReview = await prisma.hodAutoReviewSetting.findUnique({
		where: { category: "casePresentations" },
	});

	if (autoReview?.enabled) {
		await prisma.$transaction([
			prisma.casePresentation.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			...(existing.facultyId ?
				[
					prisma.digitalSignature.create({
						data: {
							signedById: existing.facultyId,
							entityType: "CasePresentation",
							entityId: id,
							remark: "Auto-signed",
						},
					}),
				]
			:	[]),
		]);
	} else {
		await prisma.casePresentation.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(REVIEW_PATH);
	return { success: true };
}

/**
 * Delete a draft case presentation entry.
 */
export async function deleteCasePresentation(id: string) {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.casePresentation.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.casePresentation.delete({ where: { id } });

	// Renumber remaining entries
	const remaining = await prisma.casePresentation.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
	for (let i = 0; i < remaining.length; i++) {
		if (remaining[i].slNo !== i + 1) {
			await prisma.casePresentation.update({
				where: { id: remaining[i].id },
				data: { slNo: i + 1 },
			});
		}
	}

	revalidatePath(STUDENT_PATH);
	return { success: true };
}

/**
 * Get all case presentations for the current student.
 */
export async function getMyCasePresentations() {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	return prisma.casePresentation.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty/HOD: Get a specific student's case presentations (view-only).
 */
export async function getStudentCasePresentations(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.casePresentation.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty/HOD: Get basic student info for view header.
 */
export async function getStudentBasicInfo(studentId: string) {
	await requireRole(["faculty", "hod"]);
	const student = await prisma.user.findUnique({
		where: { id: studentId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			currentSemester: true,
			batchRelation: { select: { name: true } },
		},
	});
	if (!student) throw new Error("Student not found");
	return student;
}

// ======================== FACULTY / HOD ACTIONS ========================

/**
 * Get available faculty/HOD users for the "Faculty Sign" dropdown.
 */
export async function getAvailableFaculty() {
	const users = await prisma.user.findMany({
		where: { role: { in: ["FACULTY", "HOD"] } },
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
	return users;
}

/**
 * Get case presentations for review — scoped by role.
 */
export async function getCasePresentationsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	let studentFilter: Record<string, unknown> = {};

	if (role === "faculty") {
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
		const studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
		studentFilter = { userId: { in: studentIds } };
	}

	return prisma.casePresentation.findMany({
		where: {
			...studentFilter,
			status: { not: "DRAFT" as never },
		},
		include: {
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
		orderBy: { createdAt: "desc" },
	});
}

/**
 * Faculty: Sign a case presentation entry.
 */
export async function signCasePresentation(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

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
				signedById: user.id,
				entityType: "CasePresentation",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(REVIEW_PATH);
	return { success: true };
}

/**
 * Faculty: Reject / request revision on a case presentation.
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

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(REVIEW_PATH);
	return { success: true };
}

/**
 * Faculty/HOD: Bulk sign multiple case presentations.
 */
export async function bulkSignCasePresentations(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	let signedCount = 0;
	for (const id of ids) {
		const entry = await prisma.casePresentation.findUnique({ where: { id } });
		if (entry && entry.status === "SUBMITTED") {
			await prisma.$transaction([
				prisma.casePresentation.update({
					where: { id },
					data: { status: "SIGNED" },
				}),
				prisma.digitalSignature.create({
					data: {
						signedById: user.id,
						entityType: "CasePresentation",
						entityId: id,
						remark: "Bulk signed",
					},
				}),
			]);
			signedCount++;
		}
	}

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(REVIEW_PATH);
	return { success: true, signedCount };
}
