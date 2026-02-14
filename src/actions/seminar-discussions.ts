/**
 * @module Seminar Discussion Actions
 * @description Server actions for CRUD on seminar/evidence-based discussion entries.
 * Supports inline editing, faculty assignment, auto-sign, faculty/HOD review.
 * Mirrors case-presentations.ts exactly (same fields, same workflow).
 *
 * @see PG Logbook .md — Section: "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 * @see prisma/schema.prisma — Seminar model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seminarSchema, type SeminarInput } from "@/lib/validators/academics";
import { revalidatePath } from "next/cache";

const STUDENT_PATH = "/dashboard/student/case-presentations";
const FACULTY_PATH = "/dashboard/faculty/case-presentations";
const REVIEW_PATH = "/dashboard/faculty/reviews";

// ======================== STUDENT ACTIONS ========================

/**
 * Create a new seminar discussion entry (inline row insert).
 */
export async function createSeminarDiscussion(data: SeminarInput) {
	const clerkId = await requireAuth();
	const validated = seminarSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const lastEntry = await prisma.seminar.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	// Check if auto-review is enabled for seminar discussions
	const autoReview = await prisma.hodAutoReviewSetting.findUnique({
		where: { category: "seminarDiscussions" },
	});
	const autoSign = autoReview?.enabled ?? false;

	const entry = await prisma.seminar.create({
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
				entityType: "Seminar",
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
 * Update an existing seminar discussion entry (inline cell edit).
 */
export async function updateSeminarDiscussion(id: string, data: SeminarInput) {
	const clerkId = await requireAuth();
	const validated = seminarSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.seminar.update({
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
 * Submit a seminar discussion for faculty review.
 */
export async function submitSeminarDiscussion(id: string) {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Only draft or revision entries can be submitted");
	}

	// Check if auto-review is enabled
	const autoReview = await prisma.hodAutoReviewSetting.findUnique({
		where: { category: "seminarDiscussions" },
	});

	if (autoReview?.enabled) {
		await prisma.$transaction([
			prisma.seminar.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			...(existing.facultyId ?
				[
					prisma.digitalSignature.create({
						data: {
							signedById: existing.facultyId,
							entityType: "Seminar",
							entityId: id,
							remark: "Auto-signed",
						},
					}),
				]
			:	[]),
		]);
	} else {
		await prisma.seminar.update({
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
 * Delete a draft seminar discussion entry.
 */
export async function deleteSeminarDiscussion(id: string) {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.seminar.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.seminar.delete({ where: { id } });

	// Renumber remaining entries
	const remaining = await prisma.seminar.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
	for (let i = 0; i < remaining.length; i++) {
		if (remaining[i].slNo !== i + 1) {
			await prisma.seminar.update({
				where: { id: remaining[i].id },
				data: { slNo: i + 1 },
			});
		}
	}

	revalidatePath(STUDENT_PATH);
	return { success: true };
}

/**
 * Get all seminar discussions for the current student.
 */
export async function getMySeminarDiscussions() {
	const clerkId = await requireAuth();

	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	return prisma.seminar.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty/HOD: Get a specific student's seminar discussions (view-only).
 */
export async function getStudentSeminarDiscussions(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.seminar.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

// ======================== FACULTY / HOD ACTIONS ========================

/**
 * Get seminar discussions for review — scoped by role.
 */
export async function getSeminarDiscussionsForReview() {
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

	return prisma.seminar.findMany({
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
 * Faculty: Sign a seminar discussion entry.
 */
export async function signSeminarDiscussion(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

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
				signedById: user.id,
				entityType: "Seminar",
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
 * Faculty: Reject / request revision on a seminar discussion.
 */
export async function rejectSeminarDiscussion(id: string, remark: string) {
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

	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(REVIEW_PATH);
	return { success: true };
}

/**
 * Faculty/HOD: Bulk sign multiple seminar discussions.
 */
export async function bulkSignSeminarDiscussions(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	let signedCount = 0;
	for (const id of ids) {
		const entry = await prisma.seminar.findUnique({ where: { id } });
		if (entry && entry.status === "SUBMITTED") {
			await prisma.$transaction([
				prisma.seminar.update({
					where: { id },
					data: { status: "SIGNED" },
				}),
				prisma.digitalSignature.create({
					data: {
						signedById: user.id,
						entityType: "Seminar",
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
