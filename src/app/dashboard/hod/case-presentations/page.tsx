/**
 * @module HOD Case Presentations & Seminars Review Page
 * @description HOD review page for student case presentation and seminar submissions.
 * Same as the faculty page but always scoped as HOD (sees all students). Tabbed layout.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCasePresentationsForReview } from "@/actions/case-presentations";
import { getSeminarDiscussionsForReview } from "@/actions/seminar-discussions";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ReviewAcademicTabs } from "../../faculty/case-presentations/ReviewAcademicTabs";

export default async function HodCasePresentationsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawCPs, rawSDs, autoReviewSettings] = await Promise.all([
		getCasePresentationsForReview(),
		getSeminarDiscussionsForReview(),
		getAutoReviewSettings(),
	]);
	const casePresentations = JSON.parse(JSON.stringify(rawCPs));
	const seminarDiscussions = JSON.parse(JSON.stringify(rawSDs));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Case Presentations & Seminars — Review"
				description="Review all student case presentation and seminar submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Case Presentations & Seminars" },
				]}
			/>
			<ReviewAcademicTabs
				casePresentations={casePresentations}
				seminarDiscussions={seminarDiscussions}
				role="hod"
				autoReviewCasePresentations={autoReviewSettings.casePresentations}
				autoReviewSeminarDiscussions={autoReviewSettings.seminarDiscussions}
			/>
		</div>
	);
}
