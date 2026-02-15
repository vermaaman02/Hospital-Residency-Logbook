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
	revalidatePath("/dashboard/student/procedures");
	revalidatePath("/dashboard/faculty/procedures");
	revalidatePath("/dashboard/hod/procedures");
}

// ─── Add Row ────────────────────────────────────────────────

/**
 * Add a single new empty row for a given procedure category.
 * Sl.No is auto-incremented based on existing rows.
 */
export async function addProcedureLogRow(procedureCategory: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.procedureLog.findFirst({
		where: { userId: user.id, procedureCategory: procedureCategory as never },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const newSlNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.procedureLog.create({
		data: {
			userId: user.id,
			procedureCategory: procedureCategory as never,
			slNo: newSlNo,
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	return entry;
}

/**
 * Delete a DRAFT procedure log row. Only the owner can delete, and only DRAFT entries.
 */
export async function deleteProcedureLogEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.procedureLog.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyProcedureLogEntries(procedureCategory: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.procedureLog.findMany({
		where: { userId: user.id, procedureCategory: procedureCategory as never },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyProcedureLogSummary() {
	const clerkId = await requireAuth();
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
	const clerkId = await requireAuth();
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
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitProcedureLogEntry(id: string) {
	const clerkId = await requireAuth();
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
		await prisma.procedureLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateAll();
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getProcedureLogsForReview(procedureCategory?: string) {
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
	if (procedureCategory) where.procedureCategory = procedureCategory as never;

	return prisma.procedureLog.findMany({
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

export async function signProcedureLogEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.procedureLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ProcedureLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

export async function rejectProcedureLogEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.procedureLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

export async function bulkSignProcedureLogEntries(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
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
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentProcedureLogs(
	studentId: string,
	procedureCategory?: string,
) {
	await requireRole(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (procedureCategory) where.procedureCategory = procedureCategory as never;

	return prisma.procedureLog.findMany({
		where,
		orderBy: [{ procedureCategory: "asc" }, { slNo: "asc" }],
	});
}
