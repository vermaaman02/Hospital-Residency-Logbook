/**
 * @module Imaging Log Actions
 * @description Server actions for all 5 imaging log categories.
 * Inline-editing pattern: rows are pre-initialized per category,
 * edited inline, then submitted for faculty review.
 * All categories use S/O/A/PS/PI skill levels.
 *
 * @see PG Logbook .md — "IMAGING LOGS" sections
 * @see prisma/schema.prisma — ImagingLog model
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
	revalidatePath("/dashboard/student/imaging");
	revalidatePath("/dashboard/faculty/imaging");
	revalidatePath("/dashboard/hod/imaging");
}

// ─── Add Row ────────────────────────────────────────────────

export async function addImagingLogRow(imagingCategory: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.imagingLog.findFirst({
		where: { userId: user.id, imagingCategory: imagingCategory as never },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const newSlNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.imagingLog.create({
		data: {
			userId: user.id,
			imagingCategory: imagingCategory as never,
			slNo: newSlNo,
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteImagingLogEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.imagingLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.imagingLog.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyImagingLogEntries(imagingCategory: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.imagingLog.findMany({
		where: { userId: user.id, imagingCategory: imagingCategory as never },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyImagingLogSummary() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const counts = await prisma.imagingLog.groupBy({
		by: ["imagingCategory"],
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

	const signedCounts = await prisma.imagingLog.groupBy({
		by: ["imagingCategory"],
		where: { userId: user.id, status: "SIGNED" },
		_count: { id: true },
	});

	const submittedCounts = await prisma.imagingLog.groupBy({
		by: ["imagingCategory"],
		where: {
			userId: user.id,
			status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
		},
		_count: { id: true },
	});

	const needsRevisionCounts = await prisma.imagingLog.groupBy({
		by: ["imagingCategory"],
		where: { userId: user.id, status: "NEEDS_REVISION" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.imagingCategory, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.imagingCategory, c._count.id]),
		),
		submittedByCategory: Object.fromEntries(
			submittedCounts.map((c) => [c.imagingCategory, c._count.id]),
		),
		needsRevisionByCategory: Object.fromEntries(
			needsRevisionCounts.map((c) => [c.imagingCategory, c._count.id]),
		),
	};
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableImagingFaculty() {
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

export async function updateImagingLogEntry(
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

	const existing = await prisma.imagingLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.imagingLog.update({
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

export async function submitImagingLogEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.imagingLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("imagingLogs");

	if (autoReview) {
		await prisma.$transaction([
			prisma.imagingLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "ImagingLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.imagingLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateAll();
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getImagingLogsForReview(imagingCategory?: string) {
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
	if (imagingCategory) where.imagingCategory = imagingCategory as never;

	return prisma.imagingLog.findMany({
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

export async function signImagingLogEntry(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.imagingLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.imagingLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ImagingLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateAll();
	return { success: true };
}

export async function rejectImagingLogEntry(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.imagingLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.imagingLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateAll();
	return { success: true };
}

export async function bulkSignImagingLogEntries(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.imagingLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.imagingLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "ImagingLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentImagingLogs(
	studentId: string,
	imagingCategory?: string,
) {
	await requireRole(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (imagingCategory) where.imagingCategory = imagingCategory as never;

	return prisma.imagingLog.findMany({
		where,
		orderBy: [{ imagingCategory: "asc" }, { slNo: "asc" }],
	});
}
