/**
 * @module HODJournalClubStudentView
 * @description HOD view of a specific student's journal club entries (read-only).
 * Accessed by clicking student name in the Journal Club review table.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 */

import { requireRole } from "@/lib/auth";
import { getStudentJournalClubs } from "@/actions/journal-clubs";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentJournalClubView } from "@/components/shared/StudentJournalClubView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HODJournalClubStudentPage({ params }: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [entries, student] = await Promise.all([
		getStudentJournalClubs(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = JSON.parse(JSON.stringify(entries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Journal Clubs`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Journal Clubs",
						href: "/dashboard/hod/journal-clubs",
					},
					{ label: studentName },
				]}
			/>
			<StudentJournalClubView entries={serialized} studentName={studentName} />
		</div>
	);
}
