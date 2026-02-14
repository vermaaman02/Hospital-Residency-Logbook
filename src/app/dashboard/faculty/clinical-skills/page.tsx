/**
 * @module Faculty Clinical Skills Review Page
 * @description Faculty/HOD review page for student clinical skill submissions.
 * Dedicated page with two tabs (Adult/Pediatric), search, filter, bulk actions,
 * detail sheet, and export.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClinicalSkillsForReview } from "@/actions/clinical-skills";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ClinicalSkillReviewClient } from "./ClinicalSkillReviewClient";

export default async function FacultyClinicalSkillsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawAdult, rawPediatric, autoReviewSettings] = await Promise.all([
		getClinicalSkillsForReview("adult"),
		getClinicalSkillsForReview("pediatric"),
		getAutoReviewSettings(),
	]);

	const adultSubmissions = JSON.parse(JSON.stringify(rawAdult));
	const pediatricSubmissions = JSON.parse(JSON.stringify(rawPediatric));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Clinical Skills — Review"
				description={
					authResult.role === "hod"
						? "Review all student clinical skill submissions"
						: "Review clinical skill submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod"
								? "/dashboard/hod"
								: "/dashboard/faculty",
					},
					{ label: "Clinical Skills" },
				]}
			/>
			<ClinicalSkillReviewClient
				adultSubmissions={adultSubmissions}
				pediatricSubmissions={pediatricSubmissions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewEnabled={autoReviewSettings.clinicalSkills}
			/>
		</div>
	);
}
