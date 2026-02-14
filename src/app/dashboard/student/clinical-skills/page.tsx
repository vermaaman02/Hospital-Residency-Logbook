/**
 * @module ClinicalSkillsPage
 * @description Student landing page for clinical skills with Adult/Pediatric tabs.
 * Inline editing table with confidence levels, faculty sign, tally.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 * @see roadmap.md — Section 6C
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClinicalSkillsClient } from "./ClinicalSkillsClient";
import {
	getMyClinicalSkills,
	getAvailableClinicalSkillFaculty,
} from "@/actions/clinical-skills";
import { Loader2 } from "lucide-react";

async function ClinicalSkillsData() {
	const [adultEntries, pediatricEntries, facultyList] = await Promise.all([
		getMyClinicalSkills("adult"),
		getMyClinicalSkills("pediatric"),
		getAvailableClinicalSkillFaculty(),
	]);

	return (
		<ClinicalSkillsClient
			adultEntries={JSON.parse(JSON.stringify(adultEntries))}
			pediatricEntries={JSON.parse(JSON.stringify(pediatricEntries))}
			facultyList={JSON.parse(JSON.stringify(facultyList))}
		/>
	);
}

export default function ClinicalSkillsPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Clinical Skills Training"
				description="Track your clinical examination skills for both Adult and Pediatric patients. Click any row to edit inline."
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
