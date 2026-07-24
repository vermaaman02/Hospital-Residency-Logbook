/**
 * @module Journal Club Actions
 * @description Server actions for CRUD operations on journal club entries.
 * Supports inline/cell editing, faculty sign-off, bulk operations, and auto-review.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 * @see prisma/schema.prisma — JournalClub model
 */

"use server";

import { requireAuthHybrid, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { sendRealtimeNotification } from "@/lib/notifications";

// ======================== PATHS ========================

const STUDENT_PATH = "/dashboard/student/journal-clubs";
const FACULTY_PATH = "/dashboard/faculty/journal-clubs";
const HOD_PATH = "/dashboard/hod/journal-clubs";

function revalidateAll() {
	revalidatePath(STUDENT_PATH);
	revalidatePath(FACULTY_PATH);
	revalidatePath(HOD_PATH);
}

// ======================== TYPES ========================

interface JournalClubData {
	date: Date | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	facultyId: string | null;
}

// ======================== STUDENT ACTIONS ========================

/**
 * Resolve the internal DB user from the Clerk session.
 */
async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

/**
 * Create a new journal club entry (inline row).
 */
export async function createJournalClub(data: JournalClubData) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.journalClub.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.journalClub.create({
		data: {
			userId: user.id,
			slNo,
			date: data.date,
			journalArticle: data.journalArticle,
			typeOfStudy: data.typeOfStudy,
			facultyRemark: data.facultyRemark,
			facultyId: data.facultyId,
			status: "DRAFT",
		},
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true, data: entry };
}

/**
 * Update an existing journal club entry (inline save).
 */
export async function updateJournalClub(id: string, data: JournalClubData) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.journalClub.update({
		where: { id },
		data: {
			date: data.date,
			journalArticle: data.journalArticle,
			typeOfStudy: data.typeOfStudy,
			facultyRemark: data.facultyRemark,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true, data: entry };
}

/**
 * Submit a journal club entry for faculty review.
 * If auto-review is enabled, automatically signs the entry.
 */
export async function submitJournalClub(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("journalClubs");

	if (autoReview) {
		await prisma.$transaction(async (tx) => {
			await tx.journalClub.update({
				where: { id },
				data: { status: "SIGNED" },
			});
			await tx.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "JournalClub",
					entityId: id,
					remark: "Auto-approved",
				},
			});
			await recordReview(tx, {
				entityType: "JournalClub",
				entityId: id,
				ownerId: existing.userId,
				reviewerId: "auto-review",
				reviewerRole: "hod",
				decision: "SIGNED",
				remark: "Auto-approved",
			});
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.journalClub.update({
				where: { id },
				data: { status: "SUBMITTED" },
			});
			await recordSubmission(tx, {
				entityType: "JournalClub",
				entityId: id,
				ownerId: user.id,
				snapshot: { status: "SUBMITTED" },
			});
		});
	}

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/**
 * Delete a draft journal club entry.
 */
export async function deleteJournalClub(id: string) {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Can only delete draft or revision entries");
	}

	await prisma.journalClub.delete({ where: { id } });

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	return { success: true };
}

/**
 * Get all journal club entries for the current student.
 */
export async function getMyJournalClubs() {
	const clerkId = await requireAuthHybrid();
	const user = await resolveUser(clerkId);

	return prisma.journalClub.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Get available faculty for the student's "Faculty Sign" dropdown.
 */
export async function getAvailableJournalClubFaculty() {
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

// ======================== FACULTY / HOD ACTIONS ========================

/**
 * Faculty/HOD: Get all journal club submissions for review.
 */
export async function getJournalClubsForReview() {
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

	const where = studentIds.length > 0 ? { userId: { in: studentIds } } : {};

	const journalClubs = await prisma.journalClub.findMany({
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
	const signatures = await prisma.digitalSignature.findMany({
		where: {
			entityType: "JournalClub",
			entityId: { in: journalClubs.map((j) => j.id) },
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

	// Attach signatures to journal clubs
	const journalClubsWithSignatures = journalClubs.map((j) => ({
		...j,
		signatures: signatures.filter((sig) => sig.entityId === j.id),
	}));

	return journalClubsWithSignatures;
}

/**
 * Faculty/HOD: Sign (approve) a journal club entry.
 */
export async function signJournalClub(id: string, remark?: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.journalClub.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction(async (tx) => {
		await tx.journalClub.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		});
		await tx.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "JournalClub",
				entityId: id,
				remark,
			},
		});
		await recordReview(tx, {
			entityType: "JournalClub",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "SIGNED",
			remark,
		});
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	await sendRealtimeNotification(
		entry.userId,
		"Journal Club Signed",
		`Your Journal Club entry "${entry.journalArticle || "Entry #" + entry.slNo}" has been approved and signed.`,
		{ type: "journal-clubs", id: entry.id }
	);
	return { success: true };
}

/**
 * Faculty/HOD: Reject a journal club entry with remark.
 */
export async function rejectJournalClub(id: string, remark: string) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.journalClub.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.$transaction(async (tx) => {
		await tx.journalClub.update({
			where: { id },
			data: {
				status: "NEEDS_REVISION",
				facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
			},
		});
		await recordReview(tx, {
			entityType: "JournalClub",
			entityId: id,
			ownerId: entry.userId,
			reviewerId: user.id,
			reviewerRole: "faculty",
			decision: "NEEDS_REVISION",
			remark: `[${user.firstName} ${user.lastName}] ${remark}`,
		});
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	await sendRealtimeNotification(
		entry.userId,
		"Journal Club Revision Required",
		`Revision requested for your Journal Club entry "${entry.journalArticle || "Entry #" + entry.slNo}": ${remark}`,
		{ type: "journal-clubs", id: entry.id }
	);
	return { success: true };
}

/**
 * Faculty/HOD: Bulk sign multiple journal club entries.
 */
export async function bulkSignJournalClubs(ids: string[]) {
	const { userId } = await requireRoleHybrid(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.journalClub.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});

	if (entries.length === 0) throw new Error("No submittable entries found");

	await prisma.$transaction(async (tx) => {
		await tx.journalClub.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		});
		for (const entry of entries) {
			await tx.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "JournalClub",
					entityId: entry.id,
				},
			});
			await recordReview(tx, {
				entityType: "JournalClub",
				entityId: entry.id,
				ownerId: entry.userId,
				reviewerId: user.id,
				reviewerRole: "faculty",
				decision: "SIGNED",
				remark: "Bulk signed",
			});
		}
	});

	revalidateAll();
	emitRealtimeEvent("entry:updated");
	for (const entry of entries) {
		await sendRealtimeNotification(
			entry.userId,
			"Journal Club Signed",
			`Your Journal Club entry "${entry.journalArticle || "Entry #" + entry.slNo}" has been approved and signed.`,
			{ type: "journal-clubs", id: entry.id }
		);
	}
	return { success: true };
}

/**
 * Faculty/HOD: Get all journal club entries for a specific student (read-only view).
 */
export async function getStudentJournalClubs(studentId: string) {
	await requireRoleHybrid(["faculty", "hod"]);
	return prisma.journalClub.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
