/**
 * @module Life-Support Courses Actions
 * @description Server actions for Life-Support and Skill Development Courses.
 * Inline-editing pattern: rows are added via +Row, edited inline, then submitted.
 * Uses Confidence Level (VC/FC/SC/NC) scale.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 * @see prisma/schema.prisma — CourseAttended model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateAll() {
	revalidatePath("/dashboard/student/life-support-courses");
	revalidatePath("/dashboard/faculty/life-support-courses");
	revalidatePath("/dashboard/hod/life-support-courses");
}

// ─── Add Row ────────────────────────────────────────────────

export async function addCourseRow() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.courseAttended.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const newSlNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.courseAttended.create({
		data: {
			userId: user.id,
			slNo: newSlNo,
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteCourseEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.courseAttended.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.courseAttended.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyCourses() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.courseAttended.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyCourseSummary() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const [total, signed, submitted, needsRevision] = await Promise.all([
		prisma.courseAttended.count({
			where: {
				userId: user.id,
				OR: [
					{ courseName: { not: null } },
					{
						status: {
							in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[],
						},
					},
				],
			},
		}),
		prisma.courseAttended.count({
			where: { userId: user.id, status: "SIGNED" },
		}),
		prisma.courseAttended.count({
			where: {
				userId: user.id,
				status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
			},
		}),
		prisma.courseAttended.count({
			where: { userId: user.id, status: "NEEDS_REVISION" },
		}),
	]);

	return { total, signed, submitted, needsRevision };
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableCourseFaculty() {
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

// ─── Update (Inline Edit) ──────────────────────────────────

export async function updateCourseEntry(
	id: string,
	data: {
		date?: string | null;
		courseName?: string | null;
		conductedAt?: string | null;
		confidenceLevel?: string | null;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.courseAttended.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.courseAttended.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			courseName: data.courseName,
			conductedAt: data.conductedAt,
			confidenceLevel: data.confidenceLevel,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitCourseEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.courseAttended.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("lifeSupportCourses");

	if (autoReview) {
		await prisma.$transaction([
			prisma.courseAttended.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "CourseAttended",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.courseAttended.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateAll();
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getCoursesForReview() {
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

	const where: Record<string, unknown> = {
		status: { not: "DRAFT" as never },
	};
	if (studentIds.length > 0) where.userId = { in: studentIds };

	return prisma.courseAttended.findMany({
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

export async function signCourseEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.courseAttended.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.courseAttended.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "CourseAttended",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

export async function rejectCourseEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.courseAttended.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.courseAttended.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

export async function bulkSignCourseEntries(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.courseAttended.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.courseAttended.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "CourseAttended",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentCourses(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.courseAttended.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
