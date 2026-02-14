/**
 * @module Diagnostic Skills Actions
 * @description Server actions for diagnostic skill entries (ABG, ECG, Other Diagnostic).
 * Each category has 10 predefined skills tracked with confidence levels (VC/FC/SC/NC).
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

function revalidate(category: string) {
	const slug = category.toLowerCase().replace(/_/g, "-");
	revalidatePath(`/dashboard/student/diagnostics/${slug}`);
	revalidatePath("/dashboard/student/diagnostics");
}

// ─── Create ─────────────────────────────────────────────────

export async function createDiagnosticSkillEntry(data: DiagnosticSkillInput) {
	const userId = await requireAuth();
	const validated = diagnosticSkillSchema.parse(data);

	const lastEntry = await prisma.diagnosticSkill.findFirst({
		where: {
			userId,
			diagnosticCategory: validated.diagnosticCategory as never,
		},
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.diagnosticSkill.create({
		data: {
			userId,
			diagnosticCategory: validated.diagnosticCategory as never,
			slNo,
			skillName: validated.skillName,
			representativeDiagnosis: validated.representativeDiagnosis ?? null,
			confidenceLevel: validated.confidenceLevel as never,
			totalTimesPerformed: validated.totalTimesPerformed ?? 0,
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
	const userId = await requireAuth();
	const validated = diagnosticSkillSchema.parse(data);

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId },
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
			status: "DRAFT" as never,
		},
	});

	revalidate(validated.diagnosticCategory);
	return { success: true, entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitDiagnosticSkillEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Entry not found");

	const entry = await prisma.diagnosticSkill.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidate(existing.diagnosticCategory);
	return { success: true, entry };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteDiagnosticSkillEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.diagnosticSkill.findFirst({
		where: { id, userId },
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
	const userId = await requireAuth();

	const entries = await prisma.diagnosticSkill.findMany({
		where: {
			userId,
			diagnosticCategory: category as never,
		},
		orderBy: { slNo: "asc" },
	});

	return entries;
}

export async function getMyDiagnosticSkillEntry(id: string) {
	const userId = await requireAuth();

	const entry = await prisma.diagnosticSkill.findFirst({
		where: { id, userId },
	});

	return entry;
}

/** Summary across all 3 diagnostic categories */
export async function getMyDiagnosticSkillSummary() {
	const userId = await requireAuth();

	const entries = await prisma.diagnosticSkill.groupBy({
		by: ["diagnosticCategory"],
		where: { userId },
		_count: { id: true },
	});

	const summary: Record<string, number> = {};
	for (const e of entries) {
		summary[e.diagnosticCategory] = e._count.id;
	}
	return summary;
}

// ─── Faculty Actions ─────────────────────────────────────────

export async function signDiagnosticSkillEntry(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.diagnosticSkill.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.diagnosticSkill.update({
		where: { id },
		data: {
			status: "SIGNED" as never,
		},
	});

	revalidate(entry.diagnosticCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectDiagnosticSkillEntry(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.diagnosticSkill.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.diagnosticSkill.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION" as never,
		},
	});

	revalidate(entry.diagnosticCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}
