/**
 * @module Logbook Faculty Review Actions
 * @description Server actions for Periodic Logbook Faculty Review entries
 * with inline editing and review workflow.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION: PERIODIC LOG BOOK FACULTY REVIEW"
 * @see prisma/schema.prisma — LogbookFacultyReview model
 */

"use server";

import { requireAuth, requireAuthHybrid, requireRole, requireRoleHybrid, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { sendNotificationToUser, sendRealtimeNotification } from "@/lib/notifications";
import { buildSnapshot } from "@/lib/entry-revisions";

function revalidateAll() {
	revalidatePath("/dashboard/student/logbook-reviews");
	revalidatePath("/dashboard/faculty/logbook-reviews");
	revalidatePath("/dashboard/hod/logbook-reviews");
}

async function resolveUser(identifier: string) {
	const user = await prisma.user.findFirst({
		where: {
			OR: [{ clerkId: identifier }, { id: identifier }],
		},
	});
	if (!user) throw new Error("User not found in database");
	return user;
}

// ======================== STUDENT ACTIONS ========================

export async function addLogbookReviewRow() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const last = await prisma.logbookFacultyReview.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.logbookFacultyReview.create({
		data: {
			userId: user.id,
			slNo: (last?.slNo ?? 0) + 1,
			status: "DRAFT",
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteLogbookReviewEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.logbookFacultyReview.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED" || entry.status === "SUBMITTED") {
		throw new Error("Cannot delete signed or submitted entries");
	}

	await prisma.logbookFacultyReview.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

export async function getMyLogbookReviews() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	return prisma.logbookFacultyReview.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyLogbookReviewSummary() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entries = await prisma.logbookFacultyReview.findMany({
		where: { userId: user.id },
		select: { status: true, description: true },
	});

	return {
		total: entries.length,
		filled: entries.filter((e) => e.description).length,
		draft: entries.filter((e) => e.status === "DRAFT").length,
		submitted: entries.filter((e) => e.status === "SUBMITTED").length,
		signed: entries.filter((e) => e.status === "SIGNED").length,
		needsRevision: entries.filter((e) => e.status === "NEEDS_REVISION").length,
	};
}

export async function getAvailableLogbookFaculty() {
	const faculty = await prisma.user.findMany({
		where: { role: { in: ["FACULTY", "HOD"] } },
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
	return faculty;
}

export async function updateLogbookReviewEntry(
	id: string,
	data: {
		reviewNo?: string | null;
		date?: string | null;
		description?: string | null;
		roleInActivity?: string | null;
		facultyId?: string | null;
	},
) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.logbookFacultyReview.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED" || existing.status === "SUBMITTED") {
		throw new Error("Cannot edit signed or submitted entries");
	}

	const updated = await prisma.logbookFacultyReview.update({
		where: { id },
		data: {
			reviewNo: data.reviewNo,
			date: data.date ? new Date(data.date) : null,
			description: data.description,
			roleInActivity: data.roleInActivity,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return updated;
}

export async function submitLogbookReviewEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.logbookFacultyReview.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED") throw new Error("Already signed");
	if (entry.status === "SUBMITTED") throw new Error("Already submitted");
	if (!entry.description) throw new Error("Description is required to submit");

	// Check auto-review setting
	const autoReview = await isAutoReviewEnabled("logbookReviews");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	await prisma.$transaction(async (tx) => {
		await tx.logbookFacultyReview.update({
			where: { id },
			data: { status: newStatus },
		});
		const updatedEntry = await tx.logbookFacultyReview.findUnique({ where: { id } });
		if (!updatedEntry) throw new Error("Entry not found");
		const entrySnapshot = await buildSnapshot(updatedEntry);
		if (autoReview) {
			await recordReview(tx, {
				entityType: "LogbookFacultyReview",
				entityId: id,
				ownerId: entry.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed",
			});
			await sendNotificationToUser(entry.userId, {
				title: "Logbook",
				body: `Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} has been auto-reviewed and signed.`,
				type: "entry_signed",
				entityType: "LogbookFacultyReview",
				entityId: id,
				href: "/dashboard/student/logbook-reviews",
			});
		} else {
			await recordSubmission(tx, {
				entityType: "LogbookFacultyReview",
				entityId: id,
				ownerId: user.id,
				snapshot: entrySnapshot,
			});
			await sendNotificationToUser(user.id, {
				title: "Logbook",
				body: `Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} has been submitted for review.`,
				type: "entry_submitted",
				entityType: "LogbookFacultyReview",
				entityId: id,
				href: "/dashboard/student/logbook-reviews",
			});
		}
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true, autoSigned: newStatus === "SIGNED" };
}

// ======================== FACULTY/HOD REVIEW ACTIONS ========================

export async function getLogbookReviewsForReview() {
	const { role } = await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	let whereClause: Record<string, unknown> = {};

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);

		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" },
			select: { id: true },
		});
		const studentIds = students.map((s) => s.id);

		whereClause = { userId: { in: studentIds } };
	}

	const logbookReviews = await prisma.logbookFacultyReview.findMany({
		where: whereClause,
		orderBy: [{ status: "asc" }, { createdAt: "desc" }],
		select: { id: true },
	});

	const logbookReviewIds = logbookReviews.map((d) => d.id);
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityType: "LogbookFacultyReview",
			entityId: { in: logbookReviewIds },
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
	});

	// Map signatures to logbook reviews
	const signaturesMap = new Map<string, Array<typeof signatures[number]>>();
	signatures.forEach((sig) => {
		if (!signaturesMap.has(sig.entityId)) {
			signaturesMap.set(sig.entityId, []);
		}
		signaturesMap.get(sig.entityId)!.push(sig);
	});

	const logbookReviewsWithUser = await prisma.logbookFacultyReview.findMany({
		where: whereClause,
		orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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

	return logbookReviewsWithUser.map((lr) => ({
		...lr,
		signatures: signaturesMap.get(lr.id) || [],
	}));
}

export async function signLogbookReviewEntry(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.logbookFacultyReview.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.logbookFacultyReview.update({
			where: { id },
			data: {
				status: "SIGNED",
				...(remark ? { facultyRemark: remark } : {}),
			},
		});
		await tx.digitalSignature.create({
			data: {
				entityId: id,
				entityType: "LogbookFacultyReview",
				signedById: user.id,
				signedAt: new Date(),
				remark: remark || null,
			},
		});
		await recordReview(tx, {
			entityType: "LogbookFacultyReview",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark,
		});
		await sendNotificationToUser(entry.userId, {
			title: "Logbook",
			body: `Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} has been signed off.`,
			type: "entry_signed",
			entityType: "LogbookFacultyReview",
			entityId: id,
			href: "/dashboard/student/logbook-reviews",
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

		await sendRealtimeNotification(
			entry.userId,
			"Logbook Faculty Review Signed",
			`Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} has been signed off.`,
			{ type: "entry_signed", entityType: "LogbookFacultyReview", entityId: id }
		).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));
	});

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function rejectLogbookReviewEntry(id: string, remark: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.logbookFacultyReview.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before rejection");
	}

	await prisma.$transaction(async (tx) => {
		await tx.logbookFacultyReview.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "LogbookFacultyReview",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
		await sendNotificationToUser(entry.userId, {
			title: "Logbook",
			body: `Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} needs revision: ${remark}`,
			type: "entry_needs_revision",
			entityType: "LogbookFacultyReview",
			entityId: id,
			href: "/dashboard/student/logbook-reviews",
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

		await sendRealtimeNotification(
			entry.userId,
			"Logbook Faculty Review Needs Revision",
			`Your logbook review entry${entry.description ? ` for "${entry.description}"` : ""} needs revision: ${remark}`,
			{ type: "entry_rejected", entityType: "LogbookFacultyReview", entityId: id }
		).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));
	});

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function bulkSignLogbookReviewEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.logbookFacultyReview.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.logbookFacultyReview.updateMany({
			where: { id: { in: ids }, status: "SUBMITTED" },
			data: { status: "SIGNED" },
		});
		for (const e of entries) {
			await tx.digitalSignature.create({
				data: {
					entityId: e.id,
					entityType: "LogbookFacultyReview",
					signedById: user.id,
					signedAt: new Date(),
					remark: "Bulk signed",
				},
			});
			await recordReview(tx, {
				entityType: "LogbookFacultyReview",
				entityId: e.id,
				ownerId: e.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});
			await sendNotificationToUser(e.userId, {
				title: "Logbook",
				body: `Your logbook review entry${e.description ? ` for "${e.description}"` : ""} has been bulk signed.`,
				type: "entry_signed",
				entityType: "LogbookFacultyReview",
				entityId: e.id,
				href: "/dashboard/student/logbook-reviews",
			}).catch((err) => console.error("[NOTIFICATION_ERROR]", err));

			await sendRealtimeNotification(
				e.userId,
				"Logbook Faculty Review Signed",
				`Your logbook review entry${e.description ? ` for "${e.description}"` : ""} has been signed off.`,
				{ type: "entry_signed", entityType: "LogbookFacultyReview", entityId: e.id }
			).catch((err) => console.error("[REALTIME_NOTIF_ERROR]", err));
		}
	});

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true, count: entries.length };
}

export async function getStudentLogbookReviews(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.logbookFacultyReview.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
