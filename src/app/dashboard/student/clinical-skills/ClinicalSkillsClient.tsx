/**
 * @module ClinicalSkillsClient
 * @description Client component for clinical skills page with Adult/Pediatric tabs.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicalSkillsTable } from "@/components/tables/ClinicalSkillsTable";
import { submitClinicalSkill } from "@/actions/clinical-skills";

interface ClinicalSkillEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	[key: string]: unknown;
}

interface ClinicalSkillsClientProps {
	adultEntries: ClinicalSkillEntry[];
	pediatricEntries: ClinicalSkillEntry[];
	initializeAction: (type: "adult" | "pediatric") => Promise<{ initialized: boolean }>;
}

export function ClinicalSkillsClient({
	adultEntries,
	pediatricEntries,
	initializeAction,
}: ClinicalSkillsClientProps) {
	return (
		<Tabs defaultValue="adult" className="space-y-4">
			<TabsList className="grid w-full max-w-md grid-cols-2">
				<TabsTrigger value="adult">Adult Patient</TabsTrigger>
				<TabsTrigger value="pediatric">Pediatric Patient</TabsTrigger>
			</TabsList>

			<TabsContent value="adult">
				<ClinicalSkillsTable
					entries={adultEntries}
					type="adult"
					onInitialize={() => initializeAction("adult")}
					onSubmit={submitClinicalSkill}
				/>
			</TabsContent>

			<TabsContent value="pediatric">
				<ClinicalSkillsTable
					entries={pediatricEntries}
					type="pediatric"
					onInitialize={() => initializeAction("pediatric")}
					onSubmit={submitClinicalSkill}
				/>
			</TabsContent>
		</Tabs>
	);
}
