/**
 * @module Disaster & QI Actions
 * @description Server actions for H4 (DisasterDrill) and H5 (QualityImprovement).
 *
 * @see PG Logbook .md — Sections: Disaster Management, Quality Improvement
 * @see prisma/schema.prisma — DisasterDrill, QualityImprovement models
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	disasterDrillSchema,
	type DisasterDrillInput,
	qualityImprovementSchema,
	type QualityImprovementInput,
} from "@/lib/validators/professional";
import { revalidatePath } from "next/cache";

function revalidateDisasterQi() {
	revalidatePath("/dashboard/student/disaster-qi");
}

// ═══════════════ H4: DISASTER DRILLS ═══════════════

export async function createDisasterDrill(data: DisasterDrillInput) {
	const userId = await requireAuth();
	const validated = disasterDrillSchema.parse(data);

	const last = await prisma.disasterDrill.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.disasterDrill.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			description: validated.description,
			roleInActivity: validated.roleInActivity ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateDisasterQi();
	return { success: true, entry };
}

export async function updateDisasterDrill(
	id: string,
	data: Partial<DisasterDrillInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.disasterDrill.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.disasterDrill.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.description !== undefined && { description: data.description }),
			...(data.roleInActivity !== undefined && {
				roleInActivity: data.roleInActivity,
			}),
		},
	});

	revalidateDisasterQi();
	return { success: true, entry: updated };
}

export async function submitDisasterDrill(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.disasterDrill.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.disasterDrill.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteDisasterDrill(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.disasterDrill.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.disasterDrill.delete({ where: { id } });
	revalidateDisasterQi();
	return { success: true };
}

export async function getMyDisasterDrills() {
	const userId = await requireAuth();
	return prisma.disasterDrill.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyDisasterDrillEntry(id: string) {
	const userId = await requireAuth();
	return prisma.disasterDrill.findFirst({ where: { id, userId } });
}

export async function signDisasterDrill(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.disasterDrill.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.disasterDrill.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectDisasterDrill(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.disasterDrill.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.disasterDrill.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

// ═══════════════ H5: QUALITY IMPROVEMENT ═══════════════

export async function createQualityImprovement(data: QualityImprovementInput) {
	const userId = await requireAuth();
	const validated = qualityImprovementSchema.parse(data);

	const last = await prisma.qualityImprovement.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.qualityImprovement.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			description: validated.description,
			roleInActivity: validated.roleInActivity ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateDisasterQi();
	return { success: true, entry };
}

export async function updateQualityImprovement(
	id: string,
	data: Partial<QualityImprovementInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.qualityImprovement.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.description !== undefined && { description: data.description }),
			...(data.roleInActivity !== undefined && {
				roleInActivity: data.roleInActivity,
			}),
		},
	});

	revalidateDisasterQi();
	return { success: true, entry: updated };
}

export async function submitQualityImprovement(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.qualityImprovement.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteQualityImprovement(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.qualityImprovement.delete({ where: { id } });
	revalidateDisasterQi();
	return { success: true };
}

export async function getMyQualityImprovements() {
	const userId = await requireAuth();
	return prisma.qualityImprovement.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyQualityImprovementEntry(id: string) {
	const userId = await requireAuth();
	return prisma.qualityImprovement.findFirst({ where: { id, userId } });
}

export async function signQualityImprovement(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.qualityImprovement.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectQualityImprovement(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.qualityImprovement.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.qualityImprovement.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateDisasterQi();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}
