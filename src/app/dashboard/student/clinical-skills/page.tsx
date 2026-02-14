/**
 * @module ClinicalSkillsPage
 * @description Student landing page for clinical skills with Adult/Pediatric tabs.
 * Auto-initializes 10 skills per type on first visit.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 * @see roadmap.md — Section 6C
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClinicalSkillsClient } from "./ClinicalSkillsClient";
import { getMyClinicalSkills, initializeClinicalSkills } from "@/actions/clinical-skills";
import { Loader2 } from "lucide-react";

async function ClinicalSkillsData() {
	const [adultEntries, pediatricEntries] = await Promise.all([
		getMyClinicalSkills("adult"),
		getMyClinicalSkills("pediatric"),
	]);

	return (
		<ClinicalSkillsClient
			adultEntries={JSON.parse(JSON.stringify(adultEntries))}
			pediatricEntries={JSON.parse(JSON.stringify(pediatricEntries))}
			initializeAction={initializeClinicalSkills}
		/>
	);
}

export default function ClinicalSkillsPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Clinical Skills Training"
				description="Track your clinical examination skills for both Adult and Pediatric patients. 10 skills per type with confidence levels."
			/>
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<ClinicalSkillsData />
			</Suspense>
		</div>
	);
}
