/**
 * @module Faculty Case Presentations & Seminars Review Page
 * @description Faculty/HOD review page for student case presentation and
 * seminar/evidence-based discussion submissions. Tabbed layout.
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
import { ReviewAcademicTabs } from "./ReviewAcademicTabs";

export default async function FacultyCasePresentationsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
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
				description={
					authResult.role === "hod" ?
						"Review all student case presentation and seminar submissions"
					:	"Review case presentations and seminars from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Case Presentations & Seminars" },
				]}
			/>
			<ReviewAcademicTabs
				casePresentations={casePresentations}
				seminarDiscussions={seminarDiscussions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewCasePresentations={autoReviewSettings.casePresentations}
				autoReviewSeminarDiscussions={autoReviewSettings.seminarDiscussions}
			/>
		</div>
	);
}
