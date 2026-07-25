/**
 * @module Procedure Log Actions
 * @description Server actions for all 49 procedure log categories.
 * Inline-editing pattern: rows are pre-initialized per category,
 * edited inline, then submitted for faculty review.
 * CPR categories (E15, E17) use S/TM/TL skill levels; all others use S/O/A/PS/PI.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES" (all sections)
 * @see prisma/schema.prisma — ProcedureLog model
 */

"use server";

import { requireAuthHybrid, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { PROCEDURE_CATEGORIES } from "@/lib/constants/procedure-categories";
import {
	buildSnapshot,
	recordReview,
	recordSubmission,
} from "@/lib/entry-revisions";
import { sendRealtimeNotification } from "@/lib/notifications";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateAll() {
	revalidatePath("/dashboard/student/procedures");
	revalidatePath("/dashboard/faculty/procedures");
	revalidatePath("/dashboard/hod/procedures");
}

// ─── Initialize Category ────────────────────────────────────

/**
 * Initialize default rows for a given procedure category up to maxEntries if empty.
 */
export async function initializeProcedureLogCategory(procedureCategory: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existingCount = await prisma.procedureLog.count({
		where: { userId: user.id, procedureCategory: procedureCategory as never },
	});

	if (existingCount > 0) return { initialized: false };

	const catConfig = PROCEDURE_CATEGORIES.find((c) => c.enumValue === procedureCategory);
	const targetCount = catConfig?.maxEntries || 10;
	// Initialize default batch of rows (up to 10 initial rows or targetCount if less)
	const initialRows = Math.min(10, targetCount);

	await prisma.procedureLog.createMany({
		data: Array.from({ length: initialRows }).map((_, idx) => ({
			userId: user.id,
			procedureCategory: procedureCategory as never,
			slNo: idx + 1,
			status: "DRAFT" as never,
		})),
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures", category: procedureCategory });
	return { initialized: true };
}

// ─── Add Row ────────────────────────────────────────────────

/**
 * Add a single new empty row for a given procedure category.
 * Sl.No is auto-incremented based on existing rows up to maxEntries.
 */
export async function addProcedureLogRow(procedureCategory: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const catConfig = PROCEDURE_CATEGORIES.find((c) => c.enumValue === procedureCategory);
	const maxEntries = catConfig?.maxEntries || 50;

	const existingEntries = await prisma.procedureLog.findMany({
		where: { userId: user.id, procedureCategory: procedureCategory as never },
		select: { slNo: true },
		orderBy: { slNo: "desc" },
	});

	if (existingEntries.length >= maxEntries) {
		throw new Error(`Maximum entry capacity (${maxEntries} rows) reached for ${catConfig?.label || procedureCategory}.`);
	}

	const maxSlNo = existingEntries.reduce((max, e) => Math.max(max, e.slNo), 0);

	const entry = await prisma.procedureLog.create({
		data: {
			userId: user.id,
			procedureCategory: procedureCategory as never,
			slNo: maxSlNo + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures", category: procedureCategory });
	return entry;
}

/**
 * Delete a DRAFT procedure log row. Only the owner can delete, and only DRAFT entries.
 */
export async function deleteProcedureLogEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.procedureLog.delete({ where: { id } });
	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyProcedureLogEntries(procedureCategory: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.procedureLog.findMany({
		where: { userId: user.id, procedureCategory: procedureCategory as never },
		orderBy: { slNo: "asc" },
	});

	// Auto-seed initial rows if category has 0 entries
	if (entries.length === 0) {
		const catConfig = PROCEDURE_CATEGORIES.find((c) => c.enumValue === procedureCategory);
		const initialCount = Math.min(10, catConfig?.maxEntries || 10);
		if (initialCount > 0) {
			await prisma.procedureLog.createMany({
				data: Array.from({ length: initialCount }).map((_, idx) => ({
					userId: user.id,
					procedureCategory: procedureCategory as never,
					slNo: idx + 1,
					status: "DRAFT" as never,
				})),
			});

			entries = await prisma.procedureLog.findMany({
				where: { userId: user.id, procedureCategory: procedureCategory as never },
				orderBy: { slNo: "asc" },
			});
		}
	}

	return entries;
}

export async function getMyProcedureLogSummary() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	// Count only entries that have been actually filled
	const counts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: {
			userId: user.id,
			OR: [
				{ completeDiagnosis: { not: null } },
				{ skillLevel: { not: null } },
				{ patientName: { not: null } },
				{
					status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
				},
			],
		},
		_count: { id: true },
	});

	const signedCounts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: { userId: user.id, status: "SIGNED" },
		_count: { id: true },
	});

	const submittedCounts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: {
			userId: user.id,
			status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
		},
		_count: { id: true },
	});

	const needsRevisionCounts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: { userId: user.id, status: "NEEDS_REVISION" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.procedureCategory, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.procedureCategory, c._count.id]),
		),
		submittedByCategory: Object.fromEntries(
			submittedCounts.map((c) => [c.procedureCategory, c._count.id]),
		),
		needsRevisionByCategory: Object.fromEntries(
			needsRevisionCounts.map((c) => [c.procedureCategory, c._count.id]),
		),
	};
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableProcedureFaculty() {
	await requireAuthHybrid();

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

export async function updateProcedureLogEntry(
	id: string,
	data: {
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		procedureDescription?: string | null;
		performedAtLocation?: string | null;
		skillLevel?: string | null;
		totalProcedureTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.procedureLog.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			procedureDescription: data.procedureDescription,
			performedAtLocation: data.performedAtLocation,
			skillLevel: data.skillLevel as never,
			totalProcedureTally: data.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitProcedureLogEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("procedureLogs");

	if (autoReview) {
		await prisma.$transaction([
			prisma.procedureLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "ProcedureLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.$transaction(async (tx) => {
			const updated = await tx.procedureLog.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "ProcedureLog",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(updated),
			});
		});
	}

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getProcedureLogsForReview(procedureCategory?: string) {
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
	if (procedureCategory) where.procedureCategory = procedureCategory as never;

	const entries = await prisma.procedureLog.findMany({
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
			entityType: "ProcedureLog",
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

	// Create a map of entityId to signatures
	const signaturesMap = new Map<string, typeof signatures>();
	for (const sig of signatures) {
		if (!signaturesMap.has(sig.entityId)) {
			signaturesMap.set(sig.entityId, []);
		}
		signaturesMap.get(sig.entityId)?.push(sig);
	}

	// Attach signatures to entries
	return entries.map((entry) => ({
		...entry,
		signatures: signaturesMap.get(entry.id) || [],
	}));
}

export async function signProcedureLogEntry(id: string, remark?: string) {
	const { userId, role } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.procedureLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		});
		await recordReview(tx, {
			entityType: "ProcedureLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: role as "faculty" | "hod",
			decision: "SIGNED",
			remark: remark ?? null,
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ProcedureLog",
				entityId: id,
				remark,
			},
		});
	});

	// Send Real-Time Push Notification to Student
	const catConfig = PROCEDURE_CATEGORIES.find((c) => c.enumValue === entry.procedureCategory);
	await sendRealtimeNotification(
		entry.userId,
		"Procedure Log Signed",
		`Your procedure log entry '${catConfig?.label || entry.procedureCategory}' (Sl No: ${entry.slNo}) has been signed off.`,
		{ type: "ENTRY_SIGNED", entityId: id, module: "procedures", category: entry.procedureCategory },
	).catch(() => {});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true };
}

export async function rejectProcedureLogEntry(id: string, remark: string) {
	const { userId: clerkId, role } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.procedureLog.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "ProcedureLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: role as "faculty" | "hod",
			decision: "NEEDS_REVISION",
			remark,
		});
	});

	// Send Real-Time Push Notification to Student
	const catConfig = PROCEDURE_CATEGORIES.find((c) => c.enumValue === entry.procedureCategory);
	await sendRealtimeNotification(
		entry.userId,
		"Procedure Log Revision Requested",
		`Revision requested for procedure log entry '${catConfig?.label || entry.procedureCategory}': ${remark}`,
		{ type: "ENTRY_REVISED", entityId: id, module: "procedures", category: entry.procedureCategory },
	).catch(() => {});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true };
}

export async function bulkSignProcedureLogEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.procedureLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.procedureLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "ProcedureLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "procedures" });
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentProcedureLogs(
	studentId: string,
	procedureCategory?: string,
) {
	await requireRoleHybrid(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (procedureCategory) where.procedureCategory = procedureCategory as never;

	return prisma.procedureLog.findMany({
		where,
		orderBy: [{ procedureCategory: "asc" }, { slNo: "asc" }],
	});
}
