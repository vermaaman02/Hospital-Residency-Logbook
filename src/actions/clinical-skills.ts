/**
 * @module Clinical Skills Actions
 * @description Server actions for clinical skills (Adult & Pediatric).
 * 10 fixed skills per type. Auto-initializes on first access.
 * Supports inline editing, faculty sign-off, bulk operations, auto-review,
 * and student detail views.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 * @see prisma/schema.prisma — ClinicalSkillAdult, ClinicalSkillPediatric
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	CLINICAL_SKILLS_ADULT,
	CLINICAL_SKILLS_PEDIATRIC,
} from "@/lib/constants/clinical-skills";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";

// ======================== PATHS ========================

const STUDENT_PATH = "/dashboard/student/clinical-skills";
const FACULTY_PATH = "/dashboard/faculty/clinical-skills";
const HOD_PATH = "/dashboard/hod/clinical-skills";

function revalidateAll() {
	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(HOD_PATH);
}

// ======================== TYPES ========================

interface ClinicalSkillData {
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyId: string | null;
}

// ======================== HELPERS ========================

function getModel(type: "adult" | "pediatric") {
	return type === "adult" ?
			prisma.clinicalSkillAdult
		:	prisma.clinicalSkillPediatric;
}

function getSkillList(type: "adult" | "pediatric") {
	return type === "adult" ? CLINICAL_SKILLS_ADULT : CLINICAL_SKILLS_PEDIATRIC;
}

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

// ======================== STUDENT ACTIONS ========================

/**
 * Auto-initialize all 10 skills for a student if none exist yet.
 */
export async function initializeClinicalSkills(type: "adult" | "pediatric") {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const model = getModel(type);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { userId: user.id },
		select: { id: true },
	});

	if (existing.length > 0) return { initialized: false };

	const skills = getSkillList(type);
	await Promise.all(
		skills.map((skill) =>
			(model as typeof prisma.clinicalSkillAdult).create({
				data: {
					userId: user.id,
					slNo: skill.slNo,
					skillName: skill.name,
					totalTimesPerformed: 0,
					status: "DRAFT",
				},
			}),
		),
	);

	revalidateAll();
	return { initialized: true };
}

/**
 * Get all clinical skills entries for the current student.
 */
export async function getMyClinicalSkills(type: "adult" | "pediatric") {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const model = getModel(type);

	return (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Get available faculty for the observing faculty dropdown.
 */
export async function getAvailableClinicalSkillFaculty() {
	await requireAuth();
	return prisma.user.findMany({
		where: {
			role: { in: ["FACULTY" as never, "HOD" as never] },
			status: "ACTIVE" as never,
		},
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
}

/**
 * Update a clinical skill entry (inline save).
 */
export async function updateClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	data: ClinicalSkillData,
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const model = getModel(type);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findUnique(
		{ where: { id } },
	);
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await (model as typeof prisma.clinicalSkillAdult).update({
		where: { id },
		data: {
			representativeDiagnosis: data.representativeDiagnosis,
			confidenceLevel: data.confidenceLevel as never,
			totalTimesPerformed: data.totalTimesPerformed,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return { success: true, data: entry };
}

/**
 * Submit a clinical skill entry for faculty review.
 * If auto-review is enabled, automatically signs it.
 */
export async function submitClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const model = getModel(type);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findUnique(
		{ where: { id } },
	);
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("clinicalSkills");
	const entityType =
		type === "adult" ? "ClinicalSkillAdult" : "ClinicalSkillPediatric";

	if (autoReview) {
		await prisma.$transaction([
			(model as typeof prisma.clinicalSkillAdult).update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType,
					entityId: id,
					remark: "Auto-approved",
				},
			}),
		]);
	} else {
		await (model as typeof prisma.clinicalSkillAdult).update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateAll();
	return { success: true };
}

// ======================== FACULTY / HOD ACTIONS ========================

/**
 * Faculty/HOD: Get all clinical skill submissions for review.
 */
export async function getClinicalSkillsForReview(type: "adult" | "pediatric") {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	let studentIds: string[] = [];

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
		studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
	}

	const where =
		studentIds.length > 0 ?
			{ userId: { in: studentIds }, status: { not: "DRAFT" as never } }
		:	{ status: { not: "DRAFT" as never } };
	const model = getModel(type);

	return (model as typeof prisma.clinicalSkillAdult).findMany({
		where,
		orderBy: { createdAt: "desc" },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					currentSemester: true,
					batchRelation: { select: { name: true } },
				},
			},
		},
	});
}

/**
 * Faculty/HOD: Sign (approve) a clinical skill entry.
 */
export async function signClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	remark?: string,
) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);
	const model = getModel(type);

	const entry = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	const entityType =
		type === "adult" ? "ClinicalSkillAdult" : "ClinicalSkillPediatric";

	await prisma.$transaction([
		(model as typeof prisma.clinicalSkillAdult).update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType,
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

/**
 * Faculty/HOD: Reject a clinical skill entry with remark.
 */
export async function rejectClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	remark: string,
) {
	await requireRole(["faculty", "hod"]);
	const model = getModel(type);

	const entry = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");

	await (model as typeof prisma.clinicalSkillAdult).update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

/**
 * Faculty/HOD: Bulk sign multiple clinical skill entries.
 */
export async function bulkSignClinicalSkills(
	type: "adult" | "pediatric",
	ids: string[],
) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);
	const model = getModel(type);
	const entityType =
		type === "adult" ? "ClinicalSkillAdult" : "ClinicalSkillPediatric";

	const entries = await (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No submittable entries found");

	await prisma.$transaction([
		(model as typeof prisma.clinicalSkillAdult).updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType,
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

/**
 * Faculty/HOD: Get a specific student's clinical skill entries.
 */
export async function getStudentClinicalSkills(
	studentId: string,
	type: "adult" | "pediatric",
) {
	await requireRole(["faculty", "hod"]);
	const model = getModel(type);

	return (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
