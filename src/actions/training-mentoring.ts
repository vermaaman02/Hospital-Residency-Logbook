/**
 * @module Training & Mentoring Actions
 * @description Server actions for Resident Training & Mentoring Records.
 * 5-domain evaluation (Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research).
 * Faculty evaluates, students view, HOD oversees.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 * @see prisma/schema.prisma — TrainingMentoringRecord model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	trainingMentoringSchema,
	type TrainingMentoringInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { recordReview } from "@/lib/entry-revisions";

/**
 * Faculty/HOD: Create or update a 5-domain training record for a student's semester.
 */
export async function upsertTrainingRecord(
	studentId: string,
	data: TrainingMentoringInput,
) {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const validated = trainingMentoringSchema.parse(data);

	const facultyUser = await prisma.user.findUnique({
		where: { clerkId: userId },
	});
	if (!facultyUser) throw new Error("Faculty not found");

	// Calculate overall average
	const scores = [
		validated.knowledgeScore,
		validated.clinicalSkillScore,
		validated.proceduralSkillScore,
		validated.softSkillScore,
		validated.researchScore,
	].filter((s): s is number => s !== undefined && s !== null);

	const overallScore =
		scores.length > 0 ?
			Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
		:	null;

	// HOD evaluations are auto-signed; faculty evaluations need HOD sign-off
	const entryStatus = role === "hod" ? "SIGNED" : "SUBMITTED";

	// Upsert by userId + semester (unique constraint)
	const existing = await prisma.trainingMentoringRecord.findFirst({
		where: { userId: studentId, semester: validated.semester },
	});

	let record;
	if (existing) {
		record = await prisma.trainingMentoringRecord.update({
			where: { id: existing.id },
			data: {
				knowledgeScore: validated.knowledgeScore,
				clinicalSkillScore: validated.clinicalSkillScore,
				proceduralSkillScore: validated.proceduralSkillScore,
				softSkillScore: validated.softSkillScore,
				researchScore: validated.researchScore,
				overallScore,
				evaluatedById: facultyUser.id,
				remarks: validated.remarks,
				status: entryStatus,
			},
		});
	} else {
		record = await prisma.trainingMentoringRecord.create({
			data: {
				userId: studentId,
				semester: validated.semester,
				knowledgeScore: validated.knowledgeScore,
				clinicalSkillScore: validated.clinicalSkillScore,
				proceduralSkillScore: validated.proceduralSkillScore,
				softSkillScore: validated.softSkillScore,
				researchScore: validated.researchScore,
				overallScore,
				evaluatedById: facultyUser.id,
				remarks: validated.remarks,
				status: entryStatus,
			},
		});
	}

	// Auto-sign for HOD
	if (role === "hod") {
		const existingSig = await prisma.digitalSignature.findFirst({
			where: {
				signedById: facultyUser.id,
				entityType: "TrainingMentoringRecord",
				entityId: record.id,
			},
		});
		if (!existingSig) {
			await prisma.digitalSignature.create({
				data: {
					signedById: facultyUser.id,
					entityType: "TrainingMentoringRecord",
					entityId: record.id,
				},
			});
		}
		await recordReview(prisma, {
			entityType: "TrainingMentoringRecord",
			entityId: record.id,
			ownerId: record.userId,
			reviewerId: facultyUser.id,
			reviewerRole: "hod",
			decision: "SIGNED",
			remark: null,
		});
	}

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	emitRealtimeEvent("entry:updated");
	return { success: true, data: record };
}

/**
 * Get all training records for a student.
 */
export async function getStudentTrainingRecords(studentId?: string) {
	if (studentId) {
		await requireRole(["faculty", "hod"]);
		return prisma.trainingMentoringRecord.findMany({
			where: { userId: studentId },
			orderBy: { semester: "asc" },
		});
	}

	// Student viewing own
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	return prisma.trainingMentoringRecord.findMany({
		where: { userId: user.id },
		orderBy: { semester: "asc" },
	});
}

/**
 * HOD: Sign a training record (final approval).
 */
export async function signTrainingRecord(recordId: string) {
	const { userId } = await requireRole(["hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const record = await prisma.trainingMentoringRecord.findUnique({
		where: { id: recordId },
	});
	if (!record) throw new Error("Record not found");

	await prisma.$transaction(async (tx) => {
		await tx.trainingMentoringRecord.update({
			where: { id: recordId },
			data: { status: "SIGNED" },
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "TrainingMentoringRecord",
				entityId: recordId,
			},
		});
		await recordReview(tx, {
			entityType: "TrainingMentoringRecord",
			entityId: recordId,
			ownerId: record.userId,
			reviewerId: user.id,
			reviewerRole: "hod",
			decision: "SIGNED",
			remark: null,
		});
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	emitRealtimeEvent("entry:updated");
	return { success: true };
}
