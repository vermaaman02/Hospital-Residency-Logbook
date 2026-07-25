/**
 * @module Other Logs Actions
 * @description Server actions for H6 (TransportLog), H7 (ConsentLog), H8 (BadNewsLog).
 * Inline-editing pattern: rows are pre-initialized, edited inline, then submitted for review.
 * All three share identical field structure (patient-based with skill levels).
 *
 * @see PG Logbook .md — Sections: Transport, Consent, Breaking Bad News
 * @see prisma/schema.prisma — TransportLog, ConsentLog, BadNewsLog models
 */

"use server";

import { requireAuth, requireAuthHybrid, requireRole, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { recordSubmission, recordReview, buildSnapshot } from "@/lib/entry-revisions";
import { sendNotificationToUser, sendRealtimeNotification } from "@/lib/notifications";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateTransport() {
	revalidatePath("/dashboard/student/transport");
	revalidatePath("/dashboard/faculty/transport");
	revalidatePath("/dashboard/hod/transport");
}

function revalidateConsentBadNews() {
	revalidatePath("/dashboard/student/consent-bad-news");
	revalidatePath("/dashboard/faculty/consent-bad-news");
	revalidatePath("/dashboard/hod/consent-bad-news");
}

// ─── Shared Faculty List ──────────────────────────────────

export async function getAvailableOtherLogFaculty() {
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

// ═══════════════════════════════════════════════════════════
//  H6: TRANSPORT LOG
// ═══════════════════════════════════════════════════════════

export async function addTransportLogRow() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existingCount = await prisma.transportLog.count({
		where: { userId: user.id },
	});

	if (existingCount >= 10) {
		throw new Error(
			"All 10 entry rows for Transport of Critically Ill Patient have already been added to your logbook."
		);
	}

	const lastEntry = await prisma.transportLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.transportLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateTransport();
	await emitRealtimeEvent("entry:updated");
	return entry;
}

export async function deleteTransportLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.transportLog.delete({ where: { id } });
	revalidateTransport();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

export async function getMyTransportLogs() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.transportLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});

	if (entries.length === 0) {
		await prisma.transportLog.createMany({
			data: Array.from({ length: 10 }).map((_, idx) => ({
				userId: user.id,
				slNo: idx + 1,
				status: "DRAFT" as never,
			})),
		});
		entries = await prisma.transportLog.findMany({
			where: { userId: user.id },
			orderBy: { slNo: "asc" },
		});
	}

	return entries;
}

export async function getMyTransportSummary() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const [totalCount, signedCount, submittedCount] = await Promise.all([
		prisma.transportLog.count({ where: { userId: user.id } }),
		prisma.transportLog.count({ where: { userId: user.id, status: "SIGNED" as never } }),
		prisma.transportLog.count({ where: { userId: user.id, status: "SUBMITTED" as never } }),
	]);

	return { totalCount, signedCount, submittedCount, maxEntries: 10 };
}

