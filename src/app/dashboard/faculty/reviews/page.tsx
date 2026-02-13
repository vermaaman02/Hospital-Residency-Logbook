/**
 * @module FacultyReviewsPage
 * @description Faculty page to review submitted entries from assigned students.
 * Shows pending sign-offs across rotation postings and other modules.
 *
 * @see roadmap.md — Phase 2: Faculty-student assignment
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacultyReviewsClient } from "./FacultyReviewsClient";

export default async function FacultyReviewsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	// Get assigned students
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: authResult.userId },
		select: { studentId: true },
	});
	const studentIds = assignments.map((a) => a.studentId);

	// For HOD, get ALL submitted entries; for faculty, only assigned students
	const studentFilter =
		authResult.role === "hod" ?
			{ status: "SUBMITTED" as const }
		:	{ userId: { in: studentIds }, status: "SUBMITTED" as const };

	// Get pending rotation postings
	const pendingRotations = await prisma.rotationPosting.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending attendance sheets (HOD only)
	const pendingAttendance =
		authResult.role === "hod" ?
			await prisma.attendanceSheet.findMany({
				where: { status: "SUBMITTED" },
				include: {
					user: { select: { firstName: true, lastName: true, email: true } },
					entries: true,
				},
				orderBy: { createdAt: "desc" },
			})
		:	[];

	// Get pending academic entries (Case Presentations, Seminars, Journal Clubs)
	const pendingCasePresentations = await prisma.casePresentation.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	const pendingSeminars = await prisma.seminar.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	const pendingJournalClubs = await prisma.journalClub.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending clinical skills (Adult + Pediatric)
	const pendingClinicalSkillsAdult = await prisma.clinicalSkillAdult.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { slNo: "asc" },
	});

	const pendingClinicalSkillsPediatric =
		await prisma.clinicalSkillPediatric.findMany({
			where: studentFilter,
			include: {
				user: { select: { firstName: true, lastName: true, email: true } },
			},
			orderBy: { slNo: "asc" },
		});

	// Get pending case management entries
	const pendingCaseManagement = await prisma.caseManagementLog.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending procedure log entries
	const pendingProcedureLogs = await prisma.procedureLog.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending diagnostic skill entries
	const pendingDiagnosticSkills = await prisma.diagnosticSkill.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending imaging log entries
	const pendingImagingLogs = await prisma.imagingLog.findMany({
		where: studentFilter,
		include: {
			user: { select: { firstName: true, lastName: true, email: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Review Submissions"
				description="Sign off or request revision on student submissions"
				breadcrumbs={[
					{
						label: "Dashboard",
						href: `/dashboard/${authResult.role === "hod" ? "hod" : "faculty"}`,
					},
					{ label: "Reviews" },
				]}
			/>
			<FacultyReviewsClient
				pendingRotations={pendingRotations}
				pendingAttendance={pendingAttendance}
				pendingCasePresentations={pendingCasePresentations}
				pendingSeminars={pendingSeminars}
				pendingJournalClubs={pendingJournalClubs}
				pendingClinicalSkillsAdult={JSON.parse(
					JSON.stringify(pendingClinicalSkillsAdult),
				)}
				pendingClinicalSkillsPediatric={JSON.parse(
					JSON.stringify(pendingClinicalSkillsPediatric),
				)}
				pendingCaseManagement={JSON.parse(
					JSON.stringify(pendingCaseManagement),
				)}
				pendingProcedureLogs={JSON.parse(JSON.stringify(pendingProcedureLogs))}
				pendingDiagnosticSkills={JSON.parse(
					JSON.stringify(pendingDiagnosticSkills),
				)}
				pendingImagingLogs={JSON.parse(JSON.stringify(pendingImagingLogs))}
				isHod={authResult.role === "hod"}
			/>
		</div>
	);
}
