/**
 * @module Journal Club Actions
 * @description Server actions for CRUD operations on journal club entries.
 * Physical logbook allows 10 entries. Fields differ from Case Presentations / Seminars.
 *
 * @see PG Logbook .md — Section: "JOURNAL CLUB PRESENTED"
 * @see prisma/schema.prisma — JournalClub model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	journalClubSchema,
	type JournalClubInput,
} from "@/lib/validators/academics";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/dashboard/student/journal-clubs";

/**
 * Create a new journal club entry.
 */
export async function createJournalClub(data: JournalClubInput) {
	const userId = await requireAuth();
	const validated = journalClubSchema.parse(data);

	const lastEntry = await prisma.journalClub.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	const entry = await prisma.journalClub.create({
		data: {
			userId,
			slNo,
			date: validated.date,
			journalArticle: validated.journalArticle,
			typeOfStudy: validated.typeOfStudy,
			status: "DRAFT",
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true, data: entry };
}

/**
 * Update an existing journal club entry.
 */
export async function updateJournalClub(id: string, data: JournalClubInput) {
	const userId = await requireAuth();
	const validated = journalClubSchema.parse(data);

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.journalClub.update({
		where: { id },
		data: {
			date: validated.date,
			journalArticle: validated.journalArticle,
			typeOfStudy: validated.typeOfStudy,
			status: "DRAFT",
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true, data: entry };
}

/**
 * Submit a journal club entry for faculty review.
 */
export async function submitJournalClub(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await prisma.journalClub.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Delete a draft journal club entry.
 */
export async function deleteJournalClub(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.journalClub.findUnique({ where: { id } });
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status !== "DRAFT") {
		throw new Error("Can only delete draft entries");
	}

	await prisma.journalClub.delete({ where: { id } });

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Get all journal club entries for the current student.
 */
export async function getMyJournalClubs() {
	const userId = await requireAuth();

	return prisma.journalClub.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

/**
 * Faculty: Sign a journal club entry.
 */
export async function signJournalClub(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);

	const entry = await prisma.journalClub.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.journalClub.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType: "JournalClub",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

/**
 * Faculty: Reject a journal club entry with remark.
 */
export async function rejectJournalClub(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.journalClub.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.journalClub.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}
