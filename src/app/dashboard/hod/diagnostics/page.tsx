/**
 * @module HOD Diagnostics Review Page
 * @description HOD-only view for reviewing all student diagnostic skill submissions.
 * Reuses DiagnosticSkillsReviewClient from faculty folder.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDiagnosticSkillsForReview } from "@/actions/diagnostic-skills";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { DiagnosticSkillsReviewClient } from "../../faculty/diagnostics/DiagnosticSkillsReviewClient";
import { Suspense } from "react";

export default async function HodDiagnosticsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getDiagnosticSkillsForReview(),
		getAutoReviewSettings(),
	]);

	const submissions = JSON.parse(JSON.stringify(rawSubmissions));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Diagnostic Skills — Review"
				description="Review all student diagnostic skill submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Diagnostic Skills" },
				]}
			/>
			<Suspense fallback={<div>Loading...</div>}>
				<DiagnosticSkillsReviewClient
					submissions={submissions}
					role="hod"
					autoReviewEnabled={autoReviewSettings.diagnosticSkills}
				/>
			</Suspense>
		</div>
	);
}
