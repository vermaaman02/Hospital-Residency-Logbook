/**
 * @module LifeSupportCoursesClient
 * @description Client wrapper for Life-Support Courses page.
 * Provides export functionality alongside the inline editing table.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 */

"use client";

import {
	LifeSupportCoursesTable,
	type CourseEntry,
	type FacultyOption,
} from "@/components/tables/LifeSupportCoursesTable";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	addCourseRow,
	deleteCourseEntry,
	updateCourseEntry,
	submitCourseEntry,
} from "@/actions/life-support-courses";

interface LifeSupportCoursesClientProps {
	entries: CourseEntry[];
	facultyList: FacultyOption[];
	studentName: string;
}

export function LifeSupportCoursesClient({
	entries,
	facultyList,
	studentName,
}: LifeSupportCoursesClientProps) {
	// Build export data
	function buildExportData() {
		return entries.map((e) => ({
			slNo: e.slNo,
			date: e.date ?? "",
			courseName: e.courseName ?? "",
			conductedAt: e.conductedAt ?? "",
			confidenceLevel: e.confidenceLevel ?? "",
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
				patientName: d.courseName,
				patientAge: null,
				patientSex: null,
				uhid: null,
				completeDiagnosis: d.conductedAt,
				procedureDescription: "",
				performedAtLocation: "",
				skillLevel: d.confidenceLevel,
				totalProcedureTally: 0,
				status: d.status,
			})),
			`Life-Support Courses - ${studentName}`,
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
				patientName: d.courseName,
				patientAge: null,
				patientSex: null,
				uhid: null,
				completeDiagnosis: d.conductedAt,
				procedureDescription: "",
				performedAtLocation: "",
				skillLevel: d.confidenceLevel,
				totalProcedureTally: 0,
				status: d.status,
			})),
			studentName,
			"Life-Support Courses",
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

			<LifeSupportCoursesTable
				entries={entries}
				facultyList={facultyList}
				maxEntries={10}
				onAddRow={addCourseRow}
				onDeleteEntry={deleteCourseEntry}
				onUpdateEntry={updateCourseEntry}
				onSubmitEntry={submitCourseEntry}
			/>
		</div>
	);
}
