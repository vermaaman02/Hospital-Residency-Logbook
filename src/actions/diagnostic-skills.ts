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

import { requireAuthHybrid, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	diagnosticSkillSchema,
	type DiagnosticSkillInput,
} from "@/lib/validators/diagnostic-skills";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { recordSubmission, recordReview, buildSnapshot } from "@/lib/entry-revisions";
import { isAutoReviewEnabled } from "@/actions/auto-review";
import { sendRealtimeNotification } from "@/lib/notifications";
import {
	ABG_ANALYSIS_SKILLS,
	ECG_ANALYSIS_SKILLS,
	OTHER_DIAGNOSTIC_SKILLS,
} from "@/lib/constants/diagnostic-types";

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

function getSkillConfigs(category: string) {
	const upper = category.toUpperCase().replace(/-/g, "_");
	if (upper.includes("ABG") || upper.includes("BLOOD_GAS")) return ABG_ANALYSIS_SKILLS;
	if (upper.includes("ECG") || upper.includes("ELECTROCARDIOGRAPH")) return ECG_ANALYSIS_SKILLS;
	return OTHER_DIAGNOSTIC_SKILLS;
}

// ─── Create ─────────────────────────────────────────────────

export async function createDiagnosticSkillEntry(data: DiagnosticSkillInput) {
	const clerkId = await requireAuthHybrid();
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
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: validated.diagnosticCategory });
	return { success: true, entry };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateDiagnosticSkillEntry(
	id: string,
	data: DiagnosticSkillInput,
) {
	const clerkId = await requireAuthHybrid();
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
			facultyId: (data as any).facultyId ?? existing.facultyId,
			status: existing.status === "NEEDS_REVISION" ? ("DRAFT" as never) : existing.status,
		},
	});

	// Record update revision for tracking changes
	await prisma.entryRevision.create({
		data: {
			entityType: "DiagnosticSkill",
			entityId: id,
			ownerId: user.id,
			version: await prisma.entryRevision.count({ where: { entityId: id } }) + 1,
			kind: "SUBMISSION",
			snapshot: buildSnapshot(entry) as any,
			attachments: entry.imageUrls,
		},
	}).catch((e) => console.error("[REVISION_ERROR]", e));

	revalidate(validated.diagnosticCategory);
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: validated.diagnosticCategory });
	return { success: true, entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuthHybrid();
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
				snapshot: buildSnapshot(existing),
				attachments: existing.imageUrls,
			});
		}
		return updated;
	});

	revalidate(existing.diagnosticCategory);
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: existing.diagnosticCategory });
	return { success: true, entry, autoSigned: autoReview };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED")
		throw new Error("Cannot delete signed entry");

	await prisma.diagnosticSkill.delete({ where: { id } });

	revalidate(existing.diagnosticCategory);
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: existing.diagnosticCategory });
	return { success: true };
}

// ─── Read (student) ─────────────────────────────────────────

export async function getMyDiagnosticSkillEntries(category: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.diagnosticSkill.findMany({
		where: {
			userId: user.id,
			diagnosticCategory: category as never,
		},
		orderBy: { slNo: "asc" },
	});

	// Auto-seed predefined 10 skills if empty
	if (entries.length === 0) {
		const configs = getSkillConfigs(category);
		if (configs.length > 0) {
			await prisma.diagnosticSkill.createMany({
				data: configs.map((cfg) => ({
					userId: user.id,
					diagnosticCategory: category as never,
					slNo: cfg.slNo,
					skillName: cfg.name,
					status: "DRAFT" as never,
				})),
			});

			entries = await prisma.diagnosticSkill.findMany({
				where: {
					userId: user.id,
					diagnosticCategory: category as never,
				},
				orderBy: { slNo: "asc" },
			});
		}
	}

	return entries;
}

export async function getMyDiagnosticSkillEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.diagnosticSkill.findFirst({
		where: { id, userId: user.id },
	});

	return entry;
}

/** Summary across all 3 diagnostic categories */
export async function getMyDiagnosticSkillSummary() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const filledCounts = await prisma.diagnosticSkill.groupBy({
		by: ["diagnosticCategory"],
		where: {
			userId: user.id,
			OR: [
				{ representativeDiagnosis: { not: null } },
				{ confidenceLevel: { not: null } },
				{ status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] } },
			],
		},
		_count: { id: true },
	});

	const signedCounts = await prisma.diagnosticSkill.groupBy({
		by: ["diagnosticCategory"],
		where: { userId: user.id, status: "SIGNED" as never },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(filledCounts.map((e) => [e.diagnosticCategory, e._count.id])),
		signedByCategory: Object.fromEntries(signedCounts.map((e) => [e.diagnosticCategory, e._count.id])),
	};
}

// ─── Faculty/HOD Review ─────────────────────────────────────

export async function getDiagnosticSkillsForReview(category?: string) {
	const { userId, role } = await requireRoleHybrid(["faculty", "hod"]);
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

	const entries = await prisma.diagnosticSkill.findMany({
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

	// Fetch digital signatures for all entries
	const entryIds = entries.map((e) => e.id);
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityType: "DiagnosticSkill",
			entityId: { in: entryIds },
		},
		include: {
			signedBy: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
				},
			},
		},
		orderBy: { signedAt: "desc" },
	});

	const signaturesMap = new Map<string, typeof signatures>();
	for (const sig of signatures) {
		if (!signaturesMap.has(sig.entityId)) {
			signaturesMap.set(sig.entityId, []);
		}
		signaturesMap.get(sig.entityId)?.push(sig);
	}

	return entries.map((entry) => ({
		...entry,
		signatures: signaturesMap.get(entry.id) || [],
	}));
}

// ─── Sign Entry ──────────────────────────────────────────────

export async function signDiagnosticSkillEntry(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
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

	// Send Real-Time Push Notification to Student
	await sendRealtimeNotification(
		entry.userId,
		"Diagnostic Skill Signed",
		`Your diagnostic skill entry '${entry.skillName}' has been signed off.`,
		{ type: "ENTRY_SIGNED", entityId: id, module: "diagnostics", category: entry.diagnosticCategory },
	).catch(() => {});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: entry.diagnosticCategory });
	return { success: true };
}

// ─── Reject Entry ────────────────────────────────────────────

export async function rejectDiagnosticSkillEntry(id: string, remark: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
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

	// Send Real-Time Push Notification to Student
	await sendRealtimeNotification(
		entry.userId,
		"Diagnostic Skill Revision Requested",
		`Revision requested for diagnostic skill entry '${entry.skillName}': ${remark}`,
		{ type: "ENTRY_REVISED", entityId: id, module: "diagnostics", category: entry.diagnosticCategory },
	).catch(() => {});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "diagnostics", category: entry.diagnosticCategory });
	return { success: true };
}

// ─── Bulk Sign ───────────────────────────────────────────────

export async function bulkSignDiagnosticSkillEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
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
	emitRealtimeEvent("entry:updated", { module: "diagnostics" });
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentDiagnosticSkills(
	studentId: string,
	category?: string,
) {
	await requireRoleHybrid(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (category) where.diagnosticCategory = category as never;

	return prisma.diagnosticSkill.findMany({
		where,
		orderBy: [{ diagnosticCategory: "asc" }, { slNo: "asc" }],
	});
}
