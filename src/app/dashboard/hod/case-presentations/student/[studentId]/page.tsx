/**
 * @module HodAcademicStudentView
 * @description HOD view of a specific student's case presentations and
 * seminar discussions (read-only, tabbed). Accessed by clicking student name
 * in the review table.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 */

import { requireRole } from "@/lib/auth";
import {
	getStudentCasePresentations,
	getStudentBasicInfo,
} from "@/actions/case-presentations";
import { getStudentSeminarDiscussions } from "@/actions/seminar-discussions";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentAcademicViewTabs } from "@/components/shared/StudentAcademicViewTabs";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HodAcademicStudentPage({ params }: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [cpEntries, sdEntries, student] = await Promise.all([
		getStudentCasePresentations(studentId),
		getStudentSeminarDiscussions(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serializedCPs = JSON.parse(JSON.stringify(cpEntries));
	const serializedSDs = JSON.parse(JSON.stringify(sdEntries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Presentations & Seminars`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Case Presentations & Seminars",
						href: "/dashboard/hod/case-presentations",
					},
					{ label: studentName },
				]}
			/>
			<StudentAcademicViewTabs
				casePresentations={serializedCPs}
				seminarDiscussions={serializedSDs}
				studentName={studentName}
			/>
		</div>
	);
}
