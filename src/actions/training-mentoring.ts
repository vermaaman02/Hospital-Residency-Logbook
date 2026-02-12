/**
 * @module Training & Mentoring Actions
 * @description Server actions for Resident Training & Mentoring Records.
 * 5-point scale evaluation per semester.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 * @see prisma/schema.prisma — TrainingMentoringRecord model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const trainingRecordSchema = z.object({
	semester: z.number().int().min(1).max(6),
	score: z.number().int().min(1).max(5),
	remarks: z.string().optional(),
});

export type TrainingRecordInput = z.infer<typeof trainingRecordSchema>;

/**
 * Create or update a training record for a semester.
 * Faculty sets this for their assigned students.
 */
export async function upsertTrainingRecord(
	studentId: string,
	data: TrainingRecordInput,
) {
	await requireRole(["faculty", "hod"]);
	const validated = trainingRecordSchema.parse(data);

	const existing = await prisma.trainingMentoringRecord.findFirst({
		where: {
			userId: studentId,
			semester: validated.semester,
		},
	});

	let record;
	if (existing) {
		record = await prisma.trainingMentoringRecord.update({
			where: { id: existing.id },
			data: {
				score: validated.score,
				remarks: validated.remarks,
				status: "SUBMITTED",
			},
		});
	} else {
		record = await prisma.trainingMentoringRecord.create({
			data: {
				userId: studentId,
				semester: validated.semester,
				score: validated.score,
				remarks: validated.remarks,
				status: "SUBMITTED",
			},
		});
	}

	revalidatePath("/dashboard/student/training-mentoring");
	revalidatePath("/dashboard/faculty/training-mentoring");
	return { success: true, data: record };
}

/**
 * Get all training records for a student.
 */
export async function getStudentTrainingRecords(studentId?: string) {
	if (studentId) {
		// Faculty/HOD looking at a specific student
		await requireRole(["faculty", "hod"]);
		return prisma.trainingMentoringRecord.findMany({
			where: { userId: studentId },
			orderBy: { semester: "asc" },
		});
	}

	// Student viewing their own
	const userId = await requireAuth();
	return prisma.trainingMentoringRecord.findMany({
		where: { userId },
		orderBy: { semester: "asc" },
	});
}

/**
 * HOD: Sign a training record.
 */
export async function signTrainingRecord(recordId: string) {
	const { userId } = await requireRole(["hod"]);

	const record = await prisma.trainingMentoringRecord.findUnique({
		where: { id: recordId },
	});
	if (!record) throw new Error("Record not found");

	await prisma.trainingMentoringRecord.update({
		where: { id: recordId },
		data: { status: "SIGNED" },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: userId,
			entityType: "TrainingMentoringRecord",
			entityId: recordId,
		},
	});

	revalidatePath("/dashboard/student/training-mentoring");
	return { success: true };
}
