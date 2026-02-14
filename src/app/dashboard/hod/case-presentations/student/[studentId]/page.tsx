/**
 * @module HodCasePresentationStudentView
 * @description HOD view of a specific student's case presentations (read-only).
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

export default async function HodCasePresentationStudentPage({
	params,
}: PageProps) {
	await requireRole(["hod"]);
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
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Case Presentations",
						href: "/dashboard/hod/case-presentations",
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
