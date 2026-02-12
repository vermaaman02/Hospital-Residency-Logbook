/**
 * @module Procedure Log Actions
 * @description Server actions for all 49 procedure log categories.
 * One set of actions serves ALL categories via the `procedureCategory` parameter.
 * CPR categories (E15, E17) use S/TM/TL skill levels; all others use S/O/A/PS/PI.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES" (all sections)
 * @see prisma/schema.prisma — ProcedureLog model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	procedureLogSchema,
	type ProcedureLogInput,
} from "@/lib/validators/procedure-log";
import { revalidatePath } from "next/cache";

function revalidate(category: string) {
	const slug = category.toLowerCase().replace(/_/g, "-");
	revalidatePath(`/dashboard/student/procedures/${slug}`);
	revalidatePath("/dashboard/student/procedures");
}

// ─── Create ─────────────────────────────────────────────────

/**
 * Create a new procedure log entry for any category.
 * Auto-calculates slNo per user + procedureCategory.
 */
export async function createProcedureLogEntry(data: ProcedureLogInput) {
	const userId = await requireAuth();
	const validated = procedureLogSchema.parse(data);

	// Auto slNo per user + procedureCategory
	const lastEntry = await prisma.procedureLog.findFirst({
		where: {
			userId,
			procedureCategory: validated.procedureCategory as never,
		},
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.procedureLog.create({
		data: {
			userId,
			procedureCategory: validated.procedureCategory as never,
			slNo,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription || null,
			performedAtLocation: validated.performedAtLocation || null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT",
		},
	});

	revalidate(validated.procedureCategory);
	return { success: true, data: entry };
}

// ─── Update ─────────────────────────────────────────────────

/**
 * Update an existing procedure log entry.
 */
export async function updateProcedureLogEntry(
	id: string,
	data: ProcedureLogInput,
) {
	const userId = await requireAuth();
	const validated = procedureLogSchema.parse(data);

	const existing = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.procedureLog.update({
		where: { id },
		data: {
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription || null,
			performedAtLocation: validated.performedAtLocation || null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT",
		},
	});

	revalidate(validated.procedureCategory);
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitProcedureLogEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await prisma.procedureLog.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidate(existing.procedureCategory);
	return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteProcedureLogEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.procedureLog.delete({ where: { id } });

	revalidate(existing.procedureCategory);
	return { success: true };
}

// ─── Read ───────────────────────────────────────────────────

/**
 * Get all procedure log entries for a specific category for the current student.
 */
export async function getMyProcedureLogEntries(procedureCategory: string) {
	const userId = await requireAuth();

	return prisma.procedureLog.findMany({
		where: { userId, procedureCategory: procedureCategory as never },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Get a single procedure log entry by ID (with ownership check).
 */
export async function getMyProcedureLogEntry(id: string) {
	const userId = await requireAuth();

	const entry = await prisma.procedureLog.findUnique({
		where: { id },
	});
	if (!entry || entry.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	return entry;
}

/**
 * Get summary counts per procedureCategory for the current student (for landing page).
 */
export async function getMyProcedureLogSummary() {
	const userId = await requireAuth();

	const counts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: { userId },
		_count: { id: true },
	});

	const signedCounts = await prisma.procedureLog.groupBy({
		by: ["procedureCategory"],
		where: { userId, status: "SIGNED" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.procedureCategory, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.procedureCategory, c._count.id]),
		),
	};
}

// ─── Faculty Sign / Reject ──────────────────────────────────

/**
 * Faculty: Sign a procedure log entry.
 */
export async function signProcedureLogEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.procedureLog.update({
			where: { id },
			data: { status: "SIGNED" },
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType: "ProcedureLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidate(entry.procedureCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

/**
 * Faculty: Reject a procedure log entry with remark.
 */
export async function rejectProcedureLogEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.procedureLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.procedureLog.update({
		where: { id },
		data: { status: "NEEDS_REVISION" },
	});

	revalidate(entry.procedureCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}
