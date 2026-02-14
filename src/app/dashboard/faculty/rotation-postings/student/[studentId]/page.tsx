/**
 * @module FacultyRotationPostingStudentView
 * @description Faculty view of a specific student's rotation postings (read-only).
 * Accessed by clicking student name in the Rotation Postings review table.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

import { requireRole } from "@/lib/auth";
import { getStudentRotationPostings } from "@/actions/rotation-postings";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentRotationPostingView } from "@/components/shared/StudentRotationPostingView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyRotationPostingStudentPage({
	params,
}: PageProps) {
	await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	const [entries, student] = await Promise.all([
		getStudentRotationPostings(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = JSON.parse(JSON.stringify(entries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Rotation Postings`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{
						label: "Rotation Postings",
						href: "/dashboard/faculty/rotation-postings",
					},
					{ label: studentName },
				]}
			/>
			<StudentRotationPostingView
				entries={serialized}
				studentName={studentName}
			/>
		</div>
	);
}
