/**
 * @module HodThesisStudentView
 * @description HOD view of a specific student's thesis record (read-only).
 * Accessed by clicking student name in the Thesis review table.
 *
 * @see PG Logbook .md — "THESIS" section
 */

import { requireRole } from "@/lib/auth";
import { getStudentThesis } from "@/actions/thesis";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentThesisView } from "@/components/shared/StudentThesisView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HodThesisStudentPage({ params }: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [thesis, student] = await Promise.all([
		getStudentThesis(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = thesis ? JSON.parse(JSON.stringify(thesis)) : null;
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Thesis Record`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Thesis Review",
						href: "/dashboard/hod/thesis-review",
					},
					{ label: studentName },
				]}
			/>
			<StudentThesisView thesis={serialized} studentName={studentName} />
		</div>
	);
}
