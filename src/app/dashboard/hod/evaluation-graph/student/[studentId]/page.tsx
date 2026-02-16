/**
 * @module HODEvaluationGraphStudentView
 * @description HOD view of a specific student's evaluation graph (read-only).
 * Shows 5-domain evaluation scores by semester with chart.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

import { requireRole } from "@/lib/auth";
import { getStudentEvaluationGraph } from "@/actions/evaluation-graph";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentEvaluationGraphClient } from "@/app/dashboard/student/evaluation-graph/StudentEvaluationGraphClient";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HODEvaluationGraphStudentPage({
	params,
}: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [records, student] = await Promise.all([
		getStudentEvaluationGraph(studentId),
		getStudentBasicInfo(studentId),
	]);

	const serialized = JSON.parse(JSON.stringify(records));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Evaluation Graph`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Evaluation Graph",
						href: "/dashboard/hod/evaluation-graph",
					},
					{ label: studentName },
				]}
			/>
			<StudentEvaluationGraphClient
				records={serialized}
				studentName={studentName}
			/>
		</div>
	);
}
