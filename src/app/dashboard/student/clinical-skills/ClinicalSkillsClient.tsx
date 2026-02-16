/**
 * @module ClinicalSkillsClient
 * @description Client component for clinical skills page with Adult/Pediatric tabs.
 * Uses ClinicalSkillTable for inline editing within each tab.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ClinicalSkillTable,
	type ClinicalSkillEntry,
	type FacultyOption,
} from "./ClinicalSkillTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { useCallback } from "react";

interface ClinicalSkillsClientProps {
	adultEntries: ClinicalSkillEntry[];
	pediatricEntries: ClinicalSkillEntry[];
	facultyList: FacultyOption[];
}

export function ClinicalSkillsClient({
	adultEntries,
	pediatricEntries,
	facultyList,
}: ClinicalSkillsClientProps) {
	// ---- Export ----

	const buildStudentExport = useCallback(
		(entries: ClinicalSkillEntry[], _label: string) => {
			return entries.map((e) => ({
				slNo: e.slNo,
				skillName: e.skillName,
				representativeDiagnosis: e.representativeDiagnosis,
				confidenceLevel: e.confidenceLevel,
				totalTimesPerformed: e.totalTimesPerformed,
				status: e.status,
			}));
		},
		[],
	);

	const handleExportPdf = useCallback(
		async (type: "adult" | "pediatric") => {
			const entries = type === "adult" ? adultEntries : pediatricEntries;
			const label = type === "adult" ? "Adult" : "Pediatric";
			const { exportClinicalSkillsToPdf } = await import(
				"@/lib/export/export-pdf"
			);
			await exportClinicalSkillsToPdf(buildStudentExport(entries, label), "Student", label);
		},
		[adultEntries, pediatricEntries, buildStudentExport],
	);

	const handleExportExcel = useCallback(
		async (type: "adult" | "pediatric") => {
			const entries = type === "adult" ? adultEntries : pediatricEntries;
			const label = type === "adult" ? "Adult" : "Pediatric";
			const { exportClinicalSkillsToExcel } = await import(
				"@/lib/export/export-excel"
			);
			exportClinicalSkillsToExcel(buildStudentExport(entries, label), "Student", label);
		},
		[adultEntries, pediatricEntries, buildStudentExport],
	);

	return (
		<Tabs defaultValue="adult" className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<TabsList className="grid w-full max-w-md grid-cols-2">
					<TabsTrigger value="adult">Adult Patient</TabsTrigger>
					<TabsTrigger value="pediatric">Pediatric Patient</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value="adult">
				<div className="space-y-4">
					<div className="flex justify-end">
						<ExportDropdown
							onExportPdf={() => handleExportPdf("adult")}
							onExportExcel={() => handleExportExcel("adult")}
							label="Export Adult"
						/>
					</div>
					<ClinicalSkillTable
						entries={adultEntries}
						facultyList={facultyList}
						type="adult"
					/>
				</div>
			</TabsContent>

			<TabsContent value="pediatric">
				<div className="space-y-4">
					<div className="flex justify-end">
						<ExportDropdown
							onExportPdf={() => handleExportPdf("pediatric")}
							onExportExcel={() => handleExportExcel("pediatric")}
							label="Export Pediatric"
						/>
					</div>
					<ClinicalSkillTable
						entries={pediatricEntries}
						facultyList={facultyList}
						type="pediatric"
					/>
				</div>
			</TabsContent>
		</Tabs>
	);
}
