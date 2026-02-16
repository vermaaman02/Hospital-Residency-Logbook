/**
 * @module FacultyEvaluationGraphPage
 * @description Faculty fills Resident Evaluation Graph for assigned students.
 * 5-domain (1-5) scores per semester + Theory/Practical marks.
 * Uses inline cell editing. HOD can toggle whether faculty can fill.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

import {
	getStudentsForEvaluationGraph,
	getBatchesForEvaluationGraph,
	getAllEvaluationGraphRecords,
	isFacultyEvaluationEnabled,
} from "@/actions/evaluation-graph";
import { EvaluationGraphClient } from "./EvaluationGraphClient";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = {
	title: "Evaluation Graph | Faculty",
	description: "Complete 5-domain semester evaluations for assigned students",
};

export default async function FacultyEvaluationGraphPage() {
	const enabled = await isFacultyEvaluationEnabled();

	if (!enabled) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold text-hospital-primary">
					Resident Evaluation Graph
				</h1>
				<Alert variant="destructive">
					<AlertCircle className="h-5 w-5" />
					<AlertTitle>Access Restricted</AlertTitle>
					<AlertDescription>
						The HOD has disabled faculty access to the Evaluation Graph. Only
						the HOD can fill evaluations at this time.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const [students, batches, existingRecords] = await Promise.all([
		getStudentsForEvaluationGraph(),
		getBatchesForEvaluationGraph(),
		getAllEvaluationGraphRecords(),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-hospital-primary">
					Resident Evaluation Graph
				</h1>
				<p className="text-muted-foreground mt-1">
					Complete 5-domain evaluations (Knowledge, Clinical Skills, Procedural
					Skills, Soft Skills, Research) for each semester. Click on a student
					to view/edit their evaluation.
				</p>
			</div>

			<EvaluationGraphClient
				students={students}
				batches={batches}
				existingRecords={existingRecords}
				role="faculty"
			/>
		</div>
	);
}
