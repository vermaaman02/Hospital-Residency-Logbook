/**
 * @module HOD Internal Assessments Page
 * @description Server component for the HOD internal assessments management page.
 * Allows HOD to create, manage, and view all assessments across all batches.
 *
 * @see roadmap.md — Internal Assessments module
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import {
	getAllAssessments,
	getAvailableBatches,
	getAssessmentStats,
} from "@/actions/assessments";
import { HodAssessmentsClient } from "./HodAssessmentsClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function Content() {
	await requireRole(["hod"]);

	const [assessments, batches, stats] = await Promise.all([
		getAllAssessments(),
		getAvailableBatches(),
		getAssessmentStats(),
	]);

	// Serialize Date fields
	const serialized = JSON.parse(JSON.stringify(assessments));
	const serializedBatches = JSON.parse(JSON.stringify(batches));
	const serializedStats = JSON.parse(JSON.stringify(stats));

	return (
		<HodAssessmentsClient
			assessments={serialized}
			batches={serializedBatches}
			stats={serializedStats}
		/>
	);
}

export default function HodInternalAssessmentsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-100">
					<Loader2 className="h-8 w-8 animate-spin text-hospital-primary" />
				</div>
			}
		>
			<Content />
		</Suspense>
	);
}
