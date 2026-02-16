/**
 * @module ConsentBadNewsClient
 * @description Client wrapper for Consent + Bad News log page — inline tables + export.
 * Mirrors ProcedureCategoryClient exactly, with two tables stacked.
 *
 * @see PG Logbook .md — "Taking Informed Consent", "Breaking Bad News"
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
	addConsentLogRow,
	deleteConsentLog,
	updateConsentLog,
	submitConsentLog,
	addBadNewsLogRow,
	deleteBadNewsLog,
	updateBadNewsLog,
	submitBadNewsLog,
} from "@/actions/other-logs";

interface ConsentBadNewsClientProps {
	consentEntries: PatientLogEntry[];
	badNewsEntries: PatientLogEntry[];
	facultyList: FacultyOption[];
	consentLabel: string;
	badNewsLabel: string;
	consentMax: number;
	badNewsMax: number;
}

export function ConsentBadNewsClient({
	consentEntries,
	badNewsEntries,
	facultyList,
	consentLabel,
	badNewsLabel,
	consentMax,
	badNewsMax,
}: ConsentBadNewsClientProps) {
	const [exporting, setExporting] = useState(false);

	async function handleExportExcel(entries: PatientLogEntry[], label: string) {
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
				label,
			);
			toast.success("Excel exported");
		} catch {
			toast.error("Export failed");
		} finally {
			setExporting(false);
		}
	}

	async function handleExportPdf(entries: PatientLogEntry[], label: string) {
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
				label,
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
		<div className="space-y-8">
			{/* ── H7: Informed Consent ── */}
			<div className="space-y-4">
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={exporting || consentEntries.length === 0}
							>
								<Download className="mr-2 h-4 w-4" />
								Export Consent
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => handleExportExcel(consentEntries, consentLabel)}
							>
								Export as Excel
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleExportPdf(consentEntries, consentLabel)}
							>
								Export as PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<PatientLogTable
					entries={consentEntries}
					facultyList={facultyList}
					categoryLabel={consentLabel}
					maxEntries={consentMax}
					skillLevelOptions={skillOptions}
					skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
					onAddRow={addConsentLogRow}
					onDeleteEntry={deleteConsentLog}
					onUpdateEntry={updateConsentLog}
					onSubmitEntry={submitConsentLog}
				/>
			</div>

			{/* ── H8: Breaking Bad News ── */}
			<div className="space-y-4">
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={exporting || badNewsEntries.length === 0}
							>
								<Download className="mr-2 h-4 w-4" />
								Export Bad News
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => handleExportExcel(badNewsEntries, badNewsLabel)}
							>
								Export as Excel
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleExportPdf(badNewsEntries, badNewsLabel)}
							>
								Export as PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<PatientLogTable
					entries={badNewsEntries}
					facultyList={facultyList}
					categoryLabel={badNewsLabel}
					maxEntries={badNewsMax}
					skillLevelOptions={skillOptions}
					skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
					onAddRow={addBadNewsLogRow}
					onDeleteEntry={deleteBadNewsLog}
					onUpdateEntry={updateBadNewsLog}
					onSubmitEntry={submitBadNewsLog}
				/>
			</div>
		</div>
	);
}
