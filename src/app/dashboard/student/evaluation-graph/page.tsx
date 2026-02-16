/**
 * @module StudentEvaluationGraphPage
 * @description Student views their 5-domain evaluation graph (read-only).
 * Shows radar chart and semester-wise table with scores filled by faculty/HOD.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

import { getMyEvaluationGraph } from "@/actions/evaluation-graph";
import { ensureUserInDb } from "@/lib/auth";
import { StudentEvaluationGraphClient } from "./StudentEvaluationGraphClient";

export const metadata = {
	title: "My Evaluation Graph | Student",
	description: "View your 5-domain semester evaluation scores",
};

export default async function StudentEvaluationGraphPage() {
	const [records, user] = await Promise.all([
		getMyEvaluationGraph(),
		ensureUserInDb(),
	]);
	const studentName = user ? `${user.firstName} ${user.lastName}` : "Student";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-hospital-primary">
					My Evaluation Graph
				</h1>
				<p className="text-muted-foreground mt-1">
					View your 5-domain evaluation scores (Knowledge, Clinical Skills,
					Procedural Skills, Soft Skills, Research) for each semester, as
					completed by your faculty or HOD.
				</p>
			</div>

			<StudentEvaluationGraphClient
				records={records}
				studentName={studentName}
			/>
		</div>
	);
}
