/**
 * @module Thesis Tracking Actions
 * @description Server actions for thesis topic, chief guide, and semester records.
 * Faculty member field uses faculty dropdown (linked to batch).
 *
 * @see PG Logbook .md — Thesis section: Topic, Chief Guide, Semester 1-6 records
 * @see prisma/schema.prisma — Thesis, ThesisSemesterRecord models
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	thesisSchema,
	thesisSemesterRecordSchema,
	type ThesisInput,
	type ThesisSemesterRecordInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";

/**
 * Get or create the user's thesis record. Each student has exactly one.
 */
export async function getMyThesis() {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	let thesis = await prisma.thesis.findUnique({
		where: { userId: user.id },
		include: {
			semesterRecords: { orderBy: { semester: "asc" } },
		},
	});

	if (!thesis) {
		thesis = await prisma.thesis.create({
			data: { userId: user.id, topic: "", chiefGuide: "" },
			include: {
				semesterRecords: { orderBy: { semester: "asc" } },
			},
		});
	}

	return thesis;
}

/**
 * Update thesis topic and chief guide.
 */
export async function updateThesis(data: ThesisInput) {
	const userId = await requireAuth();
	const validated = thesisSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const thesis = await prisma.thesis.upsert({
		where: { userId: user.id },
		create: {
			userId: user.id,
			topic: validated.topic,
			chiefGuide: validated.chiefGuide,
		},
		update: {
			topic: validated.topic,
			chiefGuide: validated.chiefGuide,
		},
		include: {
			semesterRecords: { orderBy: { semester: "asc" } },
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: thesis };
}

/**
 * Submit thesis for faculty/HOD review.
 */
export async function submitThesis(thesisId: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const thesis = await prisma.thesis.findUnique({ where: { id: thesisId } });
	if (!thesis) throw new Error("Thesis not found");
	if (thesis.userId !== user.id) throw new Error("Unauthorized");
	if (!thesis.topic?.trim())
		throw new Error("Thesis topic is required before submitting");
	if (thesis.status === "SUBMITTED")
		throw new Error("Thesis is already submitted");
	if (thesis.status === "SIGNED") throw new Error("Thesis is already approved");

	await prisma.thesis.update({
		where: { id: thesisId },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	return { success: true };
}

/**
 * Upsert a semester record for the thesis.
 * Re-editing resets status to DRAFT.
 */
export async function upsertThesisSemesterRecord(
	thesisId: string,
	data: ThesisSemesterRecordInput,
) {
	await requireAuth();
	const validated = thesisSemesterRecordSchema.parse(data);

	const existing = await prisma.thesisSemesterRecord.findFirst({
		where: { thesisId, semester: validated.semester },
	});

	let record;
	if (existing) {
		record = await prisma.thesisSemesterRecord.update({
			where: { id: existing.id },
			data: {
				srJrMember: validated.srJrMember,
				srMember: validated.srMember,
				facultyMember: validated.facultyMember,
				status: "DRAFT",
				facultyRemark: null,
			},
		});
	} else {
		record = await prisma.thesisSemesterRecord.create({
			data: {
				thesisId,
				semester: validated.semester,
				srJrMember: validated.srJrMember,
				srMember: validated.srMember,
				facultyMember: validated.facultyMember,
				status: "DRAFT",
			},
		});
	}

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: record };
}

/**
 * Student: Submit a semester record for faculty/HOD review.
 */
export async function submitSemesterRecord(recordId: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const record = await prisma.thesisSemesterRecord.findUnique({
		where: { id: recordId },
		include: { thesis: { select: { userId: true } } },
	});
	if (!record) throw new Error("Semester record not found");
	if (record.thesis.userId !== user.id) throw new Error("Unauthorized");
	if (!record.srJrMember && !record.srMember && !record.facultyMember) {
		throw new Error("Fill at least one committee member before submitting");
	}
	if (record.status === "SUBMITTED")
		throw new Error("Already submitted for review");
	if (record.status === "SIGNED") throw new Error("Already approved");

	await prisma.thesisSemesterRecord.update({
		where: { id: recordId },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	return { success: true };
}

/**
 * Faculty/HOD: Sign (approve) a semester record.
 */
export async function signSemesterRecord(recordId: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const record = await prisma.thesisSemesterRecord.findUnique({
		where: { id: recordId },
	});
	if (!record) throw new Error("Semester record not found");

	await prisma.thesisSemesterRecord.update({
		where: { id: recordId },
		data: { status: "SIGNED", facultyRemark: remark || null },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "ThesisSemesterRecord",
			entityId: recordId,
			remark: remark || null,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/faculty/thesis-review");
	revalidatePath("/dashboard/hod/thesis-review");
	return { success: true };
}

/**
 * Faculty/HOD: Reject a semester record with remark.
 */
export async function rejectSemesterRecord(recordId: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const record = await prisma.thesisSemesterRecord.findUnique({
		where: { id: recordId },
	});
	if (!record) throw new Error("Semester record not found");

	await prisma.thesisSemesterRecord.update({
		where: { id: recordId },
		data: { status: "NEEDS_REVISION", facultyRemark: remark },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/faculty/thesis-review");
	revalidatePath("/dashboard/hod/thesis-review");
	return { success: true };
}

/**
 * Faculty/HOD: View a student's thesis.
 */
export async function getStudentThesis(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.thesis.findUnique({
		where: { userId: studentId },
		include: {
			semesterRecords: { orderBy: { semester: "asc" } },
		},
	});
}

/**
 * Faculty/HOD: Get all students' theses for review.
 * Faculty sees only batch-assigned students; HOD sees all.
 */
export async function getThesesForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);

	const facultyUser = await prisma.user.findUnique({
		where: { clerkId: userId },
	});
	if (!facultyUser) throw new Error("User not found");

	let studentIds: string[] | undefined;

	if (role === "faculty") {
		// Use batch-level assignments (same pattern as rotation postings)
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: facultyUser.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
	}

	const theses = await prisma.thesis.findMany({
		where: studentIds ? { userId: { in: studentIds } } : {},
		include: {
			semesterRecords: { orderBy: { semester: "asc" } },
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					batchRelation: { select: { name: true } },
					currentSemester: true,
				},
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	return theses;
}

/**
 * Faculty/HOD: Sign (approve) a thesis record.
 */
export async function signThesis(thesisId: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const thesis = await prisma.thesis.findUnique({ where: { id: thesisId } });
	if (!thesis) throw new Error("Thesis not found");

	await prisma.thesis.update({
		where: { id: thesisId },
		data: {
			status: "SIGNED",
			facultyRemark: remark || null,
		},
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "Thesis",
			entityId: thesisId,
			remark: remark || null,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/faculty/thesis-review");
	revalidatePath("/dashboard/hod/thesis-review");
	return { success: true };
}

/**
 * Faculty/HOD: Reject a thesis record with remark.
 */
export async function rejectThesis(thesisId: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const thesis = await prisma.thesis.findUnique({ where: { id: thesisId } });
	if (!thesis) throw new Error("Thesis not found");

	await prisma.thesis.update({
		where: { id: thesisId },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/faculty/thesis-review");
	revalidatePath("/dashboard/hod/thesis-review");
	return { success: true };
}

/**
 * Faculty/HOD: Bulk sign multiple thesis records.
 */
export async function bulkSignTheses(thesisIds: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	await prisma.thesis.updateMany({
		where: { id: { in: thesisIds } },
		data: { status: "SIGNED" },
	});

	// Create digital signatures for each
	await prisma.digitalSignature.createMany({
		data: thesisIds.map((id) => ({
			signedById: user.id,
			entityType: "Thesis",
			entityId: id,
		})),
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	return { success: true, count: thesisIds.length };
}
