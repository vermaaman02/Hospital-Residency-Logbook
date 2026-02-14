/**
 * @module FacultyCasePresentationStudentView
 * @description Faculty view of a specific student's case presentations (read-only).
 * Accessed by clicking student name in the Case Presentations review table.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 */

import { requireRole } from "@/lib/auth";
import {
	getStudentCasePresentations,
	getStudentBasicInfo,
} from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentCasePresentationView } from "@/components/shared/StudentCasePresentationView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyCasePresentationStudentPage({
	params,
}: PageProps) {
	await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	const [entries, student] = await Promise.all([
		getStudentCasePresentations(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = JSON.parse(JSON.stringify(entries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Case Presentations`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{
						label: "Case Presentations",
						href: "/dashboard/faculty/case-presentations",
					},
					{ label: studentName },
				]}
			/>
			<StudentCasePresentationView
				entries={serialized}
				studentName={studentName}
			/>
		</div>
	);
}
