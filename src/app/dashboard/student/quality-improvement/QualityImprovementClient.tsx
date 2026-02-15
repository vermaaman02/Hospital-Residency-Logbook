/**
 * @module QualityImprovementClient
 * @description Client wrapper for Quality Improvement page.
 * Provides export functionality alongside the inline editing table.
 *
 * @see PG Logbook .md — "QUALITY IMPROVEMENT/PATIENT SAFETY INITIATIVE/CLINICAL AUDIT"
 */

"use client";

import {
	QualityImprovementTable,
	type QualityImprovementEntry,
	type FacultyOption,
} from "@/components/tables/QualityImprovementTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addQualityImprovementRow,
	deleteQualityImprovementEntry,
	updateQualityImprovementEntry,
	submitQualityImprovementEntry,
} from "@/actions/quality-improvement";

interface QualityImprovementClientProps {
	entries: QualityImprovementEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function QualityImprovementClient({
	entries,
	facultyList,
	studentName,
}: QualityImprovementClientProps) {
	// Build export data
	function buildExportData() {
		return entries.map((e) => ({
			slNo: e.slNo,
			date: e.date ?? "",
			description: e.description ?? "",
			roleInActivity: e.roleInActivity ?? "",
			status: e.status,
		}));
	}

	async function handleExportPdf() {
		const { exportSimpleLogToPdf } = await import("@/lib/export/export-pdf");
		const data = buildExportData();
		await exportSimpleLogToPdf(
			data,
			["Sl. No.", "Date", "Description", "Role", "Status"],
			data.map((d) => [
				d.slNo.toString(),
				d.date,
				d.description,
				d.roleInActivity,
				d.status,
			]),
			`Quality Improvement - ${studentName}`,
			studentName,
		);
	}

	async function handleExportExcel() {
		const { exportSimpleLogToExcel } =
			await import("@/lib/export/export-excel");
		const data = buildExportData();
		exportSimpleLogToExcel(
			data.map((d) => ({
				"Sl. No.": d.slNo,
				Date: d.date,
				"Description of Work Done": d.description,
				"Role in Activity": d.roleInActivity,
				Status: d.status,
			})),
			studentName,
			"Quality Improvement",
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<ExportDropdown
					onExportPdf={handleExportPdf}
					onExportExcel={handleExportExcel}
				/>
			</div>

			<QualityImprovementTable
				entries={entries}
				facultyList={facultyList}
				onAddRow={addQualityImprovementRow}
				onDeleteEntry={deleteQualityImprovementEntry}
				onUpdateEntry={updateQualityImprovementEntry}
				onSubmitEntry={submitQualityImprovementEntry}
			/>
		</div>
	);
}
