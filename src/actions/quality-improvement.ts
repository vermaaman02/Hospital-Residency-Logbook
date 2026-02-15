/**
 * @module Quality Improvement Actions
 * @description Server actions for Quality Improvement / Patient Safety Initiative /
 * Clinical Audit log with inline editing and review workflow.
 *
 * @see PG Logbook .md — "QUALITY IMPROVEMENT/PATIENT SAFETY INITIATIVE/CLINICAL AUDIT"
 * @see prisma/schema.prisma — QualityImprovement model
 */

"use server";

import { requireAuth, requireRole, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";

function revalidateAll() {
	revalidatePath("/dashboard/student/quality-improvement");
	revalidatePath("/dashboard/faculty/quality-improvement");
	revalidatePath("/dashboard/hod/quality-improvement");
}

// ======================== STUDENT ACTIONS ========================

export async function addQualityImprovementRow() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const last = await prisma.qualityImprovement.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.qualityImprovement.create({
		data: {
			userId: user.id,
			slNo: (last?.slNo ?? 0) + 1,
			status: "DRAFT",
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteQualityImprovementEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED" || entry.status === "SUBMITTED") {
		throw new Error("Cannot delete signed or submitted entries");
	}

	await prisma.qualityImprovement.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

export async function getMyQualityImprovements() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	return prisma.qualityImprovement.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyQualityImprovementSummary() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entries = await prisma.qualityImprovement.findMany({
		where: { userId: user.id },
		select: { status: true, description: true },
	});

	return {
		total: entries.length,
		filled: entries.filter((e) => e.description).length,
		draft: entries.filter((e) => e.status === "DRAFT").length,
		submitted: entries.filter((e) => e.status === "SUBMITTED").length,
		signed: entries.filter((e) => e.status === "SIGNED").length,
		needsRevision: entries.filter((e) => e.status === "NEEDS_REVISION").length,
	};
}

export async function getAvailableQIFaculty() {
	const faculty = await prisma.user.findMany({
		where: { role: { in: ["FACULTY", "HOD"] } },
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
	return faculty;
}

export async function updateQualityImprovementEntry(
	id: string,
	data: {
		date?: string | null;
		description?: string | null;
		roleInActivity?: string | null;
		facultyId?: string | null;
	},
) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.qualityImprovement.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED" || existing.status === "SUBMITTED") {
		throw new Error("Cannot edit signed or submitted entries");
	}

	const updated = await prisma.qualityImprovement.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			description: data.description,
			roleInActivity: data.roleInActivity,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return updated;
}

export async function submitQualityImprovementEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED") throw new Error("Already signed");
	if (entry.status === "SUBMITTED") throw new Error("Already submitted");
	if (!entry.description) throw new Error("Description is required to submit");

	// Check auto-review setting
	const autoReview = await isAutoReviewEnabled("qualityImprovement");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	await prisma.qualityImprovement.update({
		where: { id },
		data: { status: newStatus },
	});

	revalidateAll();
	return { success: true, autoSigned: newStatus === "SIGNED" };
}

// ======================== FACULTY/HOD REVIEW ACTIONS ========================

export async function getQualityImprovementsForReview() {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	let whereClause: Record<string, unknown> = {};

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);

		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" },
			select: { id: true },
		});
		const studentIds = students.map((s) => s.id);

		whereClause = { userId: { in: studentIds } };
	}

	return prisma.qualityImprovement.findMany({
		where: whereClause,
		orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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

export async function signQualityImprovementEntry(id: string, remark?: string) {
	await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.qualityImprovement.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.qualityImprovement.update({
			where: { id },
			data: {
				status: "SIGNED",
				...(remark ? { facultyRemark: remark } : {}),
			},
		}),
		prisma.digitalSignature.create({
			data: {
				entityId: id,
				entityType: "QualityImprovement",
				signedById: user.id,
				signedAt: new Date(),
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

export async function rejectQualityImprovementEntry(
	id: string,
	remark: string,
) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.qualityImprovement.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before rejection");
	}

	await prisma.qualityImprovement.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

export async function bulkSignQualityImprovementEntries(ids: string[]) {
	await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entries = await prisma.qualityImprovement.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.qualityImprovement.updateMany({
			where: { id: { in: ids }, status: "SUBMITTED" },
			data: { status: "SIGNED" },
		}),
		...entries.map((e) =>
			prisma.digitalSignature.create({
				data: {
					entityId: e.id,
					entityType: "QualityImprovement",
					signedById: user.id,
					signedAt: new Date(),
				},
			}),
		),
	]);

	revalidateAll();
	return { success: true, count: entries.length };
}

export async function getStudentQualityImprovements(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.qualityImprovement.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
