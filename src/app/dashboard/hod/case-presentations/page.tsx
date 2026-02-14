/**
 * @module HOD Case Presentations Review Page
 * @description HOD review page for student case presentation submissions.
 * Same as the faculty page but always scoped as HOD (sees all students).
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCasePresentationsForReview } from "@/actions/case-presentations";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	CasePresentationReviewClient,
	type CasePresentationSubmission,
} from "../../faculty/case-presentations/CasePresentationReviewClient";

export default async function HodCasePresentationsPage() {
	try {
		await requireRole(["hod"]);
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
				description="Review all student case presentation submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Case Presentations" },
				]}
			/>
			<CasePresentationReviewClient
				submissions={submissions}
				role="hod"
				autoReviewEnabled={autoReviewSettings.casePresentations}
			/>
		</div>
	);
}
