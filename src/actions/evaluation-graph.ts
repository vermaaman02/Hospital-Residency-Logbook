/**
 * @module Evaluation Graph Actions
 * @description Server actions for Resident Evaluation Graph.
 * 5-domain evaluation (Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research).
 * Plus Theory/Practical marks. Faculty/HOD evaluates, students view.
 * HOD can toggle whether faculty can fill evaluations.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 * @see prisma/schema.prisma — TrainingMentoringRecord model
 */

"use server";

import { requireRole, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";

// ======================== REVALIDATION ========================

function revalidateAll() {
	revalidatePath("/dashboard/student/evaluation-graph");
	revalidatePath("/dashboard/faculty/evaluation-graph");
	revalidatePath("/dashboard/hod/evaluation-graph");
}

// ======================== TYPES ========================

export interface EvaluationGraphEntry {
	id: string;
	userId: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	theoryMarks: string | null;
	practicalMarks: string | null;
	evaluatedById: string | null;
	remarks: string | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		currentSemester: number | null;
		batchRelation?: { id: string; name: string } | null;
	};
}

// ======================== FACULTY/HOD: GET STUDENTS FOR EVALUATION ========================

/**
 * Get all students available for evaluation.
 * Faculty sees assigned batches, HOD sees all.
 */
export async function getStudentsForEvaluationGraph() {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	let whereClause: Record<string, unknown> = {
		role: "STUDENT" as never,
		status: "ACTIVE",
	};

	if (role === "faculty") {
		// Check if faculty can fill evaluation graph
		const facultyEnabled = await isAutoReviewEnabled(
			"evaluationGraphFacultyEnabled",
		);
		if (!facultyEnabled) {
			return [];
		}

		// Get assigned batch IDs
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);

		if (batchIds.length === 0) return [];
		whereClause = {
			...whereClause,
			batchId: { in: batchIds },
		};
	}

	const students = await prisma.user.findMany({
		where: whereClause,
		select: {
			id: true,
			clerkId: true,
			firstName: true,
			lastName: true,
			email: true,
			currentSemester: true,
			batchRelation: { select: { id: true, name: true } },
		},
		orderBy: [{ batchRelation: { name: "asc" } }, { firstName: "asc" }],
	});

	return students;
}

/**
 * Get all batches for filtering.
 */
export async function getBatchesForEvaluationGraph() {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	if (role === "hod") {
		return prisma.batch.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		});
	}

	// Faculty sees only assigned batches
	const assignments = await prisma.facultyBatchAssignment.findMany({
		where: { facultyId: user.id },
		select: { batch: { select: { id: true, name: true } } },
	});

	const batches = assignments.map((a) => a.batch);
	return batches;
}

// ======================== GET EVALUATION RECORDS ========================

/**
 * Get evaluation records for a specific student.
 */
export async function getStudentEvaluationGraph(studentId: string) {
	await requireRole(["faculty", "hod"]);

	const records = await prisma.trainingMentoringRecord.findMany({
		where: { userId: studentId },
		orderBy: { semester: "asc" },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					currentSemester: true,
					batchRelation: { select: { id: true, name: true } },
				},
			},
		},
	});

	return records;
}

/**
 * Get all evaluation records for students (faculty sees assigned, HOD sees all).
 */
export async function getAllEvaluationGraphRecords() {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	let whereClause: Record<string, unknown> = {};

	if (role === "faculty") {
		// Check if faculty can fill evaluation graph
		const facultyEnabled = await isAutoReviewEnabled(
			"evaluationGraphFacultyEnabled",
		);
		if (!facultyEnabled) {
			return [];
		}

		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);

		if (batchIds.length === 0) return [];

		whereClause = {
			user: { batchId: { in: batchIds } },
		};
	}

	const records = await prisma.trainingMentoringRecord.findMany({
		where: whereClause,
		orderBy: [
			{ user: { batchRelation: { name: "asc" } } },
			{ user: { firstName: "asc" } },
			{ semester: "asc" },
		],
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					currentSemester: true,
					batchRelation: { select: { id: true, name: true } },
				},
			},
		},
	});

	return records;
}

/**
 * Student: Get my evaluation graph records.
 */
export async function getMyEvaluationGraph() {
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const records = await prisma.trainingMentoringRecord.findMany({
		where: { userId: user.id },
		orderBy: { semester: "asc" },
	});

	return records;
}

// ======================== UPSERT EVALUATION RECORD ========================

/**
 * Faculty/HOD: Create or update evaluation for a student's semester.
 */
