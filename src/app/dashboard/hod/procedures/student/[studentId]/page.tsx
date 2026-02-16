/**
 * @module HODProcedureStudentView
 * @description HOD view of a specific student's procedure log entries (read-only).
 * Accessed by clicking student name in the Procedure Logs review table.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { requireRole } from "@/lib/auth";
import { getStudentProcedureLogs } from "@/actions/procedure-logs";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentProcedureLogsView } from "@/components/shared/StudentProcedureLogsView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HodProcedureStudentPage({ params }: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [rawEntries, student] = await Promise.all([
		getStudentProcedureLogs(studentId),
		getStudentBasicInfo(studentId),
	]);

	const entries = JSON.parse(JSON.stringify(rawEntries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Procedure Logs`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Procedures",
						href: "/dashboard/hod/procedures",
					},
					{ label: studentName },
				]}
			/>
			<StudentProcedureLogsView entries={entries} studentName={studentName} />
		</div>
	);
}
