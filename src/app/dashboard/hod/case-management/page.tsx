/**
 * @module HOD Case Management Review Page
 * @description HOD-only view for reviewing all student case management submissions.
 * Reuses CaseManagementReviewClient from faculty folder.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCaseManagementForReview } from "@/actions/case-management";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { CaseManagementReviewClient } from "../../faculty/case-management/CaseManagementReviewClient";

export default async function HodCaseManagementPage() {
	try {
		await requireRole(["hod"]);
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
				description="Review all student case management submissions across 24 categories"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Case Management" },
				]}
			/>
			<CaseManagementReviewClient
				submissions={submissions}
				role="hod"
				autoReviewEnabled={autoReviewSettings.caseManagement}
			/>
		</div>
	);
}
