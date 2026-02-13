/**
 * @module FacultyStudentsPage
 * @description Faculty view of their assigned students with logbook summaries.
 * Faculty can see each student's progress across all modules.
 *
 * @see copilot-instructions.md — Section 8
 * @see roadmap.md — Section 11
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureUserInDb } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacultyStudentsClient } from "./FacultyStudentsClient";

export default async function FacultyStudentsPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	// Find or create the user in our database
	const user = await ensureUserInDb();
	if (!user) redirect("/sign-in");

	// Get faculty-student assignments with student details and log counts
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: user.id },
		include: {
			student: {
				select: {
					id: true,
					clerkId: true,
					firstName: true,
					lastName: true,
					email: true,
					batch: true,
					currentSemester: true,
					profileImage: true,
					_count: {
						select: {
							caseManagementLogs: true,
							procedureLogs: true,
							diagnosticSkills: true,
							imagingLogs: true,
							casePresentations: true,
							seminars: true,
							journalClubs: true,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	// Serialize for client component
	const students = assignments.map((a) => ({
		assignmentId: a.id,
		semester: a.semester,
		studentId: a.student.id,
		clerkId: a.student.clerkId,
		firstName: a.student.firstName,
		lastName: a.student.lastName,
		email: a.student.email,
		batch: a.student.batch,
		currentSemester: a.student.currentSemester,
		profileImage: a.student.profileImage,
		logCounts: {
			caseManagement: a.student._count.caseManagementLogs,
			procedures: a.student._count.procedureLogs,
			diagnostics: a.student._count.diagnosticSkills,
			imaging: a.student._count.imagingLogs,
			casePresentations: a.student._count.casePresentations,
			seminars: a.student._count.seminars,
			journalClubs: a.student._count.journalClubs,
		},
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Students"
				description="View assigned students and their logbook progress"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{ label: "My Students" },
				]}
			/>
			<FacultyStudentsClient students={students} />
		</div>
	);
}
