/**
 * @module Review Counts
 * @description Server action to get pending submission counts for sidebar badges
 * and notification bell. Scoped by role: faculty sees only assigned students,
 * HOD sees all.
 *
 * @see components/layout/Sidebar.tsx — badge counts
 * @see components/layout/TopBar.tsx — notification count
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface PendingCounts {
	rotationPostings: number;
	thesisRecords: number;
	total: number;
}

/**
 * Get counts of SUBMITTED entries pending review, scoped by role.
 */
export async function getPendingReviewCounts(): Promise<PendingCounts> {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user)
		return { rotationPostings: 0, thesisRecords: 0, total: 0 };

	let studentIds: string[] = [];

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0)
			return { rotationPostings: 0, thesisRecords: 0, total: 0 };

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
	}

	const studentFilter =
		studentIds.length > 0 ? { userId: { in: studentIds } } : {};

	const [rotationPostings, thesisRecords] = await Promise.all([
		prisma.rotationPosting.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.thesis.count({
			where: {
				...studentFilter,
				// Count theses that have content (topic set) — useful for review
				topic: { not: null },
			},
		}),
	]);

	const total = rotationPostings + thesisRecords;

	return { rotationPostings, thesisRecords, total };
}
