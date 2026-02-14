/**
 * @module HOD Clinical Skills Review Page
 * @description HOD-only view for reviewing all student clinical skill submissions.
 * Reuses ClinicalSkillReviewClient from faculty folder.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClinicalSkillsForReview } from "@/actions/clinical-skills";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ClinicalSkillReviewClient } from "../../faculty/clinical-skills/ClinicalSkillReviewClient";

export default async function HodClinicalSkillsPage() {
	try {
		await requireRole(["hod"]);
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
				description="Review all student clinical skill submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Clinical Skills" },
				]}
			/>
			<ClinicalSkillReviewClient
				adultSubmissions={adultSubmissions}
				pediatricSubmissions={pediatricSubmissions}
				role="hod"
				autoReviewEnabled={autoReviewSettings.clinicalSkills}
			/>
		</div>
	);
}
