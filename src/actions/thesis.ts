/**
 * @module Thesis Tracking Actions
 * @description Server actions for thesis topic, chief guide, and semester records.
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

	let thesis = await prisma.thesis.findUnique({
		where: { userId },
		include: {
			semesterRecords: {
				orderBy: { semester: "asc" },
			},
		},
	});

	if (!thesis) {
		thesis = await prisma.thesis.create({
			data: {
				userId,
				topic: "",
				chiefGuide: "",
			},
			include: {
				semesterRecords: {
					orderBy: { semester: "asc" },
				},
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

	const thesis = await prisma.thesis.upsert({
		where: { userId },
		create: {
			userId,
			topic: validated.topic,
			chiefGuide: validated.chiefGuide,
		},
		update: {
			topic: validated.topic,
			chiefGuide: validated.chiefGuide,
		},
		include: {
			semesterRecords: {
				orderBy: { semester: "asc" },
			},
		},
	});

	revalidatePath("/dashboard/student/thesis");
	return { success: true, data: thesis };
}

/**
 * Upsert a semester record for the thesis.
 */
export async function upsertThesisSemesterRecord(
	thesisId: string,
	data: ThesisSemesterRecordInput,
) {
	await requireAuth();
	const validated = thesisSemesterRecordSchema.parse(data);

	// Check if a record for this semester already exists
	const existing = await prisma.thesisSemesterRecord.findFirst({
		where: {
			thesisId,
			semester: validated.semester,
		},
	});

	let record;
	if (existing) {
		record = await prisma.thesisSemesterRecord.update({
			where: { id: existing.id },
			data: {
				srJrMember: validated.srJrMember,
				srMember: validated.srMember,
				facultyMember: validated.facultyMember,
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
			},
		});
	}

	revalidatePath("/dashboard/student/thesis");
	return { success: true, data: record };
}

/**
 * Faculty/HOD: View a student's thesis.
 */
export async function getStudentThesis(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.thesis.findUnique({
		where: { userId: studentId },
		include: {
			semesterRecords: {
				orderBy: { semester: "asc" },
			},
		},
	});
}
