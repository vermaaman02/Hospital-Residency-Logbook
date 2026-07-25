/**
 * @module Research Activities Actions
 * @description Server actions for Other Research/Team Building/Teaching &
 * Training/Community Outreach Activity.
 * Inline-editing pattern: rows are added via +Row, edited inline, then submitted.
 *
 * @see PG Logbook .md — "OTHER RESEARCH/ TEAM BUILDING/TEACHING & TRAINING/ COMMUNITY OUTREACH ACTIVITY"
 * @see prisma/schema.prisma — ResearchActivity model
 */

"use server";

import { requireAuth, requireAuthHybrid, requireRole, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { sendNotificationToUser, sendRealtimeNotification } from "@/lib/notifications";
import { buildSnapshot } from "@/lib/entry-revisions";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(identifier: string) {
	const user = await prisma.user.findFirst({
		where: {
			OR: [{ clerkId: identifier }, { id: identifier }],
		},
	});
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateAll() {
	revalidatePath("/dashboard/student/research-activities");
	revalidatePath("/dashboard/faculty/research-activities");
	revalidatePath("/dashboard/hod/research-activities");
}

// ─── Add Row ────────────────────────────────────────────────

export async function addResearchRow() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.researchActivity.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const newSlNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.researchActivity.create({
		data: {
			userId: user.id,
			slNo: newSlNo,
			status: "DRAFT" as never,
		},
	});

	revalidateAll();
	return entry;
}

export async function deleteResearchEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.researchActivity.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.researchActivity.delete({ where: { id } });
	revalidateAll();
	return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyResearchActivities() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.researchActivity.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyResearchSummary() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const [total, signed, submitted, needsRevision] = await Promise.all([
		prisma.researchActivity.count({
			where: {
				userId: user.id,
				OR: [
					{ activity: { not: null } },
					{
						status: {
							in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[],
						},
					},
				],
			},
		}),
		prisma.researchActivity.count({
			where: { userId: user.id, status: "SIGNED" },
		}),
		prisma.researchActivity.count({
			where: {
				userId: user.id,
				status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
			},
		}),
		prisma.researchActivity.count({
			where: { userId: user.id, status: "NEEDS_REVISION" },
		}),
	]);

	return { total, signed, submitted, needsRevision };
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableResearchFaculty() {
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

export async function updateResearchEntry(
	id: string,
	data: {
		date?: string | null;
		activity?: string | null;
		conductedAt?: string | null;
		participationRole?: string | null;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.researchActivity.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.researchActivity.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			activity: data.activity,
			conductedAt: data.conductedAt,
			participationRole: data.participationRole,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitResearchEntry(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.researchActivity.findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("researchActivities");

	if (autoReview) {
		await prisma.$transaction(async (tx) => {
			await tx.researchActivity.update({
				where: { id },
				data: { status: "SIGNED" },
			});
			await recordSubmission(tx, {
				entityType: "ResearchActivity",
				entityId: id,
				ownerId: existing.userId,
				snapshot: buildSnapshot(existing),
				attachments: [],
			});
			await tx.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "ResearchActivity",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			});
			await recordReview(tx, {
				entityType: "ResearchActivity",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed by system",
			});
		});
		await sendNotificationToUser(user.id, {
			title: "Research & Outreach",
			body: `Your research entry${existing.activity ? ` for "${existing.activity}"` : ""} has been auto-reviewed and signed.`,
			type: "entry_signed",
			entityType: "ResearchActivity",
			entityId: id,
			href: "/dashboard/student/research-activities",
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.researchActivity.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "ResearchActivity",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(existing),
				attachments: [],
			});
		});
		await sendNotificationToUser(user.id, {
			title: "Research & Outreach",
			body: `Your research entry${existing.activity ? ` for "${existing.activity}"` : ""} has been submitted for review.`,
			type: "entry_submitted",
			entityType: "ResearchActivity",
			entityId: id,
			href: "/dashboard/student/research-activities",
		});
	}

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getResearchForReview() {
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

	const researchActivities = await prisma.researchActivity.findMany({
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

	// Fetch signatures separately
	const researchIds = researchActivities.map((r) => r.id);
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityType: "ResearchActivity",
			entityId: { in: researchIds },
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

	// Map signatures to research activities
	const signaturesMap = new Map<string, typeof signatures>();
	signatures.forEach((sig) => {
		if (!signaturesMap.has(sig.entityId)) {
			signaturesMap.set(sig.entityId, []);
		}
		signaturesMap.get(sig.entityId)!.push(sig);
	});

	return researchActivities.map((research) => ({
		...research,
		signatures: signaturesMap.get(research.id) || [],
	}));
}

export async function signResearchEntry(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.researchActivity.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.researchActivity.update({
			where: { id },
			data: {
				status: "SIGNED",
				...(remark ? { facultyRemark: remark } : {}),
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ResearchActivity",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "ResearchActivity",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark,
		});
	});

	await sendNotificationToUser(entry.userId, {
		title: "Research & Outreach",
		body: `Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} has been signed off.`,
		type: "entry_signed",
		entityType: "ResearchActivity",
		entityId: id,
		href: "/dashboard/student/research-activities",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	await sendRealtimeNotification(
		entry.userId,
		"Research & Outreach Activity Signed",
		`Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} has been signed.`,
		{ type: "entry_signed", entityType: "ResearchActivity", entityId: id }
	).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function rejectResearchEntry(id: string, remark: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.researchActivity.findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.researchActivity.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "ResearchActivity",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	await sendNotificationToUser(entry.userId, {
		title: "Research & Outreach",
		body: `Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} needs revision: ${remark}`,
		type: "entry_needs_revision",
		entityType: "ResearchActivity",
		entityId: id,
		href: "/dashboard/student/research-activities",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	await sendRealtimeNotification(
		entry.userId,
		"Research & Outreach Activity Needs Revision",
		`Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} needs revision: ${remark}`,
		{ type: "entry_rejected", entityType: "ResearchActivity", entityId: id }
	).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));

	revalidateAll();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function bulkSignResearchEntries(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.researchActivity.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.researchActivity.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		});
		for (const entry of entries) {
			await tx.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "ResearchActivity",
					entityId: entry.id,
				},
			});
			await recordReview(tx, {
				entityType: "ResearchActivity",
				entityId: entry.id,
				ownerId: entry.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});
			await sendNotificationToUser(entry.userId, {
				title: "Research & Outreach",
				body: `Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} has been bulk signed.`,
				type: "entry_signed",
				entityType: "ResearchActivity",
				entityId: entry.id,
				href: "/dashboard/student/research-activities",
			}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

			await sendRealtimeNotification(
				entry.userId,
				"Research & Outreach Activity Signed",
				`Your research entry${entry.activity ? ` for "${entry.activity}"` : ""} has been signed.`,
				{ type: "entry_signed", entityType: "ResearchActivity", entityId: entry.id }
			).catch((e) => console.error("[REALTIME_NOTIF_ERROR]", e));
		}
	});

	revalidateAll();
	return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentResearch(studentId: string) {
	await requireRole(["faculty", "hod"]);

	return prisma.researchActivity.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
