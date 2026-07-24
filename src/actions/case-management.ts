/**
 * @module Case Management Actions
 * @description Server actions for all 24 case management categories (308 sub-types).
 * Inline-editing pattern: rows are pre-initialized per category, edited inline,
 * then submitted for faculty review.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT" (all sections)
 * @see prisma/schema.prisma — CaseManagementLog model
 */

"use server";

import { requireAuthHybrid, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { getSubCategories } from "@/lib/constants/case-categories";
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
	revalidatePath("/dashboard/student/case-management");
	revalidatePath("/dashboard/faculty/case-management");
	revalidatePath("/dashboard/hod/case-management");
}

// ─── Initialize ─────────────────────────────────────────────

/**
 * Initialize rows for a given category. Creates one row per sub-category
 * with default DRAFT status if not already present.
 */
export async function initializeCaseManagement(category: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.count({
		where: { userId: user.id, category: category as never },
	});

	if (existing > 0) return { initialized: false };

	const subCategories = getSubCategories(category);
	if (subCategories.length === 0) return { initialized: false };

	await prisma.caseManagementLog.createMany({
		data: subCategories.map((sc, idx) => ({
			userId: user.id,
			category: category as never,
			slNo: idx + 1,
			caseSubCategory: sc,
			status: "DRAFT" as never,
		})),
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management", category });
	return { initialized: true };
}

// ─── Add / Delete Single Row ────────────────────────────────

/**
 * Add a single new case management row to a category (for extra entries beyond
 * the initial sub-category set). Auto-increments slNo.
 */
export async function addCaseManagementRow(category: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const subCategories = getSubCategories(category);
	const existingEntries = await prisma.caseManagementLog.findMany({
		where: { userId: user.id, category: category as never },
		select: { caseSubCategory: true, slNo: true },
	});

	const existingSubCats = new Set(existingEntries.map((e) => e.caseSubCategory));
	const missingSubCat = subCategories.find((sc) => !existingSubCats.has(sc));
	const maxSlNo = existingEntries.reduce((max, e) => Math.max(max, e.slNo), 0);

	if (missingSubCat) {
		const entry = await prisma.caseManagementLog.create({
			data: {
				userId: user.id,
				category: category as never,
				slNo: maxSlNo + 1,
				caseSubCategory: missingSubCat,
				status: "DRAFT" as never,
			},
		});

		revalidateAll();
		emitRealtimeEvent("entry:updated", { module: "case-management", category });
		return entry;
	}

	throw new Error(`All ${subCategories.length} case types for this category are already present in your logbook.`);
}

/**
 * Delete a DRAFT case management row. Only the owner can delete, and only DRAFT entries.
 */
export async function deleteCaseManagementEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.caseManagementLog.delete({ where: { id } });
	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyCaseManagementEntries(category: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.caseManagementLog.findMany({
		where: { userId: user.id, category: category as never },
		orderBy: { slNo: "asc" },
	});

	// Auto-seed predefined sub-categories if category has not been initialized yet
	if (entries.length === 0) {
		const subCategories = getSubCategories(category);
		if (subCategories.length > 0) {
			await prisma.caseManagementLog.createMany({
				data: subCategories.map((sc, idx) => ({
					userId: user.id,
					category: category as never,
					slNo: idx + 1,
					caseSubCategory: sc,
					status: "DRAFT" as never,
				})),
			});

			entries = await prisma.caseManagementLog.findMany({
				where: { userId: user.id, category: category as never },
				orderBy: { slNo: "asc" },
			});
		}
	}

	return entries;
}

export async function getMyCaseManagementSummary() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	// Count only entries that have been actually filled (have at least completeDiagnosis or competencyLevel set)
	const counts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: {
			userId: user.id,
			OR: [
				{ completeDiagnosis: { not: null } },
				{ competencyLevel: { not: null } },
				{ patientName: { not: null } },
				{
					status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
				},
			],
		},
		_count: { id: true },
	});

	const signedCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId: user.id, status: "SIGNED" },
		_count: { id: true },
	});

	const submittedCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: {
			userId: user.id,
			status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
		},
		_count: { id: true },
	});

	const needsRevisionCounts = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		where: { userId: user.id, status: "NEEDS_REVISION" },
		_count: { id: true },
	});

	return {
		totalByCategory: Object.fromEntries(
			counts.map((c) => [c.category, c._count.id]),
		),
		signedByCategory: Object.fromEntries(
			signedCounts.map((c) => [c.category, c._count.id]),
		),
		submittedByCategory: Object.fromEntries(
			submittedCounts.map((c) => [c.category, c._count.id]),
		),
		needsRevisionByCategory: Object.fromEntries(
			needsRevisionCounts.map((c) => [c.category, c._count.id]),
		),
	};
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableCaseManagementFaculty() {
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

export async function updateCaseManagementEntry(
	id: string,
	data: {
		caseSubCategory?: string | null;
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		competencyLevel?: string | null;
		totalCaseTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.caseManagementLog.update({
		where: { id },
		data: {
			caseSubCategory:
				data.caseSubCategory !== undefined ?
					(data.caseSubCategory ?? existing.caseSubCategory)
				:	existing.caseSubCategory,
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			competencyLevel: data.competencyLevel as never,
			totalCaseTally: data.totalCaseTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitCaseManagementEntry(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.caseManagementLog.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	// ── Server-side field validation ──
	const missing: string[] = [];
	if (!existing.caseSubCategory?.trim()) missing.push("Case Category");
	if (!existing.date) missing.push("Date");
	if (!existing.patientName?.trim()) missing.push("Patient Name");
	if (existing.patientAge == null) missing.push("Age");
	if (!existing.patientSex?.trim()) missing.push("Sex");
	if (!existing.uhid?.trim()) missing.push("UHID");
	if (!existing.completeDiagnosis?.trim()) missing.push("Complete Diagnosis");
	if (!existing.competencyLevel) missing.push("Competency Level");
	if (!existing.facultyId) missing.push("Faculty Sign");
	if (missing.length > 0) {
		throw new Error(`Cannot submit — fill: ${missing.join(", ")}`);
	}

	const autoReview = await isAutoReviewEnabled("caseManagement");

	if (autoReview) {
		await prisma.$transaction([
			prisma.caseManagementLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "CaseManagementLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.$transaction(async (tx) => {
			const updated = await tx.caseManagementLog.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "CaseManagementLog",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(updated),
			});
		});
	}

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getCaseManagementForReview(category?: string) {
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
	if (category) where.category = category as never;

	const entries = await prisma.caseManagementLog.findMany({
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
			entityType: "CaseManagementLog",
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

	// Fetch faculty information for all entries
	const facultyIds = entries
		.map((e) => e.facultyId)
		.filter((id): id is string => id !== null);
	const facultyMap = new Map<string, { id: string; firstName: string; lastName: string }>();
	if (facultyIds.length > 0) {
		const facultyList = await prisma.user.findMany({
			where: { id: { in: facultyIds } },
			select: { id: true, firstName: true, lastName: true },
		});
		for (const faculty of facultyList) {
			facultyMap.set(faculty.id, faculty);
		}
	}

	// Attach signatures and faculty to entries
	return entries.map((entry) => ({
		...entry,
		signatures: signaturesMap.get(entry.id) || [],
		faculty: entry.facultyId ? facultyMap.get(entry.facultyId) || null : null,
	}));
}

export async function signCaseManagementEntry(id: string, remark?: string) {
	const { userId, role } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.caseManagementLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		});
		await recordReview(tx, {
			entityType: "CaseManagementLog",
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
				entityType: "CaseManagementLog",
				entityId: id,
				remark,
			},
		});
	});

	// Push notification to student
	await sendRealtimeNotification(
		entry.userId,
		"Case Management Signed Off",
		`Your case management entry "${entry.caseSubCategory || entry.category}" has been signed off.`,
		{ module: "case-management", id, category: entry.category }
	);

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true };
}

export async function rejectCaseManagementEntry(id: string, remark: string) {
	const { userId: clerkId, role } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.caseManagementLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.caseManagementLog.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "CaseManagementLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: role as "faculty" | "hod",
			decision: "NEEDS_REVISION",
			remark,
		});
	});

	// Push notification to student
	await sendRealtimeNotification(
		entry.userId,
		"Case Management Revision Requested",
		`Revision requested for case management entry "${entry.caseSubCategory || entry.category}": ${remark}`,
		{ module: "case-management", id, category: entry.category }
	);

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true };
}

export async function bulkSignCaseManagementEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.caseManagementLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.caseManagementLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "CaseManagementLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateAll();
	emitRealtimeEvent("entry:updated", { module: "case-management" });
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentCaseManagement(
	studentId: string,
	category?: string,
) {
	await requireRoleHybrid(["faculty", "hod"]);

	const where: Record<string, unknown> = { userId: studentId };
	if (category) where.category = category as never;

	const entries = await prisma.caseManagementLog.findMany({
		where,
		orderBy: [{ category: "asc" }, { slNo: "asc" }],
	});

	// Fetch faculty information for all entries
	const facultyIds = entries
		.map((e) => e.facultyId)
		.filter((id): id is string => id !== null);
	const facultyMap = new Map<string, { id: string; firstName: string; lastName: string }>();
	if (facultyIds.length > 0) {
		const facultyList = await prisma.user.findMany({
			where: { id: { in: facultyIds } },
			select: { id: true, firstName: true, lastName: true },
		});
		for (const faculty of facultyList) {
			facultyMap.set(faculty.id, faculty);
		}
	}

	// Attach faculty to entries
	return entries.map((entry) => ({
		...entry,
		faculty: entry.facultyId ? facultyMap.get(entry.facultyId) || null : null,
	}));
}
