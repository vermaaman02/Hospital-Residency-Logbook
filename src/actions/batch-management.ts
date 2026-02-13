/**
 * @module Batch Management Actions
 * @description Server actions for HOD to manage batches (cohorts of students).
 * Batches group students by joining date and track semester progression.
 *
 * @see copilot-instructions.md — Section 10
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

// ======================== VALIDATORS ========================

const createBatchSchema = z.object({
	name: z
		.string()
		.min(1, "Batch name is required")
		.max(100, "Batch name too long"),
	startDate: z.coerce.date({ error: "Valid start date required" }),
	endDate: z.coerce.date().optional(),
	description: z.string().max(500).optional(),
	currentSemester: z.coerce.number().int().min(1).max(6).default(1),
});

const updateBatchSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(100).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	description: z.string().max(500).optional(),
	currentSemester: z.coerce.number().int().min(1).max(6).optional(),
	isActive: z.boolean().optional(),
});

// ======================== ACTIONS ========================

/**
 * Create a new batch (HOD only).
 */
export async function createBatch(formData: {
	name: string;
	startDate: string;
	endDate?: string;
	description?: string;
	currentSemester?: number;
}) {
	await requireRole(["hod"]);

	const validated = createBatchSchema.parse({
		...formData,
		startDate: new Date(formData.startDate),
		endDate: formData.endDate ? new Date(formData.endDate) : undefined,
	});

	// Check for duplicate batch name
	const existing = await prisma.batch.findUnique({
		where: { name: validated.name },
	});
	if (existing) {
		return { success: false, message: "A batch with this name already exists" };
	}

	const batch = await prisma.batch.create({
		data: {
			name: validated.name,
			startDate: validated.startDate,
			endDate: validated.endDate,
			description: validated.description ?? null,
			currentSemester: validated.currentSemester,
		},
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true, batch };
}

/**
 * Update an existing batch (HOD only).
 */
export async function updateBatch(data: {
	id: string;
	name?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	currentSemester?: number;
	isActive?: boolean;
}) {
	await requireRole(["hod"]);

	const validated = updateBatchSchema.parse({
		...data,
		startDate: data.startDate ? new Date(data.startDate) : undefined,
		endDate: data.endDate ? new Date(data.endDate) : undefined,
	});

	// If renaming, check uniqueness
	if (validated.name) {
		const existing = await prisma.batch.findFirst({
			where: { name: validated.name, id: { not: validated.id } },
		});
		if (existing) {
			return {
				success: false,
				message: "A batch with this name already exists",
			};
		}
	}

	const updateData: Record<string, unknown> = {};
	if (validated.name !== undefined) updateData.name = validated.name;
	if (validated.startDate !== undefined)
		updateData.startDate = validated.startDate;
	if (validated.endDate !== undefined) updateData.endDate = validated.endDate;
	if (validated.description !== undefined)
		updateData.description = validated.description;
	if (validated.currentSemester !== undefined)
		updateData.currentSemester = validated.currentSemester;
	if (validated.isActive !== undefined)
		updateData.isActive = validated.isActive;

	const batch = await prisma.batch.update({
		where: { id: validated.id },
		data: updateData,
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true, batch };
}

/**
 * Delete a batch (HOD only). Only if no students are assigned.
 */
export async function deleteBatch(batchId: string) {
	await requireRole(["hod"]);

	const studentCount = await prisma.user.count({
		where: { batchId },
	});

	if (studentCount > 0) {
		return {
			success: false,
			message: `Cannot delete batch with ${studentCount} student(s) assigned. Remove students first.`,
		};
	}

	await prisma.batch.delete({ where: { id: batchId } });

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true };
}

/**
 * Get all batches with student counts (HOD only).
 */
export async function getAllBatches() {
	await requireRole(["hod"]);

	const batches = await prisma.batch.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			_count: { select: { students: true, facultyAssignments: true } },
			facultyAssignments: {
				include: {
					faculty: {
						select: { id: true, firstName: true, lastName: true, email: true },
					},
				},
			},
		},
	});

	return batches.map((b) => ({
		id: b.id,
		name: b.name,
		currentSemester: b.currentSemester,
		startDate: b.startDate.toISOString(),
		endDate: b.endDate?.toISOString() ?? null,
		isActive: b.isActive,
		description: b.description,
		studentCount: b._count.students,
		facultyCount: b._count.facultyAssignments,
		assignedFaculty: b.facultyAssignments.map((fa) => ({
			id: fa.faculty.id,
			firstName: fa.faculty.firstName,
			lastName: fa.faculty.lastName,
			email: fa.faculty.email,
		})),
		createdAt: b.createdAt.toISOString(),
	}));
}

/**
 * Assign a student to a batch (HOD only).
 */
export async function assignStudentToBatch(studentId: string, batchId: string) {
	await requireRole(["hod"]);

	const batch = await prisma.batch.findUnique({ where: { id: batchId } });
	if (!batch) return { success: false, message: "Batch not found" };

	await prisma.user.update({
		where: { id: studentId },
		data: {
			batchId,
			batch: batch.name,
			currentSemester: batch.currentSemester,
		},
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true };
}

/**
 * Remove student from batch (HOD only).
 */
export async function removeStudentFromBatch(studentId: string) {
	await requireRole(["hod"]);

	const student = await prisma.user.findUnique({ where: { id: studentId } });
	if (!student) return { success: false, message: "Student not found" };

	await prisma.user.update({
		where: { id: studentId },
		data: { batchId: null, batch: null },
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true, message: "Removed from batch" };
}

// ======================== FACULTY-BATCH ASSIGNMENT ========================

/**
 * Assign a faculty member to a batch (HOD only).
 * Allows the faculty to view all students in that batch.
 */
export async function assignFacultyToBatch(facultyId: string, batchId: string) {
	await requireRole(["hod"]);

	// Verify faculty exists and is a faculty
	const faculty = await prisma.user.findUnique({ where: { id: facultyId } });
	if (!faculty || faculty.role !== "FACULTY") {
		return { success: false, message: "Invalid faculty user" };
	}

	// Verify batch exists
	const batch = await prisma.batch.findUnique({ where: { id: batchId } });
	if (!batch) return { success: false, message: "Batch not found" };

	// Check if already assigned
	const existing = await prisma.facultyBatchAssignment.findUnique({
		where: {
			facultyId_batchId: { facultyId, batchId },
		},
	});
	if (existing) {
		return {
			success: false,
			message: "Faculty is already assigned to this batch",
		};
	}

	await prisma.facultyBatchAssignment.create({
		data: { facultyId, batchId },
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true, message: `Faculty assigned to "${batch.name}"` };
}

/**
 * Remove a faculty member from a batch (HOD only).
 */
export async function removeFacultyFromBatch(
	facultyId: string,
	batchId: string,
) {
	await requireRole(["hod"]);

	await prisma.facultyBatchAssignment.delete({
		where: {
			facultyId_batchId: { facultyId, batchId },
		},
	});

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true, message: "Faculty removed from batch" };
}

/**
 * Get all faculty-batch assignments for a batch (HOD only).
 */
export async function getBatchFaculty(batchId: string) {
	await requireRole(["hod"]);

	const assignments = await prisma.facultyBatchAssignment.findMany({
		where: { batchId },
		include: {
			faculty: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					profileImage: true,
				},
			},
		},
	});

	return assignments.map((a) => ({
		assignmentId: a.id,
		facultyId: a.facultyId,
		firstName: a.faculty.firstName,
		lastName: a.faculty.lastName,
		email: a.faculty.email,
		profileImage: a.faculty.profileImage,
	}));
}
