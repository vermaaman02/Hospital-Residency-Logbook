/**
 * @module HodDiagnosticStudentView
 * @description HOD view of a specific student's diagnostic skill entries (read-only).
 * Accessed by clicking student name in the Diagnostics review table.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { requireRole } from "@/lib/auth";
import { getStudentDiagnosticSkills } from "@/actions/diagnostic-skills";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentDiagnosticSkillsView } from "@/components/shared/StudentDiagnosticSkillsView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HodDiagnosticStudentPage({ params }: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [rawEntries, student] = await Promise.all([
		getStudentDiagnosticSkills(studentId),
		getStudentBasicInfo(studentId),
	]);

	const entries = JSON.parse(JSON.stringify(rawEntries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Diagnostic Skills`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Diagnostic Skills",
						href: "/dashboard/hod/diagnostics",
					},
					{ label: studentName },
				]}
			/>
			<StudentDiagnosticSkillsView
				entries={entries}
				studentName={studentName}
			/>
		</div>
	);
}
