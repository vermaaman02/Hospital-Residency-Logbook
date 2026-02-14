/**
 * @module Imaging Log Actions
 * @description Server actions for all 5 imaging log categories.
 * One set of actions serves ALL categories via the `imagingCategory` parameter.
 * All categories use S/O/A/PS/PI skill levels.
 *
 * @see PG Logbook .md — "IMAGING LOGS" sections
 * @see prisma/schema.prisma — ImagingLog model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	imagingLogSchema,
	type ImagingLogInput,
} from "@/lib/validators/imaging-log";
import { revalidatePath } from "next/cache";

function revalidate(category: string) {
	const slug = category.toLowerCase().replace(/_/g, "-");
	revalidatePath(`/dashboard/student/imaging/${slug}`);
	revalidatePath("/dashboard/student/imaging");
}

// ─── Create ─────────────────────────────────────────────────

export async function createImagingLogEntry(data: ImagingLogInput) {
	const userId = await requireAuth();
	const validated = imagingLogSchema.parse(data);

	const lastEntry = await prisma.imagingLog.findFirst({
		where: {
			userId,
			imagingCategory: validated.imagingCategory as never,
		},
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.imagingLog.create({
		data: {
			userId,
			imagingCategory: validated.imagingCategory as never,
			slNo,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription ?? null,
			performedAtLocation: validated.performedAtLocation ?? null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT" as never,
		},
	});

	revalidate(validated.imagingCategory);
	return { success: true, entry };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateImagingLogEntry(id: string, data: ImagingLogInput) {
	const userId = await requireAuth();
	const validated = imagingLogSchema.parse(data);

	const existing = await prisma.imagingLog.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED") throw new Error("Cannot edit signed entry");

	const entry = await prisma.imagingLog.update({
		where: { id },
		data: {
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription ?? null,
			performedAtLocation: validated.performedAtLocation ?? null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT" as never,
		},
	});

	revalidate(validated.imagingCategory);
	return { success: true, entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitImagingLogEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.imagingLog.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Entry not found");

	const entry = await prisma.imagingLog.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidate(existing.imagingCategory);
	return { success: true, entry };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteImagingLogEntry(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.imagingLog.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED")
		throw new Error("Cannot delete signed entry");

	await prisma.imagingLog.delete({ where: { id } });

	revalidate(existing.imagingCategory);
	return { success: true };
}

// ─── Read (student) ─────────────────────────────────────────

export async function getMyImagingLogEntries(category: string) {
	const userId = await requireAuth();

	const entries = await prisma.imagingLog.findMany({
		where: {
			userId,
			imagingCategory: category as never,
		},
		orderBy: { slNo: "asc" },
	});

	return entries;
}

export async function getMyImagingLogEntry(id: string) {
	const userId = await requireAuth();

	const entry = await prisma.imagingLog.findFirst({
		where: { id, userId },
	});

	return entry;
}

/** Summary across all 5 imaging categories */
export async function getMyImagingLogSummary() {
	const userId = await requireAuth();

	const entries = await prisma.imagingLog.groupBy({
		by: ["imagingCategory"],
		where: { userId },
		_count: { id: true },
	});

	const summary: Record<string, number> = {};
	for (const e of entries) {
		summary[e.imagingCategory] = e._count.id;
	}
	return summary;
}

// ─── Faculty Actions ─────────────────────────────────────────

export async function signImagingLogEntry(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.imagingLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.imagingLog.update({
		where: { id },
		data: {
			status: "SIGNED" as never,
		},
	});

	revalidate(entry.imagingCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectImagingLogEntry(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.imagingLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.imagingLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION" as never,
		},
	});

	revalidate(entry.imagingCategory);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}
