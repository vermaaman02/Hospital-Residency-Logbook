/**
 * @module ConferencesClient
 * @description Client wrapper for Conference and Academic Activity Participation page.
 * Provides export functionality alongside the inline editing table.
 *
 * @see PG Logbook .md — "CONFERENCE AND OTHER ACADEMIC ACTIVITY PARTICIPATION"
 */

"use client";

import {
	ConferencesTable,
	type ConferenceEntry,
	type FacultyOption,
} from "@/components/tables/ConferencesTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addConferenceRow,
	deleteConferenceEntry,
	updateConferenceEntry,
	submitConferenceEntry,
} from "@/actions/conferences";

interface ConferencesClientProps {
	entries: ConferenceEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function ConferencesClient({
	entries,
	facultyList,
	studentName,
}: ConferencesClientProps) {
	// Build export data
	function buildExportData() {
		return entries.map((e) => ({
			slNo: e.slNo,
			date: e.date ?? "",
			conferenceName: e.conferenceName ?? "",
			conductedAt: e.conductedAt ?? "",
			participationRole: e.participationRole ?? "",
			status: e.status,
		}));
	}

	async function handleExportPdf() {
		const { exportProcedureLogToPdf } = await import("@/lib/export/export-pdf");
		const data = buildExportData();
		await exportProcedureLogToPdf(
			data.map((d) => ({
				slNo: d.slNo,
				date: d.date,
				patientName: d.conferenceName,
				patientAge: null,
				patientSex: null,
				uhid: null,
				completeDiagnosis: d.conductedAt,
				procedureDescription: d.participationRole,
				performedAtLocation: "",
				skillLevel: "",
				totalProcedureTally: 0,
				status: d.status,
			})),
			`Conference Participation - ${studentName}`,
			studentName,
		);
	}

	async function handleExportExcel() {
		const { exportProcedureLogToExcel } =
			await import("@/lib/export/export-excel");
		const data = buildExportData();
		exportProcedureLogToExcel(
			data.map((d) => ({
				slNo: d.slNo,
				date: d.date,
				patientName: d.conferenceName,
				patientAge: null,
				patientSex: null,
				uhid: null,
				completeDiagnosis: d.conductedAt,
				procedureDescription: d.participationRole,
				performedAtLocation: "",
				skillLevel: "",
				totalProcedureTally: 0,
				status: d.status,
			})),
			studentName,
			"Conference Participation",
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

			<ConferencesTable
				entries={entries}
				facultyList={facultyList}
				maxEntries={10}
				onAddRow={addConferenceRow}
				onDeleteEntry={deleteConferenceEntry}
				onUpdateEntry={updateConferenceEntry}
				onSubmitEntry={submitConferenceEntry}
			/>
		</div>
	);
}
