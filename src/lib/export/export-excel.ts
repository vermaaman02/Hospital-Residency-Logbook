/**
 * @module export-excel
 * @description Excel workbook generation for Rotation Postings data.
 * Creates a multi-sheet workbook: Rotation Postings, Thesis, Training & Mentoring.
 * Uses `xlsx` for workbook creation and `file-saver` for browser download.
 *
 * @see PG Logbook .md — LOG OF ROTATION POSTINGS, Thesis, Training & Mentoring
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ======================== TYPES ========================

interface RotationRow {
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: string | null;
	endDate: string | null;
	totalDuration: string | null;
	durationDays: number | null;
	status: string;
	facultyRemark: string | null;
}

interface ThesisRow {
	topic: string | null;
	chiefGuide: string | null;
	semesterRecords: {
		semester: number;
		srJrMember: string | null;
		srMember: string | null;
		facultyMember: string | null;
	}[];
}

interface TrainingRow {
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	remarks: string | null;
	status: string;
}

/** Faculty/HOD version — rotation submissions include student info */
interface RotationSubmissionRow extends RotationRow {
	studentName: string;
	batch: string;
	semester: number;
}

/** Faculty/HOD version — thesis includes student info */
interface ThesisSubmissionRow extends ThesisRow {
	studentName: string;
	status: string;
	facultyRemark: string | null;
}

/** Faculty/HOD version — training includes student info */
interface TrainingSubmissionRow extends TrainingRow {
	studentName: string;
	evaluatedBy: string;
}

// ======================== STUDENT EXPORT ========================

export function exportStudentDataToExcel(
	rotations: RotationRow[],
	thesis: ThesisRow | null,
	training: TrainingRow[],
	studentName: string,
) {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Rotation Postings
	const rotationData = rotations.map((r) => ({
		"Sl. No.": r.slNo,
		"Name of Rotation Posting": r.rotationName,
		Elective: r.isElective ? "Yes" : "No",
		"Start Date": r.startDate ?? "",
		"End Date": r.endDate ?? "",
		"Total Duration": r.totalDuration ?? "",
		"Duration (Days)": r.durationDays ?? "",
		Status: r.status,
		"Faculty Remark": r.facultyRemark ?? "",
	}));
	const rotWs = XLSX.utils.json_to_sheet(
		rotationData.length > 0 ?
			rotationData
		:	[{ "Sl. No.": "", "Name of Rotation Posting": "No entries" }],
	);
	setColumnWidths(rotWs, [8, 30, 10, 14, 14, 16, 14, 12, 28]);
	XLSX.utils.book_append_sheet(wb, rotWs, "Rotation Postings");

	// Sheet 2: Thesis
	if (thesis) {
		const thesisHeader = [
			["Thesis Topic", thesis.topic ?? "Not set"],
			["Chief Guide", thesis.chiefGuide ?? "Not set"],
			[],
			["Semester", "Sr/Jr Member", "Sr Member", "Faculty Member"],
		];
		const semRows = (thesis.semesterRecords ?? []).map((s) => [
			`Semester ${s.semester}`,
			s.srJrMember ?? "",
			s.srMember ?? "",
			s.facultyMember ?? "",
		]);
		const thesisWs = XLSX.utils.aoa_to_sheet([...thesisHeader, ...semRows]);
		setColumnWidths(thesisWs, [16, 24, 24, 24]);
		XLSX.utils.book_append_sheet(wb, thesisWs, "Thesis");
	}

	// Sheet 3: Training & Mentoring
	const trainingData = training.map((t) => ({
		Semester: t.semester,
		Knowledge: t.knowledgeScore ?? "",
		"Clinical Skills": t.clinicalSkillScore ?? "",
		"Procedural Skills": t.proceduralSkillScore ?? "",
		"Soft Skills": t.softSkillScore ?? "",
		Research: t.researchScore ?? "",
		"Overall Score": t.overallScore ?? "",
		Remarks: t.remarks ?? "",
		Status: t.status,
	}));
	const trainWs = XLSX.utils.json_to_sheet(
		trainingData.length > 0 ?
			trainingData
		:	[{ Semester: "", Knowledge: "No entries" }],
	);
	setColumnWidths(trainWs, [10, 12, 16, 18, 14, 12, 14, 28, 12]);
	XLSX.utils.book_append_sheet(wb, trainWs, "Training & Mentoring");

	// Generate and download
	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Rotation_Postings_${safeName}_${formatDateForFile()}.xlsx`);
}

// ======================== FACULTY / HOD EXPORT ========================

export function exportReviewDataToExcel(
	rotations: RotationSubmissionRow[],
	theses: ThesisSubmissionRow[],
	training: TrainingSubmissionRow[],
	reviewerRole: "faculty" | "hod",
) {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Rotation Postings Review
	const rotationData = rotations.map((r) => ({
		"Sl. No.": r.slNo,
		"Student Name": r.studentName,
		Batch: r.batch,
		Semester: r.semester,
		"Rotation Name": r.rotationName,
		Elective: r.isElective ? "Yes" : "No",
		"Start Date": r.startDate ?? "",
		"End Date": r.endDate ?? "",
		"Duration (Days)": r.durationDays ?? "",
		Status: r.status,
		"Faculty Remark": r.facultyRemark ?? "",
	}));
	const rotWs = XLSX.utils.json_to_sheet(
		rotationData.length > 0 ?
			rotationData
		:	[{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(rotWs, [8, 22, 16, 10, 28, 10, 14, 14, 14, 12, 28]);
	XLSX.utils.book_append_sheet(wb, rotWs, "Rotation Postings");

	// Sheet 2: Thesis Review
	const thesisData = theses.map((t) => ({
		"Student Name": t.studentName,
		"Thesis Topic": t.topic ?? "Not set",
		"Chief Guide": t.chiefGuide ?? "Not set",
		Status: t.status ?? "",
		"Faculty Remark": t.facultyRemark ?? "",
	}));
	const thesisWs = XLSX.utils.json_to_sheet(
		thesisData.length > 0 ?
			thesisData
		:	[{ "Student Name": "", "Thesis Topic": "No entries" }],
	);
	setColumnWidths(thesisWs, [22, 34, 22, 12, 28]);
	XLSX.utils.book_append_sheet(wb, thesisWs, "Thesis Review");

	// Sheet 3: Training & Mentoring Review
	const trainData = training.map((t) => ({
		"Student Name": t.studentName,
		Semester: t.semester,
		Knowledge: t.knowledgeScore ?? "",
		"Clinical Skills": t.clinicalSkillScore ?? "",
		"Procedural Skills": t.proceduralSkillScore ?? "",
		"Soft Skills": t.softSkillScore ?? "",
		Research: t.researchScore ?? "",
		"Overall Score": t.overallScore ?? "",
		"Evaluated By": t.evaluatedBy,
		Remarks: t.remarks ?? "",
		Status: t.status,
	}));
	const trainWs = XLSX.utils.json_to_sheet(
		trainData.length > 0 ?
			trainData
		:	[{ "Student Name": "", Semester: "No entries" }],
	);
	setColumnWidths(trainWs, [22, 10, 12, 16, 18, 14, 12, 14, 22, 28, 12]);
	XLSX.utils.book_append_sheet(wb, trainWs, "Training & Mentoring");

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Rotation_Review_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== HELPERS ========================

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
	ws["!cols"] = widths.map((w) => ({ wch: w }));
}

function formatDateForFile(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
