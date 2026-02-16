/**
 * @module ProcedureCategoryClient
 * @description Client wrapper for Procedure Log category page — table + export dropdown.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

"use client";

import { useState } from "react";
import {
	ProcedureLogTable,
	type ProcedureLogEntry,
	type FacultyOption,
} from "./ProcedureLogTable";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ProcedureCategoryClientProps {
	entries: ProcedureLogEntry[];
	facultyList: FacultyOption[];
	procedureCategory: string;
	categoryLabel: string;
	maxEntries: number;
	isCpr: boolean;
}

export function ProcedureCategoryClient({
	entries,
	facultyList,
	procedureCategory,
	categoryLabel,
	maxEntries,
	isCpr,
}: ProcedureCategoryClientProps) {
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

			<ProcedureLogTable
				entries={entries}
				facultyList={facultyList}
				procedureCategory={procedureCategory}
				categoryLabel={categoryLabel}
				maxEntries={maxEntries}
				isCpr={isCpr}
			/>
		</div>
	);
}
