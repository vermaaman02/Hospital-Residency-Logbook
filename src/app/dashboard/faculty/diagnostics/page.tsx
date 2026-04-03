/**
 * @module Faculty Diagnostics Review Page
 * @description Faculty/HOD review page for student diagnostic skill submissions.
 * Categories: ABG Analysis, ECG Analysis, Other Diagnostic.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDiagnosticSkillsForReview } from "@/actions/diagnostic-skills";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { DiagnosticSkillsReviewClient } from "./DiagnosticSkillsReviewClient";
import { Suspense } from "react";

export default async function FacultyDiagnosticsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
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
				description={
					authResult.role === "hod" ?
						"Review all student diagnostic skill submissions"
					:	"Review diagnostic skill submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Diagnostic Skills" },
				]}
			/>
			<Suspense fallback={<div>Loading...</div>}>
				<DiagnosticSkillsReviewClient
					submissions={submissions}
					role={authResult.role as "faculty" | "hod"}
					autoReviewEnabled={autoReviewSettings.diagnosticSkills}
				/>
			</Suspense>
		</div>
	);
}
