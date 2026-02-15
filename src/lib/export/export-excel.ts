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

// ======================== UTILITIES ========================

/** Strip markdown syntax for clean Excel cell values. */
function stripMd(text: string | null | undefined): string {
	if (!text) return "";
	return text
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/^[\s]*[-*+]\s+/gm, "• ")
		.replace(/^(\d+)\.\s+/gm, "$1. ")
		.replace(/^---+$/gm, "")
		.replace(/^>\s?/gm, "")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

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

// ======================== CASE PRESENTATION TYPES ========================

export interface CasePresentationExportRow {
	slNo: number;
	date: string | null;
	patientName: string | null;
	patientAge: string | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	category: string | null;
	facultyRemark: string | null;
	status: string;
}

export interface CasePresentationReviewRow extends CasePresentationExportRow {
	studentName: string;
	batch: string;
	semester: number;
}

// ======================== CASE PRESENTATION — STUDENT EXPORT ========================

export function exportCasePresentationsToExcel(
	entries: CasePresentationExportRow[],
	studentName: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		"Complete Diagnosis": stripMd(e.completeDiagnosis),
		Category: e.category ?? "",
		"Faculty Remark": stripMd(e.facultyRemark),
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", Date: "No entries" }],
	);
	setColumnWidths(ws, [8, 14, 22, 8, 10, 16, 36, 22, 28, 12]);
	XLSX.utils.book_append_sheet(wb, ws, "Case Presentations");

	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Case_Presentations_${safeName}_${formatDateForFile()}.xlsx`);
}

// ======================== CASE PRESENTATION — FACULTY/HOD EXPORT ========================

export function exportCasePresentationReviewToExcel(
	entries: CasePresentationReviewRow[],
	reviewerRole: "faculty" | "hod",
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Student Name": e.studentName,
		Batch: e.batch,
		Semester: e.semester,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		"Complete Diagnosis": stripMd(e.completeDiagnosis),
		Category: e.category ?? "",
		"Faculty Remark": stripMd(e.facultyRemark),
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(ws, [8, 22, 16, 10, 14, 22, 8, 10, 16, 36, 22, 28, 12]);
	XLSX.utils.book_append_sheet(wb, ws, "Case Presentations Review");

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Case_Presentations_Review_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== JOURNAL CLUB TYPES ========================

export interface JournalClubExportRow {
	slNo: number;
	date: string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	status: string;
}

export interface JournalClubReviewRow extends JournalClubExportRow {
	studentName: string;
	batch: string;
	semester: number;
}

// ======================== JOURNAL CLUB — STUDENT EXPORT ========================

export function exportJournalClubsToExcel(
	entries: JournalClubExportRow[],
	studentName: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		Date: e.date ?? "",
		"Journal Article": stripMd(e.journalArticle),
		"Type of Study": stripMd(e.typeOfStudy),
		"Faculty Remark": stripMd(e.facultyRemark),
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", Date: "No entries" }],
	);
	setColumnWidths(ws, [8, 14, 40, 30, 28, 12]);
	XLSX.utils.book_append_sheet(wb, ws, "Journal Clubs");

	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Journal_Clubs_${safeName}_${formatDateForFile()}.xlsx`);
}

// ======================== JOURNAL CLUB — FACULTY/HOD EXPORT ========================

