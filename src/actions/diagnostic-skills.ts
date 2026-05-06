/**
 * @module Diagnostic Skills Actions
 * @description Server actions for diagnostic skill entries (ABG, ECG, Other Diagnostic).
 * Each category has 10 predefined skills tracked with confidence levels (VC/FC/SC/NC).
 * Includes student CRUD, faculty/HOD review, bulk sign, auto-review support.
 *
 * @see PG Logbook .md — "ARTERIAL/ VENOUS BLOOD GAS ANALYSIS", "ELECTROCARDIOGRAPH (ECG) ANALYSIS", "OTHER DIAGNOSTIC ANALYSIS"
 * @see prisma/schema.prisma — DiagnosticSkill model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	diagnosticSkillSchema,
	type DiagnosticSkillInput,
} from "@/lib/validators/diagnostic-skills";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { isAutoReviewEnabled } from "@/actions/auto-review";

// ─── Helpers ────────────────────────────────────────────────

function revalidateAll() {
	revalidatePath("/dashboard/student/diagnostics");
	revalidatePath("/dashboard/faculty/diagnostics");
	revalidatePath("/dashboard/hod/diagnostics");
}

function revalidate(category: string) {
	const slug = category.toLowerCase().replace(/_/g, "-");
	revalidatePath(`/dashboard/student/diagnostics/${slug}`);
	revalidateAll();
}

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

// ─── Create ─────────────────────────────────────────────────

export async function createDiagnosticSkillEntry(data: DiagnosticSkillInput) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const validated = diagnosticSkillSchema.parse(data);

	const lastEntry = await prisma.diagnosticSkill.findFirst({
		where: {
			userId: user.id,
			diagnosticCategory: validated.diagnosticCategory as never,
		},
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.diagnosticSkill.create({
		data: {
			userId: user.id,
			diagnosticCategory: validated.diagnosticCategory as never,
			slNo,
			skillName: validated.skillName,
			representativeDiagnosis: validated.representativeDiagnosis ?? null,
			confidenceLevel: validated.confidenceLevel as never,
			totalTimesPerformed: validated.totalTimesPerformed ?? 0,
			imageUrls: validated.imageUrls ?? [],
			status: "DRAFT" as never,
		},
	});

	revalidate(validated.diagnosticCategory);
	return { success: true, entry };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateDiagnosticSkillEntry(
	id: string,
	data: DiagnosticSkillInput,
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);
	const validated = diagnosticSkillSchema.parse(data);

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED") throw new Error("Cannot edit signed entry");

	const entry = await prisma.diagnosticSkill.update({
		where: { id },
		data: {
			skillName: validated.skillName,
			representativeDiagnosis: validated.representativeDiagnosis ?? null,
			confidenceLevel: validated.confidenceLevel as never,
			totalTimesPerformed: validated.totalTimesPerformed ?? 0,
			imageUrls: validated.imageUrls ?? existing.imageUrls,
			status: "DRAFT" as never,
		},
	});

	revalidate(validated.diagnosticCategory);
	return { success: true, entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");

	// Auto-review: if enabled, auto-sign
	const autoReview = await isAutoReviewEnabled("diagnosticSkills");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	// Use transaction for revision recording
	const entry = await prisma.$transaction(async (tx) => {
		const updated = await tx.diagnosticSkill.update({
			where: { id },
			data: { status: newStatus as never },
		});
		if (autoReview) {
			await recordReview(tx, {
				entityType: "DiagnosticSkill",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed",
			});
		} else {
			await recordSubmission(tx, {
				entityType: "DiagnosticSkill",
				entityId: id,
				ownerId: user.id,
				snapshot: { status: "SUBMITTED" },
			});
		}
		return updated;
	});

	revalidate(existing.diagnosticCategory);
	return { success: true, entry, autoSigned: autoReview };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED")
		throw new Error("Cannot delete signed entry");

	await prisma.diagnosticSkill.delete({ where: { id } });

	revalidate(existing.diagnosticCategory);
	return { success: true };
}

// ─── Read (student) ─────────────────────────────────────────

export async function getMyDiagnosticSkillEntries(category: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entries = await prisma.diagnosticSkill.findMany({
		where: {
			userId: user.id,
			diagnosticCategory: category as never,
		},
		orderBy: { slNo: "asc" },
	});

	return entries;
}

export async function getMyDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});

	return entry;
}

/** Summary across all 3 diagnostic categories */
export async function getMyDiagnosticSkillSummary() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entries = await prisma.diagnosticSkill.groupBy({
		by: ["diagnosticCategory"],
		where: { userId: user.id },
		_count: { id: true },
	});

	const summary: Record<string, number> = {};
	for (const e of entries) {
		summary[e.diagnosticCategory] = e._count.id;
	}
	return summary;
}

// ─── Faculty/HOD Review ─────────────────────────────────────

export async function getDiagnosticSkillsForReview(category?: string) {
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
	if (category) where.diagnosticCategory = category as never;

	return prisma.diagnosticSkill.findMany({
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

// ─── Sign Entry ──────────────────────────────────────────────

export async function signDiagnosticSkillEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.diagnosticSkill.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.diagnosticSkill.update({
			where: { id },
			data: {
				status: "SIGNED" as never,
				facultyId: user.id,
				facultyRemark: remark || entry.facultyRemark,
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "DiagnosticSkill",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "DiagnosticSkill",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark,
		});
	});

	revalidateAll();
	return { success: true };
}

// ─── Reject Entry ────────────────────────────────────────────

export async function rejectDiagnosticSkillEntry(id: string, remark: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.diagnosticSkill.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before rejecting");
	}

	await prisma.$transaction(async (tx) => {
		await tx.diagnosticSkill.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION" as never,
				facultyId: user.id,
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "DiagnosticSkill",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	revalidateAll();
	return { success: true };
}

// ─── Bulk Sign ───────────────────────────────────────────────

export async function bulkSignDiagnosticSkillEntries(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.diagnosticSkill.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.diagnosticSkill.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: {
				status: "SIGNED" as never,
				facultyId: user.id,
			},
		});
		for (const entry of entries) {
			await tx.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "DiagnosticSkill",
					entityId: entry.id,
				},
			});
			await recordReview(tx, {
				entityType: "DiagnosticSkill",
				entityId: entry.id,
				ownerId: entry.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});
		}
	});

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentDiagnosticSkills(
	studentId: string,
	category?: string,
) {
	await requireRole(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (category) where.diagnosticCategory = category as never;

	return prisma.diagnosticSkill.findMany({
		where,
		orderBy: [{ diagnosticCategory: "asc" }, { slNo: "asc" }],
	});
}
