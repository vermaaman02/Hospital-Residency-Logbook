/**
 * @module Case Management Actions
 * @description Server actions for all 24 case management categories (308 sub-types).
 * Inline-editing pattern: rows are pre-initialized per category, edited inline,
 * then submitted for faculty review.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT" (all sections)
 * @see prisma/schema.prisma — CaseManagementLog model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";
import { getSubCategories } from "@/lib/constants/case-categories";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateAll() {
	revalidatePath("/dashboard/student/case-management");
	revalidatePath("/dashboard/faculty/case-management");
	revalidatePath("/dashboard/hod/case-management");
}

// ─── Initialize ─────────────────────────────────────────────

/**
 * Initialize rows for a given category. Creates one row per sub-category
 * with default DRAFT status if not already present.
 */
export async function initializeCaseManagement(category: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.count({
		where: { userId: user.id, category: category as never },
	});

	if (existing > 0) return { initialized: false };

	const subCategories = getSubCategories(category);
	if (subCategories.length === 0) return { initialized: false };

	await prisma.caseManagementLog.createMany({
		data: subCategories.map((sc, idx) => ({
			userId: user.id,
			category: category as never,
			slNo: idx + 1,
			caseSubCategory: sc,
			status: "DRAFT" as never,
		})),
	});

	revalidateAll();
	return { initialized: true };
}

// ─── Add / Delete Single Row ────────────────────────────────

/**
 * Add a single new case management row to a category (for extra entries beyond
 * the initial sub-category set). Auto-increments slNo.
 */
export async function addCaseManagementRow(category: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const maxSlNo = await prisma.caseManagementLog.aggregate({
		where: { userId: user.id, category: category as never },
		_max: { slNo: true },
	});

	const entry = await prisma.caseManagementLog.create({
		data: {
			userId: user.id,
			category: category as never,
			slNo: (maxSlNo._max.slNo ?? 0) + 1,
			caseSubCategory: "",
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	return entry;
}

/**
 * Delete a DRAFT case management row. Only the owner can delete, and only DRAFT entries.
 */
export async function deleteCaseManagementEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.caseManagementLog.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyCaseManagementEntries(category: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.caseManagementLog.findMany({
		where: { userId: user.id, category: category as never },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyCaseManagementSummary() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	// Count only entries that have been actually filled (have at least completeDiagnosis or competencyLevel set)
	const counts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: {
			userId: user.id,
			OR: [
				{ completeDiagnosis: { not: null } },
				{ competencyLevel: { not: null } },
				{ patientName: { not: null } },
				{
					status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
				},
			],
		},
		_count: { id: true },
	});

	const signedCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId: user.id, status: "SIGNED" },
		_count: { id: true },
	});

	const submittedCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: {
			userId: user.id,
			status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
		},
		_count: { id: true },
	});

	const needsRevisionCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId: user.id, status: "NEEDS_REVISION" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.category, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.category, c._count.id]),
		),
		submittedByCategory: Object.fromEntries(
			submittedCounts.map((c) => [c.category, c._count.id]),
		),
		needsRevisionByCategory: Object.fromEntries(
			needsRevisionCounts.map((c) => [c.category, c._count.id]),
		),
	};
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableCaseManagementFaculty() {
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

export async function updateCaseManagementEntry(
	id: string,
	data: {
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		competencyLevel?: string | null;
		totalCaseTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.caseManagementLog.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			competencyLevel: data.competencyLevel as never,
			totalCaseTally: data.totalCaseTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitCaseManagementEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("caseManagement");

	if (autoReview) {
		await prisma.$transaction([
			prisma.caseManagementLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "CaseManagementLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.caseManagementLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateAll();
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getCaseManagementForReview(category?: string) {
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
	if (category) where.category = category as never;

	return prisma.caseManagementLog.findMany({
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

export async function signCaseManagementEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.caseManagementLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "CaseManagementLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

export async function rejectCaseManagementEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.caseManagementLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

export async function bulkSignCaseManagementEntries(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.caseManagementLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.caseManagementLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "CaseManagementLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentCaseManagement(
	studentId: string,
	category?: string,
) {
	await requireRole(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (category) where.category = category as never;

	return prisma.caseManagementLog.findMany({
		where,
		orderBy: [{ category: "asc" }, { slNo: "asc" }],
	});
}
