/**
 * @module HODStudentsPage
 * @description HOD view of all students in the department with logbook summaries.
 *
 * @see copilot-instructions.md — Section 8
 * @see roadmap.md — Section 11
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodStudentsClient } from "./HodStudentsClient";

export default async function HODStudentsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const students = await prisma.user.findMany({
		where: { role: "STUDENT" as never },
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
					evaluations: true,
				},
			},
			assignedFaculty: {
				include: {
					faculty: {
						select: { firstName: true, lastName: true },
					},
				},
			},
		},
		orderBy: [{ batch: "desc" }, { firstName: "asc" }],
	});

	const serializedStudents = students.map((s) => ({
		id: s.id,
		clerkId: s.clerkId,
		firstName: s.firstName,
		lastName: s.lastName,
		email: s.email,
		batch: s.batch,
		currentSemester: s.currentSemester,
		profileImage: s.profileImage,
		logCounts: {
			caseManagement: s._count.caseManagementLogs,
			procedures: s._count.procedureLogs,
			diagnostics: s._count.diagnosticSkills,
			imaging: s._count.imagingLogs,
			academic:
				s._count.casePresentations + s._count.seminars + s._count.journalClubs,
			evaluations: s._count.evaluations,
		},
		totalLogs:
			s._count.caseManagementLogs +
			s._count.procedureLogs +
			s._count.diagnosticSkills +
			s._count.imagingLogs +
			s._count.casePresentations +
			s._count.seminars +
			s._count.journalClubs,
		assignedFaculty: s.assignedFaculty.map((a) => ({
			semester: a.semester,
			facultyName: `${a.faculty.firstName} ${a.faculty.lastName}`,
		})),
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="All Students"
				description="View all students in the Emergency Medicine department"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "All Students" },
				]}
			/>
			<HodStudentsClient students={serializedStudents} />
		</div>
	);
}
