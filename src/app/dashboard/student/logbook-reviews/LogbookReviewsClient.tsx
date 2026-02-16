/**
 * @module LogbookReviewsClient
 * @description Client wrapper for Logbook Faculty Reviews page.
 * Provides export functionality alongside the inline editing table.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION: PERIODIC LOG BOOK FACULTY REVIEW"
 */

"use client";

import {
	LogbookReviewsTable,
	type LogbookReviewEntry,
	type FacultyOption,
} from "@/components/tables/LogbookReviewsTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addLogbookReviewRow,
	deleteLogbookReviewEntry,
	updateLogbookReviewEntry,
	submitLogbookReviewEntry,
} from "@/actions/logbook-reviews";

interface LogbookReviewsClientProps {
	entries: LogbookReviewEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function LogbookReviewsClient({
	entries,
	facultyList,
	studentName,
}: LogbookReviewsClientProps) {
	// Build export data
	function buildExportData() {
		return entries.map((e) => ({
			slNo: e.slNo,
			reviewNo: e.reviewNo ?? "",
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
			["Sl. No.", "Review No.", "Date", "Description", "Role", "Status"],
			data.map((d) => [
				d.slNo.toString(),
				d.reviewNo,
				d.date,
				d.description,
				d.roleInActivity,
				d.status,
			]),
			`Logbook Faculty Reviews - ${studentName}`,
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
				"Review No.": d.reviewNo,
				Date: d.date,
				"Description of Work Done": d.description,
				"Role in Activity": d.roleInActivity,
				Status: d.status,
			})),
			studentName,
			"Logbook Faculty Reviews",
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

			<LogbookReviewsTable
				entries={entries}
				facultyList={facultyList}
				onAddRow={addLogbookReviewRow}
				onDeleteEntry={deleteLogbookReviewEntry}
				onUpdateEntry={updateLogbookReviewEntry}
				onSubmitEntry={submitLogbookReviewEntry}
			/>
		</div>
	);
}
