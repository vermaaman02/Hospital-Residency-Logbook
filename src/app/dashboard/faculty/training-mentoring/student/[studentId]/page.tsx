/**
 * @module FacultyTrainingStudentView
 * @description Faculty view of a specific student's training & mentoring records (read-only).
 * Accessed by clicking student name in the Training & Mentoring tab.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

import { requireRole } from "@/lib/auth";
import { getStudentTrainingRecords } from "@/actions/training-mentoring";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentTrainingView } from "@/components/shared/StudentTrainingView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyTrainingStudentPage({
	params,
}: PageProps) {
	await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	const [records, student] = await Promise.all([
		getStudentTrainingRecords(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = JSON.parse(JSON.stringify(records));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Training & Mentoring`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{
						label: "Training & Mentoring",
						href: "/dashboard/faculty/training-mentoring",
					},
					{ label: studentName },
				]}
			/>
			<StudentTrainingView records={serialized} studentName={studentName} />
		</div>
	);
}
