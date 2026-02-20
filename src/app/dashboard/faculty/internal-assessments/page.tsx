/**
 * @module Faculty Internal Assessments Page
 * @description Server component for faculty to manage internal assessments
 * for their assigned batches. Create, evaluate submissions, and reject with feedback.
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import {
	getFacultyAssessments,
	getAvailableBatches,
} from "@/actions/assessments";
import { FacultyAssessmentsClient } from "./FacultyAssessmentsClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function Content() {
	await requireRole(["faculty", "hod"]);

	const [assessments, batches] = await Promise.all([
		getFacultyAssessments(),
		getAvailableBatches(),
	]);

	const serialized = JSON.parse(JSON.stringify(assessments));
	const serializedBatches = JSON.parse(JSON.stringify(batches));

	return (
		<FacultyAssessmentsClient
			assessments={serialized}
			batches={serializedBatches}
		/>
	);
}

export default function FacultyInternalAssessmentsPage() {
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
