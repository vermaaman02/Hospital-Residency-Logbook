/**
 * @module DisasterDrillsClient
 * @description Client wrapper for Disaster Drills page.
 * Provides export functionality alongside the inline editing table.
 *
 * @see PG Logbook .md — "MAJOR INCIDENT PLANNING/ DISASTER MANAGEMENT DRILL/ MASS CASUALTY MANAGEMENT/PREHOSPITAL EM"
 */

"use client";

import {
	DisasterDrillsTable,
	type DisasterDrillEntry,
	type FacultyOption,
} from "@/components/tables/DisasterDrillsTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addDisasterDrillRow,
	deleteDisasterDrillEntry,
	updateDisasterDrillEntry,
	submitDisasterDrillEntry,
} from "@/actions/disaster-drills";

interface DisasterDrillsClientProps {
	entries: DisasterDrillEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function DisasterDrillsClient({
	entries,
	facultyList,
	studentName,
}: DisasterDrillsClientProps) {
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
			`Disaster Drills - ${studentName}`,
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
			"Disaster Drills",
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

			<DisasterDrillsTable
				entries={entries}
				facultyList={facultyList}
				onAddRow={addDisasterDrillRow}
				onDeleteEntry={deleteDisasterDrillEntry}
				onUpdateEntry={updateDisasterDrillEntry}
				onSubmitEntry={submitDisasterDrillEntry}
			/>
		</div>
	);
}
