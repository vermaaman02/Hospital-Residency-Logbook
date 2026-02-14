/**
 * @module Rotation Posting Actions
 * @description Server actions for CRUD operations on rotation postings.
 * Supports student CRUD, faculty review/sign, HOD oversight.
 * Faculty can only see students in their assigned batch.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 * @see prisma/schema.prisma — RotationPosting model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	rotationPostingSchema,
	type RotationPostingInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";

// ======================== STUDENT ACTIONS ========================

/**
 * Create a new rotation posting entry.
 */
export async function createRotationPosting(data: RotationPostingInput) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found in database");

	// Validate rotation name
	const rotationConfig = ROTATION_POSTINGS.find(
		(r) => r.name === validated.rotationName,
	);
	if (!rotationConfig) throw new Error("Invalid rotation posting name");

	// Auto Sl. No.
	const lastEntry = await prisma.rotationPosting.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	// Calculate days if both dates
	let durationDays: number | null = null;
	if (validated.startDate && validated.endDate) {
		const diffTime =
			validated.endDate.getTime() - validated.startDate.getTime();
		durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (durationDays < 0) throw new Error("End date must be after start date");
	}

	// Validate faculty if provided
	if (validated.facultyId) {
		const faculty = await prisma.user.findUnique({
			where: { id: validated.facultyId },
		});
		if (!faculty || (faculty.role !== "FACULTY" && faculty.role !== "HOD")) {
			throw new Error("Invalid faculty selected");
		}
	}

	const entry = await prisma.rotationPosting.create({
		data: {
			userId: user.id,
			slNo,
			rotationName: validated.rotationName,
			isElective: rotationConfig.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
			durationDays,
			facultyId: validated.facultyId || null,
			status: "DRAFT",
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Update an existing rotation posting entry.
 */
export async function updateRotationPosting(
	id: string,
	data: RotationPostingInput,
) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found or access denied");
	if (existing.status === "SIGNED")
		throw new Error("Cannot edit a signed entry");

	const rotationConfig = ROTATION_POSTINGS.find(
		(r) => r.name === validated.rotationName,
	);
	if (!rotationConfig) throw new Error("Invalid rotation posting name");

	let durationDays: number | null = null;
	if (validated.startDate && validated.endDate) {
		const diffTime =
			validated.endDate.getTime() - validated.startDate.getTime();
		durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (durationDays < 0) throw new Error("End date must be after start date");
	}

	if (validated.facultyId) {
		const faculty = await prisma.user.findUnique({
			where: { id: validated.facultyId },
		});
		if (!faculty || (faculty.role !== "FACULTY" && faculty.role !== "HOD")) {
			throw new Error("Invalid faculty selected");
		}
	}

	const entry = await prisma.rotationPosting.update({
		where: { id },
		data: {
			rotationName: validated.rotationName,
			isElective: rotationConfig.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
			durationDays,
			facultyId: validated.facultyId || null,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Submit a rotation posting for faculty review.
 */
export async function submitRotationPosting(id: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Cannot submit this entry");
	}

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	return { success: true };
}

/**
 * Delete a draft rotation posting.
 */
export async function deleteRotationPosting(id: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id, status: "DRAFT" as never },
	});
	if (!existing) throw new Error("Only draft entries can be deleted");

	await prisma.rotationPosting.delete({ where: { id } });
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Get all rotation postings for the current student.
 */
export async function getMyRotationPostings() {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	return prisma.rotationPosting.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

// ======================== FACULTY & HOD ACTIONS ========================

/**
 * Faculty: Get postings for students in assigned batches.
 * HOD: Get all postings.
 */
export async function getRotationPostingsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	if (role === "hod") {
		return prisma.rotationPosting.findMany({
			orderBy: { createdAt: "desc" },
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
		});
	}

	// Faculty: batch-scoped
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

	return prisma.rotationPosting.findMany({
		where: { userId: { in: students.map((s) => s.id) } },
		orderBy: { createdAt: "desc" },
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
	});
}

/**
 * Get postings for a specific student (faculty/HOD).
 */
export async function getStudentRotationPostings(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.rotationPosting.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty/HOD: sign a rotation posting.
 */
export async function signRotationPosting(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "SIGNED", facultyRemark: remark ?? null },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "RotationPosting",
			entityId: id,
			remark,
		},
	});

	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Faculty/HOD: reject/request revision.
 */
export async function rejectRotationPosting(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "NEEDS_REVISION", facultyRemark: remark },
	});

	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Get faculty users for dropdown (batch-scoped for students).
 */
export async function getAllFacultyForDropdown() {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	if (user.role === "STUDENT" && user.batchId) {
		const batchFaculty = await prisma.facultyBatchAssignment.findMany({
			where: { batchId: user.batchId },
			include: {
				faculty: {
					select: { id: true, firstName: true, lastName: true, email: true },
				},
			},
		});
		return batchFaculty.map((bf) => bf.faculty);
	}

	return prisma.user.findMany({
		where: { role: { in: ["FACULTY" as never, "HOD" as never] } },
		select: { id: true, firstName: true, lastName: true, email: true },
		orderBy: { firstName: "asc" },
	});
}