export async function updateTransportLog(
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
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.transportLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.transportLog.update({
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
			totalProcedureTally: data.totalProcedureTally ?? existing.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	// Record update revision for tracking changes
	await prisma.entryRevision.create({
		data: {
			entityType: "TransportLog",
			entityId: id,
			ownerId: user.id,
			version: await prisma.entryRevision.count({ where: { entityId: id } }) + 1,
			kind: "SUBMISSION",
			snapshot: buildSnapshot(entry) as any,
		},
	}).catch((e) => console.error("[REVISION_ERROR]", e));

	revalidateTransport();
	await emitRealtimeEvent("entry:updated");
	return { success: true, data: entry };
}

export async function submitTransportLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.transportLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("transportLogs");

	if (autoReview) {
		await prisma.$transaction(async (tx) => {
			await tx.transportLog.update({
				where: { id },
				data: { status: "SIGNED" },
			});
			await tx.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "TransportLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			});
			await recordReview(tx, {
				entityType: "TransportLog",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed by system",
			});
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.transportLog.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "TransportLog",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(existing),
			});
		});

		// Send notification to student on submission
		await sendNotificationToUser(user.id, {
			title: "Transport Log Submitted",
			body: "Your transport log entry has been submitted for review.",
			type: "entry_submitted",
			entityType: "TransportLog",
			entityId: id,
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
	}

	revalidateTransport();
	await emitRealtimeEvent("entry:updated");
	return { success: true };
}

// Transport Review

export async function getTransportLogsForReview() {
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

	const entries = await prisma.transportLog.findMany({
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

	// Fetch digital signatures for each entry
	const entryIds = entries.map((e) => e.id);
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityId: { in: entryIds },
			entityType: "TransportLog",
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

	// Attach signatures to entries
	const signaturesMap = new Map<string, typeof signatures>();
	signatures.forEach((sig) => {
		const existing = signaturesMap.get(sig.entityId) || [];
		signaturesMap.set(sig.entityId, [...existing, sig]);
	});

	return entries.map((entry) => ({
		...entry,
		signatures: signaturesMap.get(entry.id) || [],
	}));
}

export async function signTransportLog(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.transportLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "TransportLog",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "TransportLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: user.role as "faculty" | "hod",
			decision: "SIGNED",
			remark: remark || undefined,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Transport Log Signed",
		`Your transport log entry (Sl No: ${entry.slNo}) has been signed off.`,
		{ type: "ENTRY_SIGNED", entityId: id, module: "transport" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Transport Log Signed",
		body: "Your transport log entry has been signed.",
		type: "entry_signed",
		entityType: "TransportLog",
		entityId: id,
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateTransport();
	await emitRealtimeEvent("entry:updated", { module: "transport" });
	return { success: true };
}

export async function rejectTransportLog(id: string, remark: string) {
	const { userId: clerkId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.transportLog.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "TransportLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: user.role as "faculty" | "hod",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Transport Log Revision Requested",
		`Revision requested for transport log entry (Sl No: ${entry.slNo}): ${remark}`,
		{ type: "ENTRY_REVISED", entityId: id, module: "transport" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Transport Log Needs Revision",
		body: `Your transport log entry needs revision: ${remark}`,
		type: "entry_rejected",
		entityType: "TransportLog",
		entityId: id,
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateTransport();
	await emitRealtimeEvent("entry:updated", { module: "transport" });
	return { success: true };
}

export async function bulkSignTransportLogs(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.transportLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.transportLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "TransportLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	// Send Android push & web notification to student for each entry
	for (const entry of entries) {
		await sendRealtimeNotification(
			entry.userId,
			"Transport Log Signed",
			`Your transport log entry (Sl No: ${entry.slNo}) has been signed off.`,
			{ type: "ENTRY_SIGNED", entityId: entry.id, module: "transport" }
		).catch(() => {});

		await sendNotificationToUser(entry.userId, {
			title: "Transport Log Signed",
			body: "Your transport log entry has been signed.",
			type: "entry_signed",
			entityType: "TransportLog",
			entityId: entry.id,
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
	}

	revalidateTransport();
	await emitRealtimeEvent("entry:updated", { module: "transport" });
	return { success: true, signedCount: entries.length };
}

export async function getStudentTransportLogs(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.transportLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

// ═══════════════════════════════════════════════════════════
//  H7: CONSENT LOG
// ═══════════════════════════════════════════════════════════

export async function addConsentLogRow() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existingCount = await prisma.consentLog.count({
		where: { userId: user.id },
	});

	if (existingCount >= 10) {
		throw new Error(
			"All 10 entry rows for Taking Informed Consent have already been added to your logbook."
		);
	}

	const lastEntry = await prisma.consentLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.consentLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return entry;
}

export async function deleteConsentLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.consentLog.delete({ where: { id } });
	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function getMyConsentLogs() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.consentLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});

	if (entries.length === 0) {
		await prisma.consentLog.createMany({
			data: Array.from({ length: 10 }).map((_, idx) => ({
				userId: user.id,
				slNo: idx + 1,
				status: "DRAFT" as never,
			})),
		});
		entries = await prisma.consentLog.findMany({
			where: { userId: user.id },
			orderBy: { slNo: "asc" },
		});
	}

	return entries;
}

export async function updateConsentLog(
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
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.consentLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.consentLog.update({
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
			totalProcedureTally: data.totalProcedureTally ?? existing.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true, data: entry };
}

export async function submitConsentLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.consentLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("consentLogs");

	if (autoReview) {
		await prisma.$transaction(async (tx) => {
			await tx.consentLog.update({
				where: { id },
				data: { status: "SIGNED" },
			});
			await tx.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "ConsentLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			});
			await recordReview(tx, {
				entityType: "ConsentLog",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed by system",
			});
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.consentLog.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "ConsentLog",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(existing),
				attachments: [],
			});
		});

		// Send notification to student on submission
		await sendNotificationToUser(user.id, {
			title: "Consent & Bad News - Consent Submitted",
			body: `Your consent log entry${existing.completeDiagnosis ? ` for "${existing.completeDiagnosis}"` : ""} has been submitted for review.`,
			type: "entry_submitted",
			entityType: "ConsentLog",
			entityId: id,
			href: "/dashboard/student/consent-bad-news",
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
	}

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

// Consent Review

export async function getConsentLogsForReview() {
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

	return prisma.consentLog.findMany({
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

export async function signConsentLog(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.consentLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}` || entry.facultyRemark,
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ConsentLog",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "ConsentLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark: remark || `[${user.firstName} ${user.lastName}] Signed`,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Informed Consent Log Signed",
		`Your informed consent log entry (Sl No: ${entry.slNo}) has been signed off.`,
		{ type: "ENTRY_SIGNED", entityId: id, module: "consent-bad-news", category: "consent" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Consent & Bad News - Consent Signed",
		body: `Your consent log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} has been signed.`,
		type: "entry_signed",
		entityType: "ConsentLog",
		entityId: id,
		href: "/dashboard/student/consent-bad-news",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function rejectConsentLog(id: string, remark: string) {
	const { userId: clerkId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.consentLog.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "ConsentLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Consent Log Revision Requested",
		`Revision requested for consent log entry (Sl No: ${entry.slNo}): ${remark}`,
		{ type: "ENTRY_REVISED", entityId: id, module: "consent-bad-news", category: "consent" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Consent & Bad News - Consent Needs Revision",
		body: `Your consent log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} needs revision: ${remark}`,
		type: "entry_rejected",
		entityType: "ConsentLog",
		entityId: id,
		href: "/dashboard/student/consent-bad-news",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function bulkSignConsentLogs(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.consentLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.consentLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		});
		for (const entry of entries) {
			await tx.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "ConsentLog",
					entityId: entry.id,
				},
			});
			await recordReview(tx, {
				entityType: "ConsentLog",
				entityId: entry.id,
				ownerId: entry.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});

			await sendRealtimeNotification(
				entry.userId,
				"Informed Consent Log Signed",
				`Your informed consent log entry (Sl No: ${entry.slNo}) has been signed off.`,
				{ type: "ENTRY_SIGNED", entityId: entry.id, module: "consent-bad-news", category: "consent" }
			).catch(() => {});

			await sendNotificationToUser(entry.userId, {
				title: "Consent & Bad News - Consent Signed",
				body: `Your consent log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} has been signed.`,
				type: "entry_signed",
				entityType: "ConsentLog",
				entityId: entry.id,
				href: "/dashboard/student/consent-bad-news",
			}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
		}
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true, signedCount: entries.length };
}

export async function getStudentConsentLogs(studentId: string) {
	await requireRoleHybrid(["faculty", "hod"]);
	return prisma.consentLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

// ═══════════════════════════════════════════════════════════
//  H8: BAD NEWS LOG
// ═══════════════════════════════════════════════════════════

export async function addBadNewsLogRow() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existingCount = await prisma.badNewsLog.count({
		where: { userId: user.id },
	});

	if (existingCount >= 10) {
		throw new Error(
			"All 10 entry rows for Breaking Bad News have already been added to your logbook."
		);
	}

	const lastEntry = await prisma.badNewsLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.badNewsLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return entry;
}

export async function deleteBadNewsLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.badNewsLog.delete({ where: { id } });
	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function getMyBadNewsLogs() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	let entries = await prisma.badNewsLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});

	if (entries.length === 0) {
		await prisma.badNewsLog.createMany({
			data: Array.from({ length: 10 }).map((_, idx) => ({
				userId: user.id,
				slNo: idx + 1,
				status: "DRAFT" as never,
			})),
		});
		entries = await prisma.badNewsLog.findMany({
			where: { userId: user.id },
			orderBy: { slNo: "asc" },
		});
	}

	return entries;
}

export async function getMyConsentBadNewsSummary() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const [consentCount, consentSigned, badNewsCount, badNewsSigned] = await Promise.all([
		prisma.consentLog.count({ where: { userId: user.id } }),
		prisma.consentLog.count({ where: { userId: user.id, status: "SIGNED" as never } }),
		prisma.badNewsLog.count({ where: { userId: user.id } }),
		prisma.badNewsLog.count({ where: { userId: user.id, status: "SIGNED" as never } }),
	]);

	return {
		consent: { totalCount: consentCount, signedCount: consentSigned, maxEntries: 10 },
		badNews: { totalCount: badNewsCount, signedCount: badNewsSigned, maxEntries: 10 },
	};
}

export async function updateBadNewsLog(
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
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.badNewsLog.update({
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
			totalProcedureTally: data.totalProcedureTally ?? existing.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true, data: entry };
}

export async function submitBadNewsLog(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("badNewsLogs");

	if (autoReview) {
		await prisma.$transaction(async (tx) => {
			await tx.badNewsLog.update({
				where: { id },
				data: { status: "SIGNED" },
			});
			await tx.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "BadNewsLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			});
			await recordReview(tx, {
				entityType: "BadNewsLog",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-reviewed by system",
			});
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.badNewsLog.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "BadNewsLog",
				entityId: id,
				ownerId: user.id,
				snapshot: buildSnapshot(existing),
				attachments: [],
			});
		});

		// Send notification to student on submission
		await sendNotificationToUser(user.id, {
			title: "Consent & Bad News - Bad News Submitted",
			body: `Your bad news log entry${existing.completeDiagnosis ? ` for "${existing.completeDiagnosis}"` : ""} has been submitted for review.`,
			type: "entry_submitted",
			entityType: "BadNewsLog",
			entityId: id,
			href: "/dashboard/student/consent-bad-news",
		}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
	}

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

// Bad News Review

export async function getBadNewsLogsForReview() {
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

	return prisma.badNewsLog.findMany({
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

export async function signBadNewsLog(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.badNewsLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}` || entry.facultyRemark,
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "BadNewsLog",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "BadNewsLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark: remark || `[${user.firstName} ${user.lastName}] Signed`,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Breaking Bad News Log Signed",
		`Your breaking bad news log entry (Sl No: ${entry.slNo}) has been signed off.`,
		{ type: "ENTRY_SIGNED", entityId: id, module: "consent-bad-news", category: "bad-news" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Consent & Bad News - Bad News Signed",
		body: `Your bad news log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} has been signed.`,
		type: "entry_signed",
		entityType: "BadNewsLog",
		entityId: id,
		href: "/dashboard/student/consent-bad-news",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function rejectBadNewsLog(id: string, remark: string) {
	const { userId: clerkId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.badNewsLog.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "BadNewsLog",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	// Send Android Push Notification & Realtime Socket Event
	await sendRealtimeNotification(
		entry.userId,
		"Bad News Log Revision Requested",
		`Revision requested for breaking bad news log entry (Sl No: ${entry.slNo}): ${remark}`,
		{ type: "ENTRY_REVISED", entityId: id, module: "consent-bad-news", category: "bad-news" }
	).catch(() => {});

	// Send Web Push Notification
	await sendNotificationToUser(entry.userId, {
		title: "Consent & Bad News - Bad News Needs Revision",
		body: `Your bad news log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} needs revision: ${remark}`,
		type: "entry_rejected",
		entityType: "BadNewsLog",
		entityId: id,
		href: "/dashboard/student/consent-bad-news",
	}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true };
}

export async function bulkSignBadNewsLogs(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.badNewsLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction(async (tx) => {
		await tx.badNewsLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		});
		for (const entry of entries) {
			await tx.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "BadNewsLog",
					entityId: entry.id,
				},
			});
			await recordReview(tx, {
				entityType: "BadNewsLog",
				entityId: entry.id,
				ownerId: entry.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});

			await sendRealtimeNotification(
				entry.userId,
				"Breaking Bad News Log Signed",
				`Your breaking bad news log entry (Sl No: ${entry.slNo}) has been signed off.`,
				{ type: "ENTRY_SIGNED", entityId: entry.id, module: "consent-bad-news", category: "bad-news" }
			).catch(() => {});

			await sendNotificationToUser(entry.userId, {
				title: "Consent & Bad News - Bad News Signed",
				body: `Your bad news log entry${entry.completeDiagnosis ? ` for "${entry.completeDiagnosis}"` : ""} has been signed.`,
				type: "entry_signed",
				entityType: "BadNewsLog",
				entityId: entry.id,
				href: "/dashboard/student/consent-bad-news",
			}).catch((e) => console.error("[NOTIFICATION_ERROR]", e));
		}
	});

	revalidateConsentBadNews();
	await emitRealtimeEvent("entry:updated", { module: "consent-bad-news" });
	return { success: true, signedCount: entries.length };
}

export async function getStudentBadNewsLogs(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.badNewsLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