export async function upsertEvaluationGraphEntry(
	studentId: string,
	semester: number,
	data: {
		knowledgeScore?: number | null;
		clinicalSkillScore?: number | null;
		proceduralSkillScore?: number | null;
		softSkillScore?: number | null;
		researchScore?: number | null;
		theoryMarks?: string | null;
		practicalMarks?: string | null;
		remarks?: string | null;
	},
) {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	// Faculty permission check
	if (role === "faculty") {
		const facultyEnabled = await isAutoReviewEnabled(
			"evaluationGraphFacultyEnabled",
		);
		if (!facultyEnabled) {
			throw new Error(
				"Faculty evaluation is disabled. Only HOD can fill evaluations.",
			);
		}
	}

	// Validate scores 1-5
	const scores = [
		data.knowledgeScore,
		data.clinicalSkillScore,
		data.proceduralSkillScore,
		data.softSkillScore,
		data.researchScore,
	].filter((s): s is number => s !== undefined && s !== null);

	for (const score of scores) {
		if (score < 1 || score > 5) {
			throw new Error("Scores must be between 1 and 5");
		}
	}

	// Calculate overall average
	const overallScore =
		scores.length > 0 ?
			Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
		:	null;

	// HOD evaluations are auto-signed; faculty evaluations need HOD sign-off
	const entryStatus = role === "hod" ? "SIGNED" : "SUBMITTED";

	// Check if record exists
	const existing = await prisma.trainingMentoringRecord.findFirst({
		where: { userId: studentId, semester },
	});

	let record;
	if (existing) {
		record = await prisma.trainingMentoringRecord.update({
			where: { id: existing.id },
			data: {
				knowledgeScore: data.knowledgeScore ?? existing.knowledgeScore,
				clinicalSkillScore:
					data.clinicalSkillScore ?? existing.clinicalSkillScore,
				proceduralSkillScore:
					data.proceduralSkillScore ?? existing.proceduralSkillScore,
				softSkillScore: data.softSkillScore ?? existing.softSkillScore,
				researchScore: data.researchScore ?? existing.researchScore,
				overallScore,
				theoryMarks: data.theoryMarks ?? existing.theoryMarks,
				practicalMarks: data.practicalMarks ?? existing.practicalMarks,
				evaluatedById: user.id,
				remarks: data.remarks ?? existing.remarks,
				status: entryStatus,
			},
		});
	} else {
		record = await prisma.trainingMentoringRecord.create({
			data: {
				userId: studentId,
				semester,
				knowledgeScore: data.knowledgeScore,
				clinicalSkillScore: data.clinicalSkillScore,
				proceduralSkillScore: data.proceduralSkillScore,
				softSkillScore: data.softSkillScore,
				researchScore: data.researchScore,
				overallScore,
				theoryMarks: data.theoryMarks,
				practicalMarks: data.practicalMarks,
				evaluatedById: user.id,
				remarks: data.remarks,
				status: entryStatus,
			},
		});
	}

	// Auto-sign for HOD
	if (role === "hod") {
		const existingSig = await prisma.digitalSignature.findFirst({
			where: {
				signedById: user.id,
				entityType: "TrainingMentoringRecord",
				entityId: record.id,
			},
		});
		if (!existingSig) {
			await prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "TrainingMentoringRecord",
					entityId: record.id,
				},
			});
		}
	}

	revalidateAll();
	return { success: true, data: record };
}

// ======================== HOD: SIGN FACULTY EVALUATION ========================

/**
 * HOD: Sign a training record submitted by faculty.
 */
export async function signEvaluationGraphEntry(recordId: string) {
	const { role } = await requireRole(["hod"]);
	if (role !== "hod") throw new Error("Only HOD can sign evaluations");

	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const record = await prisma.trainingMentoringRecord.findUnique({
		where: { id: recordId },
		include: { user: { select: { clerkId: true, firstName: true } } },
	});
	if (!record) throw new Error("Record not found");

	await prisma.trainingMentoringRecord.update({
		where: { id: recordId },
		data: { status: "SIGNED" },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "TrainingMentoringRecord",
			entityId: recordId,
		},
	});

	revalidateAll();
	return { success: true };
}

/**
 * HOD: Bulk sign multiple evaluations.
 */
export async function bulkSignEvaluationGraphEntries(recordIds: string[]) {
	const { role } = await requireRole(["hod"]);
	if (role !== "hod") throw new Error("Only HOD can sign evaluations");

	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const records = await prisma.trainingMentoringRecord.findMany({
		where: { id: { in: recordIds }, status: "SUBMITTED" },
		include: { user: { select: { clerkId: true, firstName: true } } },
	});

	for (const record of records) {
		await prisma.trainingMentoringRecord.update({
			where: { id: record.id },
			data: { status: "SIGNED" },
		});

		await prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "TrainingMentoringRecord",
				entityId: record.id,
			},
		});
	}

	revalidateAll();
	return { success: true, count: records.length };
}

// ======================== DELETE EVALUATION ========================

/**
 * HOD: Delete an evaluation record.
 */
export async function deleteEvaluationGraphEntry(recordId: string) {
	const { role } = await requireRole(["hod"]);
	if (role !== "hod") throw new Error("Only HOD can delete evaluations");

	const record = await prisma.trainingMentoringRecord.findUnique({
		where: { id: recordId },
	});
	if (!record) throw new Error("Record not found");

	// Delete signatures first
	await prisma.digitalSignature.deleteMany({
		where: {
			entityType: "TrainingMentoringRecord",
			entityId: recordId,
		},
	});

	await prisma.trainingMentoringRecord.delete({
		where: { id: recordId },
	});

	revalidateAll();
	return { success: true };
}

// ======================== CHECK FACULTY ENABLED ========================

/**
 * Check if faculty can fill evaluation graph.
 */
export async function isFacultyEvaluationEnabled() {
	return isAutoReviewEnabled("evaluationGraphFacultyEnabled");
}
