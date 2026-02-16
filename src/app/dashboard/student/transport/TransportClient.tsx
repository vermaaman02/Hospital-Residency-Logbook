/**
 * @module TransportClient
 * @description Client wrapper for Transport log page — inline table + export dropdown.
 * Mirrors ProcedureCategoryClient exactly.
 *
 * @see PG Logbook .md — "Transport of Critically Ill Patient"
 */

"use client";

import { useState } from "react";
import {
	PatientLogTable,
	type PatientLogEntry,
	type FacultyOption,
} from "@/components/tables/PatientLogTable";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
	SKILL_LEVEL_OPTIONS_SOAPI,
	SKILL_LEVEL_LABELS_SOAPI,
} from "@/lib/constants/other-logs-fields";
import {
	addTransportLogRow,
	deleteTransportLog,
	updateTransportLog,
	submitTransportLog,
} from "@/actions/other-logs";

interface TransportClientProps {
	entries: PatientLogEntry[];
	facultyList: FacultyOption[];
	categoryLabel: string;
	maxEntries: number;
}

export function TransportClient({
	entries,
	facultyList,
	categoryLabel,
	maxEntries,
}: TransportClientProps) {
	const [exporting, setExporting] = useState(false);

	async function handleExportExcel() {
		setExporting(true);
		try {
			const { exportProcedureLogToExcel } =
				await import("@/lib/export/export-excel");
			exportProcedureLogToExcel(
				entries.map((e) => ({
					slNo: e.slNo,
					date: e.date,
					patientName: e.patientName,
					patientAge: e.patientAge,
					patientSex: e.patientSex,
					uhid: e.uhid,
					completeDiagnosis: e.completeDiagnosis,
					procedureDescription: e.procedureDescription,
					performedAtLocation: e.performedAtLocation,
					skillLevel: e.skillLevel,
					totalProcedureTally: e.totalProcedureTally,
					status: e.status,
				})),
				"Student",
				categoryLabel,
			);
			toast.success("Excel exported");
		} catch {
			toast.error("Export failed");
		} finally {
			setExporting(false);
		}
	}

	async function handleExportPdf() {
		setExporting(true);
		try {
			const { exportProcedureLogToPdf } =
				await import("@/lib/export/export-pdf");
			await exportProcedureLogToPdf(
				entries.map((e) => ({
					slNo: e.slNo,
					date: e.date,
					patientName: e.patientName,
					patientAge: e.patientAge,
					patientSex: e.patientSex,
					uhid: e.uhid,
					completeDiagnosis: e.completeDiagnosis,
					procedureDescription: e.procedureDescription,
					performedAtLocation: e.performedAtLocation,
					skillLevel: e.skillLevel,
					totalProcedureTally: e.totalProcedureTally,
					status: e.status,
				})),
				"Student",
				categoryLabel,
			);
			toast.success("PDF exported");
		} catch {
			toast.error("Export failed");
		} finally {
			setExporting(false);
		}
	}

	const skillOptions = SKILL_LEVEL_OPTIONS_SOAPI.map((o) => ({
		value: o.value,
		label: o.label,
	}));

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={exporting || entries.length === 0}
						>
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={handleExportExcel}>
							Export as Excel
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleExportPdf}>
							Export as PDF
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<PatientLogTable
				entries={entries}
				facultyList={facultyList}
				categoryLabel={categoryLabel}
				maxEntries={maxEntries}
				skillLevelOptions={skillOptions}
				skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
				onAddRow={addTransportLogRow}
				onDeleteEntry={deleteTransportLog}
				onUpdateEntry={updateTransportLog}
				onSubmitEntry={submitTransportLog}
			/>
		</div>
	);
}
