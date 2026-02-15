/**
 * @module ImagingCategoryClient
 * @description Client wrapper for Imaging Log category page — inline table + export dropdown.
 * Mirrors ProcedureCategoryClient exactly.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
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
	IMAGING_SKILL_LEVEL_OPTIONS,
	IMAGING_SKILL_LEVEL_LABELS,
} from "@/lib/constants/imaging-log-fields";
import {
	addImagingLogRow,
	deleteImagingLogEntry,
	updateImagingLogEntry,
	submitImagingLogEntry,
} from "@/actions/imaging-logs";

interface ImagingCategoryClientProps {
	entries: PatientLogEntry[];
	facultyList: FacultyOption[];
	imagingCategory: string;
	categoryLabel: string;
	maxEntries: number;
}

export function ImagingCategoryClient({
	entries,
	facultyList,
	imagingCategory,
	categoryLabel,
	maxEntries,
}: ImagingCategoryClientProps) {
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

	const skillOptions = IMAGING_SKILL_LEVEL_OPTIONS.map((o) => ({
		value: o.value,
		label: o.label,
	}));

	return (
		<div className="space-y-4">
			{/* Export dropdown */}
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
				skillLevelLabels={IMAGING_SKILL_LEVEL_LABELS}
				onAddRow={() => addImagingLogRow(imagingCategory)}
				onDeleteEntry={deleteImagingLogEntry}
				onUpdateEntry={updateImagingLogEntry}
				onSubmitEntry={submitImagingLogEntry}
			/>
		</div>
	);
}
