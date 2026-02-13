/**
 * @module FacultyEvaluationsPage
 * @description Faculty evaluation page — evaluate assigned students.
 * Faculty can: set 5-domain scores, add theory/practical marks, sign/reject reviews.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 * @see roadmap.md — Phase 8
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacultyEvaluationsClient } from "./FacultyEvaluationsClient";

export default async function FacultyEvaluationsPage() {
	let userId: string;
	try {
		const result = await requireRole(["faculty", "hod"]);
		userId = result.userId;
	} catch {
		redirect("/sign-in");
	}

	// Get assigned students
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: userId },
		include: {
			student: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					batch: true,
					currentSemester: true,
				},
			},
		},
	});

	// Dedupe students (may have multiple semester assignments)
	const studentMap = new Map<
		string,
		{
			id: string;
			firstName: string;
			lastName: string;
			batch: string | null;
			currentSemester: number | null;
		}
	>();
	for (const a of assignments) {
		if (!studentMap.has(a.student.id)) {
			studentMap.set(a.student.id, a.student);
		}
	}
	const students = Array.from(studentMap.values());

	// Get evaluations for all assigned students
	const studentIds = students.map((s) => s.id);
	const evaluations = await prisma.residentEvaluation.findMany({
		where: { userId: { in: studentIds } },
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					batch: true,
					currentSemester: true,
				},
			},
		},
	});

	const serializedStudents = JSON.parse(JSON.stringify(students));
	const serializedEvaluations = JSON.parse(JSON.stringify(evaluations));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Student Evaluations"
				description="Review periodic logbook entries, score students on 5 domains, and fill end-semester assessments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{ label: "Evaluations" },
				]}
			/>
			<FacultyEvaluationsClient
				students={serializedStudents}
				evaluations={serializedEvaluations}
			/>
		</div>
	);
}
