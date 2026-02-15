/**
 * @module ResearchActivitiesClient
 * @description Client wrapper for Research/Team Building/Teaching & Training/
 * Community Outreach Activity page. Provides export functionality alongside
 * the inline editing table.
 *
 * @see PG Logbook .md — "OTHER RESEARCH/ TEAM BUILDING/TEACHING & TRAINING/ COMMUNITY OUTREACH ACTIVITY"
 */

"use client";

import {
	ResearchActivitiesTable,
	type ResearchEntry,
	type FacultyOption,
} from "@/components/tables/ResearchActivitiesTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addResearchRow,
	deleteResearchEntry,
	updateResearchEntry,
	submitResearchEntry,
} from "@/actions/research-activities";

interface ResearchActivitiesClientProps {
	entries: ResearchEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function ResearchActivitiesClient({
	entries,
	facultyList,
	studentName,
}: ResearchActivitiesClientProps) {
	// Build export data
	function buildExportData() {
		return entries.map((e) => ({
			slNo: e.slNo,
			date: e.date ?? "",
			activity: e.activity ?? "",
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
				patientName: d.activity,
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
			`Research Activities - ${studentName}`,
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
				patientName: d.activity,
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
			"Research Activities",
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

			<ResearchActivitiesTable
				entries={entries}
				facultyList={facultyList}
				maxEntries={10}
				onAddRow={addResearchRow}
				onDeleteEntry={deleteResearchEntry}
				onUpdateEntry={updateResearchEntry}
				onSubmitEntry={submitResearchEntry}
			/>
		</div>
	);
}