export function exportJournalClubReviewToExcel(
	entries: JournalClubReviewRow[],
	reviewerRole: "faculty" | "hod",
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Student Name": e.studentName,
		Batch: e.batch,
		Semester: e.semester,
		Date: e.date ?? "",
		"Journal Article": stripMd(e.journalArticle),
		"Type of Study": stripMd(e.typeOfStudy),
		"Faculty Remark": stripMd(e.facultyRemark),
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(ws, [8, 22, 16, 10, 14, 40, 30, 28, 12]);
	XLSX.utils.book_append_sheet(wb, ws, "Journal Clubs Review");

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Journal_Clubs_Review_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== CLINICAL SKILLS — STUDENT EXPORT ========================

interface ClinicalSkillExportRow {
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
}

export function exportClinicalSkillsToExcel(
	entries: ClinicalSkillExportRow[],
	studentName: string,
	label: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Clinical Skill": e.skillName,
		"Representative Diagnosis": e.representativeDiagnosis ?? "",
		"Level of Confidence": e.confidenceLevel ?? "",
		"Total Times Performed": e.totalTimesPerformed,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ?
			data
		:	[{ "Sl. No.": "", "Clinical Skill": "No entries" }],
	);
	setColumnWidths(ws, [8, 30, 40, 20, 18, 12]);
	XLSX.utils.book_append_sheet(wb, ws, `${label} Skills`);

	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(
		blob,
		`Clinical_Skills_${label}_${safeName}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== CLINICAL SKILLS — FACULTY/HOD REVIEW EXPORT ========================

interface ClinicalSkillReviewRow {
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	studentName: string;
	batch: string;
	semester: number;
}

export function exportClinicalSkillReviewToExcel(
	entries: ClinicalSkillReviewRow[],
	reviewerRole: "faculty" | "hod",
	label: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Student Name": e.studentName,
		Batch: e.batch,
		Semester: e.semester,
		"Clinical Skill": e.skillName,
		"Representative Diagnosis": e.representativeDiagnosis ?? "",
		"Level of Confidence": e.confidenceLevel ?? "",
		"Total Times Performed": e.totalTimesPerformed,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(ws, [8, 22, 16, 10, 30, 40, 20, 18, 12]);
	XLSX.utils.book_append_sheet(wb, ws, `${label} Skills Review`);

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Clinical_Skills_Review_${label}_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== CASE MANAGEMENT — STUDENT EXPORT ========================

interface CaseManagementExportRow {
	slNo: number;
	caseSubCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	status: string;
}

export function exportCaseManagementToExcel(
	entries: CaseManagementExportRow[],
	studentName: string,
	categoryLabel: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Case Type": e.caseSubCategory,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		Diagnosis: e.completeDiagnosis ?? "",
		Competency: e.competencyLevel ?? "",
		Tally: e.totalCaseTally,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Case Type": "No entries" }],
	);
	setColumnWidths(ws, [8, 30, 12, 20, 6, 8, 14, 35, 12, 8, 12]);
	XLSX.utils.book_append_sheet(wb, ws, categoryLabel.slice(0, 31));

	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	const safeCategory = categoryLabel.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(
		blob,
		`Case_Management_${safeCategory}_${safeName}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== CASE MANAGEMENT — FACULTY/HOD REVIEW EXPORT ========================

interface CaseManagementReviewRow {
	slNo: number;
	caseSubCategory: string;
	categoryLabel: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	status: string;
	studentName: string;
	batch: string;
	semester: number;
}

export function exportCaseManagementReviewToExcel(
	entries: CaseManagementReviewRow[],
	reviewerRole: "faculty" | "hod",
	label: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Student Name": e.studentName,
		Batch: e.batch,
		Semester: e.semester,
		Category: e.categoryLabel,
		"Case Type": e.caseSubCategory,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		Diagnosis: e.completeDiagnosis ?? "",
		Competency: e.competencyLevel ?? "",
		Tally: e.totalCaseTally,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(ws, [8, 22, 16, 10, 18, 28, 12, 18, 6, 8, 14, 30, 12, 8, 12]);
	XLSX.utils.book_append_sheet(wb, ws, `${label} Review`);

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Case_Management_Review_${label}_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== PROCEDURE LOGS — STUDENT EXPORT ========================

interface ProcedureLogExportRow {
	slNo: number;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	totalProcedureTally: number;
	status: string;
}

export function exportProcedureLogToExcel(
	entries: ProcedureLogExportRow[],
	studentName: string,
	categoryLabel: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		Diagnosis: e.completeDiagnosis ?? "",
		Procedure: e.procedureDescription ?? "",
		Location: e.performedAtLocation ?? "",
		"Skill Level": e.skillLevel ?? "",
		Tally: e.totalProcedureTally,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", Date: "No entries" }],
	);
	setColumnWidths(ws, [8, 12, 20, 6, 8, 14, 30, 30, 16, 12, 8, 12]);
	XLSX.utils.book_append_sheet(wb, ws, categoryLabel.slice(0, 31));

	const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	const blob = new Blob([wbOut], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	const safeCategory = categoryLabel.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(
		blob,
		`Procedure_Log_${safeCategory}_${safeName}_${formatDateForFile()}.xlsx`,
	);
}

// ======================== PROCEDURE LOGS — FACULTY/HOD REVIEW EXPORT ========================

interface ProcedureLogReviewRow {
	slNo: number;
	categoryLabel: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	totalProcedureTally: number;
	status: string;
	studentName: string;
	batch: string;
	semester: number;
}

export function exportProcedureLogReviewToExcel(
	entries: ProcedureLogReviewRow[],
	reviewerRole: "faculty" | "hod",
	label: string,
) {
	const wb = XLSX.utils.book_new();

	const data = entries.map((e) => ({
		"Sl. No.": e.slNo,
		"Student Name": e.studentName,
		Batch: e.batch,
		Semester: e.semester,
		Category: e.categoryLabel,
		Date: e.date ?? "",
		"Patient Name": e.patientName ?? "",
		Age: e.patientAge ?? "",
		Sex: e.patientSex ?? "",
		UHID: e.uhid ?? "",
		Diagnosis: e.completeDiagnosis ?? "",
		Procedure: e.procedureDescription ?? "",
		Location: e.performedAtLocation ?? "",
		"Skill Level": e.skillLevel ?? "",
		Tally: e.totalProcedureTally,
		Status: e.status,
	}));

	const ws = XLSX.utils.json_to_sheet(
		data.length > 0 ? data : [{ "Sl. No.": "", "Student Name": "No entries" }],
	);
	setColumnWidths(
		ws,
		[8, 22, 16, 10, 20, 12, 18, 6, 8, 14, 28, 28, 14, 12, 8, 12],
	);
	XLSX.utils.book_append_sheet(wb, ws, `${label} Review`);

	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Procedure_Log_Review_${label}_${roleLabel}_${formatDateForFile()}.xlsx`,
	);
}
