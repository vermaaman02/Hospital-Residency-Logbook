/**
 * @module CaseManagementCategoryClient
 * @description Client wrapper for a single case management category page.
 * Shows the inline editing table + export dropdown.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

"use client";

import {
	CaseManagementTable,
	type CaseManagementEntry,
	type FacultyOption,
} from "./CaseManagementTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { COMPETENCY_LEVEL_OPTIONS } from "@/lib/constants/case-management-fields";
import { useCallback } from "react";

interface CaseManagementCategoryClientProps {
	entries: CaseManagementEntry[];
	facultyList: FacultyOption[];
	category: string;
	categoryLabel: string;
}

export function CaseManagementCategoryClient({
	entries,
	facultyList,
	category,
	categoryLabel,
}: CaseManagementCategoryClientProps) {
	const competencyLabel = useCallback((val: string | null) => {
		if (!val) return "—";
		return (
			COMPETENCY_LEVEL_OPTIONS.find((cl) => cl.value === val)?.label ?? val
		);
	}, []);

	const handleExportPdf = useCallback(async () => {
		const { exportCaseManagementToPdf } =
			await import("@/lib/export/export-pdf");
		const data = entries.map((e) => ({
			slNo: e.slNo,
			caseSubCategory: e.caseSubCategory,
			date: e.date,
			patientName: e.patientName,
			patientAge: e.patientAge,
			patientSex: e.patientSex,
			uhid: e.uhid,
			completeDiagnosis: e.completeDiagnosis,
			competencyLevel: competencyLabel(e.competencyLevel),
			totalCaseTally: e.totalCaseTally,
			status: e.status,
		}));
		await exportCaseManagementToPdf(data, "Student", categoryLabel);
	}, [entries, categoryLabel, competencyLabel]);

	const handleExportExcel = useCallback(async () => {
		const { exportCaseManagementToExcel } =
			await import("@/lib/export/export-excel");
		const data = entries.map((e) => ({
			slNo: e.slNo,
			caseSubCategory: e.caseSubCategory,
			date: e.date,
			patientName: e.patientName,
			patientAge: e.patientAge,
			patientSex: e.patientSex,
			uhid: e.uhid,
			completeDiagnosis: e.completeDiagnosis,
			competencyLevel: competencyLabel(e.competencyLevel),
			totalCaseTally: e.totalCaseTally,
			status: e.status,
		}));
		exportCaseManagementToExcel(data, "Student", categoryLabel);
	}, [entries, categoryLabel, competencyLabel]);

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<ExportDropdown
					onExportPdf={handleExportPdf}
					onExportExcel={handleExportExcel}
					label={`Export ${categoryLabel}`}
				/>
			</div>
			<CaseManagementTable
				entries={entries}
				facultyList={facultyList}
				category={category}
				categoryLabel={categoryLabel}
			/>
		</div>
	);
}
