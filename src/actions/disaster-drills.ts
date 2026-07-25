/**
 * @module Disaster Drills Actions
 * @description Server actions for Major Incident Planning / Disaster Management Drill /
 * Mass Casualty Management / Prehospital EM log with inline editing and review workflow.
 *
 * @see PG Logbook .md — "MAJOR INCIDENT PLANNING/ DISASTER MANAGEMENT DRILL/ MASS CASUALTY MANAGEMENT/PREHOSPITAL EM"
 * @see prisma/schema.prisma — DisasterDrill model
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
	revalidatePath("/dashboard/student/disaster-drills");
	revalidatePath("/dashboard/faculty/disaster-drills");
	revalidatePath("/dashboard/hod/disaster-drills");
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

export async function addDisasterDrillRow() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const last = await prisma.disasterDrill.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.disasterDrill.create({
		data: {
			userId: user.id,
			slNo: (last?.slNo ?? 0) + 1,
			status: "DRAFT",
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteDisasterDrillEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.disasterDrill.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED" || entry.status === "SUBMITTED") {
		throw new Error("Cannot delete signed or submitted entries");
	}

	await prisma.disasterDrill.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

export async function getMyDisasterDrills() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	return prisma.disasterDrill.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyDisasterDrillSummary() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entries = await prisma.disasterDrill.findMany({
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

export async function getAvailableDisasterFaculty() {
	const faculty = await prisma.user.findMany({
		where: { role: { in: ["FACULTY", "HOD"] } },
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
	return faculty;
}

export async function updateDisasterDrillEntry(
	id: string,
	data: {
		date?: string | null;
		description?: string | null;
		roleInActivity?: string | null;
		facultyId?: string | null;
	},
) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.disasterDrill.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status === "SIGNED" || existing.status === "SUBMITTED") {
		throw new Error("Cannot edit signed or submitted entries");
	}

	const updated = await prisma.disasterDrill.update({
		where: { id },
		data: {
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

export async function submitDisasterDrillEntry(id: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const entry = await prisma.disasterDrill.findFirst({
		where: { id, userId: user.id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED") throw new Error("Already signed");
	if (entry.status === "SUBMITTED") throw new Error("Already submitted");
	if (!entry.description) throw new Error("Description is required to submit");

	// Check auto-review setting
	const autoReview = await isAutoReviewEnabled("disasterDrills");
	const newStatus = autoReview ? "SIGNED" : "SUBMITTED";

	await prisma.$transaction(async (tx) => {
		await tx.disasterDrill.update({
			where: { id },
			data: { status: newStatus },
		});
		if (autoReview) {
			await recordSubmission(tx, {
				entityType: "DisasterDrill",
				entityId: id,
				ownerId: entry.userId,
				snapshot: buildSnapshot(entry),
				attachments: [],
			});
			await recordReview(tx, {
				entityType: "DisasterDrill",
				entityId: id,
				ownerId: entry.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed",
			});
			await sendNotificationToUser(entry.userId, {
				title: "Disaster Drills",
				body: `Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} has been auto-reviewed and signed.`,
				type: "entry_signed",
				entityType: "DisasterDrill",
				entityId: id,
				href: "/dashboard/student/disaster-drills",
			});
		} else {
			await recordSubmission(tx, {
				entityType: "DisasterDrill",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(entry),
				attachments: [],
			});
			await sendNotificationToUser(user.id, {
				title: "Disaster Drills",
				body: `Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} has been submitted for review.`,
				type: "entry_submitted",
				entityType: "DisasterDrill",
				entityId: id,
				href: "/dashboard/student/disaster-drills",
			});
		}
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true, autoSigned: newStatus === "SIGNED" };
}

// ======================== FACULTY/HOD REVIEW ACTIONS ========================

export async function getDisasterDrillsForReview() {
	await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	let whereClause: Record<string, unknown> = {};

	if (user.role === "FACULTY") {
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

	const disasterDrills = await prisma.disasterDrill.findMany({
		where: whereClause,
		orderBy: [{ status: "asc" }, { createdAt: "desc" }],
		select: { id: true },
	});

	const disasterDrillIds = disasterDrills.map((d) => d.id);
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityType: "DisasterDrill",
			entityId: { in: disasterDrillIds },
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

	// Map signatures to disaster drills
	const signaturesMap = new Map<string, typeof signatures>();
	signatures.forEach((sig) => {
		if (!signaturesMap.has(sig.entityId)) {
			signaturesMap.set(sig.entityId, []);
		}
		signaturesMap.get(sig.entityId)!.push(sig);
	});

	const disasterDrillsWithUser = await prisma.disasterDrill.findMany({
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

	return disasterDrillsWithUser.map((drill) => ({
		...drill,
		signatures: signaturesMap.get(drill.id) || [],
	}));
}

export async function signDisasterDrillEntry(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.disasterDrill.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.disasterDrill.update({
			where: { id },
			data: {
				status: "SIGNED",
				...(remark ? { facultyRemark: remark } : {}),
			},
		});
		await tx.digitalSignature.create({
			data: {
				entityId: id,
				entityType: "DisasterDrill",
				signedById: user.id,
				signedAt: new Date(),
				...(remark ? { remark } : {}),
			},
		});
		await recordReview(tx, {
			entityType: "DisasterDrill",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark,
		});
	});

	await sendNotificationToUser(entry.userId, {
		title: "Disaster Drills",
		body: `Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} has been signed off.`,
		type: "entry_signed",
		entityType: "DisasterDrill",
		entityId: id,
		href: "/dashboard/student/disaster-drills",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	await sendRealtimeNotification(
		entry.userId,
		"Disaster Management Drill Signed",
		`Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} has been signed off.`,
		{ type: "entry_signed", entityType: "DisasterDrill", entityId: id }
	).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function rejectDisasterDrillEntry(id: string, remark: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.disasterDrill.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before rejection");
	}

	await prisma.$transaction(async (tx) => {
		await tx.disasterDrill.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "DisasterDrill",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	await sendNotificationToUser(entry.userId, {
		title: "Disaster Drills",
		body: `Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} needs revision: ${remark}`,
		type: "entry_needs_revision",
		entityType: "DisasterDrill",
		entityId: id,
		href: "/dashboard/student/disaster-drills",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	await sendRealtimeNotification(
		entry.userId,
		"Disaster Management Drill Needs Revision",
		`Your disaster drill entry${entry.description ? ` for "${entry.description}"` : ""} needs revision: ${remark}`,
		{ type: "entry_rejected", entityType: "DisasterDrill", entityId: id }
	).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function bulkSignDisasterDrillEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.disasterDrill.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.disasterDrill.updateMany({
			where: { id: { in: ids }, status: "SUBMITTED" },
			data: { status: "SIGNED" },
		});
		for (const e of entries) {
			await tx.digitalSignature.create({
				data: {
					entityId: e.id,
					entityType: "DisasterDrill",
					signedById: user.id,
					signedAt: new Date(),
					remark: "Bulk signed",
				},
			});
			await recordReview(tx, {
				entityType: "DisasterDrill",
				entityId: e.id,
				ownerId: e.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});
			await sendNotificationToUser(e.userId, {
				title: "Disaster Drills",
				body: `Your disaster drill entry${e.description ? ` for "${e.description}"` : ""} has been bulk signed.`,
				type: "entry_signed",
				entityType: "DisasterDrill",
				entityId: e.id,
				href: "/dashboard/student/disaster-drills",
			}).catch((err) => console.error("[NOTIFICATION_ERROR]", err));

			await sendRealtimeNotification(
				e.userId,
				"Disaster Management Drill Signed",
				`Your disaster drill entry${e.description ? ` for "${e.description}"` : ""} has been signed off.`,
				{ type: "entry_signed", entityType: "DisasterDrill", entityId: e.id }
			).catch((err) => console.error("[REALTIME_NOTIF_ERROR]", err));
		}
	});

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true, count: entries.length };
}

export async function getStudentDisasterDrills(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.disasterDrill.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
