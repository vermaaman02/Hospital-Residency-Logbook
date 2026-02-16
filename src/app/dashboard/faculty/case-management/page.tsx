/**
 * @module Faculty Case Management Review Page
 * @description Faculty/HOD review page for student case management submissions.
 * Dedicated page with category filter, search, bulk actions, detail sheet, and export.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCaseManagementForReview } from "@/actions/case-management";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { CaseManagementReviewClient } from "./CaseManagementReviewClient";

export default async function FacultyCaseManagementPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getCaseManagementForReview(),
		getAutoReviewSettings(),
	]);

	const submissions = JSON.parse(JSON.stringify(rawSubmissions));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Case Management — Review"
				description={
					authResult.role === "hod" ?
						"Review all student case management submissions across 24 categories"
					:	"Review case management submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Case Management" },
				]}
			/>
			<CaseManagementReviewClient
				submissions={submissions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewEnabled={autoReviewSettings.caseManagement}
			/>
		</div>
	);
}
