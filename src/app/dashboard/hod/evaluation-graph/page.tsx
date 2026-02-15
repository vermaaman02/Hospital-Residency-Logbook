/**
 * @module HODEvaluationGraphPage
 * @description HOD fills Resident Evaluation Graph for all students.
 * 5-domain (1-5) scores per semester + Theory/Practical marks.
 * Can toggle whether faculty can fill evaluations.
 * Uses inline cell editing, can sign/bulk-sign evaluations.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

import {
	getStudentsForEvaluationGraph,
	getBatchesForEvaluationGraph,
	getAllEvaluationGraphRecords,
	isFacultyEvaluationEnabled,
} from "@/actions/evaluation-graph";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { EvaluationGraphClient } from "../../faculty/evaluation-graph/EvaluationGraphClient";
import { HODEvaluationSettings } from "./HODEvaluationSettings";

export const metadata = {
	title: "Evaluation Graph | HOD",
	description:
		"Complete 5-domain semester evaluations for all students, manage faculty permissions",
};

export default async function HODEvaluationGraphPage() {
	const [students, batches, existingRecords, settings] = await Promise.all([
		getStudentsForEvaluationGraph(),
		getBatchesForEvaluationGraph(),
		getAllEvaluationGraphRecords(),
		getAutoReviewSettings(),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-hospital-primary">
					Resident Evaluation Graph
				</h1>
				<p className="text-muted-foreground mt-1">
					Complete 5-domain evaluations (Knowledge, Clinical Skills, Procedural
					Skills, Soft Skills, Research) for each semester. You can also toggle
					whether faculty can fill evaluations.
				</p>
			</div>

			{/* Settings toggle */}
			<HODEvaluationSettings
				facultyEnabled={settings.evaluationGraphFacultyEnabled}
			/>

			<EvaluationGraphClient
				students={students}
				batches={batches}
				existingRecords={existingRecords}
				role="hod"
			/>
		</div>
	);
}
