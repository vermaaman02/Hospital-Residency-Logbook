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
	casePresentations: number;
	journalClubs: number;
	clinicalSkills: number;
	caseManagement: number;
	procedureLogs: number;
	total: number;
}

/**
 * Get counts of SUBMITTED entries pending review, scoped by role.
 */
export async function getPendingReviewCounts(): Promise<PendingCounts> {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user)
		return {
			rotationPostings: 0,
			thesisRecords: 0,
			casePresentations: 0,
			journalClubs: 0,
			clinicalSkills: 0,
			caseManagement: 0,
			procedureLogs: 0,
			total: 0,
		};

	let studentIds: string[] = [];

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0)
			return {
				rotationPostings: 0,
				thesisRecords: 0,
				casePresentations: 0,
				journalClubs: 0,
				clinicalSkills: 0,
				caseManagement: 0,
				procedureLogs: 0,
				total: 0,
			};

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
	}

	const studentFilter =
		studentIds.length > 0 ? { userId: { in: studentIds } } : {};

	const [
		rotationPostings,
		thesisRecords,
		casePresentations,
		journalClubs,
		clinicalSkillsAdult,
		clinicalSkillsPediatric,
		caseManagement,
		procedureLogs,
	] = await Promise.all([
		prisma.rotationPosting.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.thesis.count({
			where: {
				...studentFilter,
				status: "SUBMITTED" as never,
			},
		}),
		prisma.casePresentation.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.journalClub.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.clinicalSkillAdult.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.clinicalSkillPediatric.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.caseManagementLog.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
		prisma.procedureLog.count({
			where: { ...studentFilter, status: "SUBMITTED" as never },
		}),
	]);

	const clinicalSkills = clinicalSkillsAdult + clinicalSkillsPediatric;

	const total =
		rotationPostings +
		thesisRecords +
		casePresentations +
		journalClubs +
		clinicalSkills +
		caseManagement +
		procedureLogs;

	return {
		rotationPostings,
		thesisRecords,
		casePresentations,
		journalClubs,
		clinicalSkills,
		caseManagement,
		procedureLogs,
		total,
	};
}
