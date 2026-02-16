/**
 * @module HODStudentsPage
 * @description HOD view of all students with full logbook summaries, progress,
 * signed counts, and faculty assignments. Pro-level department control.
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

	const [students, totalFaculty] = await Promise.all([
		prisma.user.findMany({
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
				status: true,
				createdAt: true,
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
						clinicalSkillsAdult: true,
						clinicalSkillsPediatric: true,
					},
				},
				caseManagementLogs: {
					where: { status: "SIGNED" },
					select: { id: true },
				},
				procedureLogs: {
					where: { status: "SIGNED" },
					select: { id: true },
				},
				assignedFaculty: {
					include: {
						faculty: {
							select: { firstName: true, lastName: true },
						},
					},
				},
				thesis: {
					select: { topic: true, status: true },
				},
			},
			orderBy: [{ batch: "desc" }, { firstName: "asc" }],
		}),
		prisma.user.count({ where: { role: "FACULTY" as never } }),
	]);

	const serializedStudents = students.map((s) => {
		const totalLogs =
			s._count.caseManagementLogs +
			s._count.procedureLogs +
			s._count.diagnosticSkills +
			s._count.imagingLogs +
			s._count.casePresentations +
			s._count.seminars +
			s._count.journalClubs;
		const totalSigned = s.caseManagementLogs.length + s.procedureLogs.length;

		return {
			id: s.id,
			clerkId: s.clerkId,
			firstName: s.firstName,
			lastName: s.lastName,
			email: s.email,
			batch: s.batch,
			currentSemester: s.currentSemester,
			profileImage: s.profileImage,
			status: s.status as string,
			joinedAt: s.createdAt.toISOString(),
			logCounts: {
				caseManagement: s._count.caseManagementLogs,
				procedures: s._count.procedureLogs,
				diagnostics: s._count.diagnosticSkills,
				imaging: s._count.imagingLogs,
				academic:
					s._count.casePresentations +
					s._count.seminars +
					s._count.journalClubs,
				clinicalSkills:
					s._count.clinicalSkillsAdult + s._count.clinicalSkillsPediatric,
				evaluations: s._count.evaluations,
			},
			totalLogs,
			totalSigned,
			thesisTopic: s.thesis?.topic ?? null,
			thesisStatus: (s.thesis?.status as string) ?? null,
			assignedFaculty: s.assignedFaculty.map((a) => ({
				semester: a.semester,
				facultyName: `${a.faculty.firstName} ${a.faculty.lastName}`,
			})),
		};
	});

	const stats = {
		totalStudents: students.length,
		totalFaculty,
		totalEntries: serializedStudents.reduce((a, s) => a + s.totalLogs, 0),
		totalSigned: serializedStudents.reduce((a, s) => a + s.totalSigned, 0),
		avgEntriesPerStudent:
			students.length > 0 ?
				Math.round(
					serializedStudents.reduce((a, s) => a + s.totalLogs, 0) /
						students.length,
				)
			:	0,
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<PageHeader
				title="All Students"
				description="Manage and monitor all PG residents in the Emergency Medicine department"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "All Students" },
				]}
			/>
			<HodStudentsClient students={serializedStudents} stats={stats} />
		</div>
	);
}
