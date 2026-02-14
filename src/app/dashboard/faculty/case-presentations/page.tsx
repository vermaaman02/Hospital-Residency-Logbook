/**
 * @module Faculty Case Presentations Review Page
 * @description Faculty/HOD review page for student case presentation submissions.
 * Fetches role-scoped data and renders CasePresentationReviewClient.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see actions/case-presentations.ts — getCasePresentationsForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCasePresentationsForReview } from "@/actions/case-presentations";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	CasePresentationReviewClient,
	type CasePresentationSubmission,
} from "./CasePresentationReviewClient";

export default async function FacultyCasePresentationsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getCasePresentationsForReview(),
		getAutoReviewSettings(),
	]);
	const submissions: CasePresentationSubmission[] = JSON.parse(
		JSON.stringify(rawSubmissions),
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Case Presentations — Review"
				description={
					authResult.role === "hod" ?
						"Review all student case presentation submissions"
					:	"Review case presentations from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Case Presentations" },
				]}
			/>
			<CasePresentationReviewClient
				submissions={submissions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewEnabled={autoReviewSettings.casePresentations}
			/>
		</div>
	);
}
