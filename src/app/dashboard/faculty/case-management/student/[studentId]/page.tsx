/**
 * @module FacultyCaseManagementStudentView
 * @description Faculty view of a specific student's case management entries (read-only).
 * Accessed by clicking student name in the Case Management review table.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { requireRole } from "@/lib/auth";
import { getStudentCaseManagement } from "@/actions/case-management";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentCaseManagementView } from "@/components/shared/StudentCaseManagementView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyCaseManagementStudentPage({
	params,
}: PageProps) {
	await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	const [rawEntries, student] = await Promise.all([
		getStudentCaseManagement(studentId),
		getStudentBasicInfo(studentId),
	]);

	const entries = JSON.parse(JSON.stringify(rawEntries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Case Management`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{
						label: "Case Management",
						href: "/dashboard/faculty/case-management",
					},
					{ label: studentName },
				]}
			/>
			<StudentCaseManagementView entries={entries} studentName={studentName} />
		</div>
	);
}
