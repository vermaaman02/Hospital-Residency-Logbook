/**
 * @module export-pdf
 * @description PDF document generation for Rotation Postings data.
 * Creates a multi-section PDF: Rotation Postings table, Thesis details,
 * Training & Mentoring scores. Uses @react-pdf/renderer for document creation
 * and file-saver for browser download.
 *
 * @see PG Logbook .md â€” LOG OF ROTATION POSTINGS, Thesis, Training & Mentoring
 */

"use client";

import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";

// ======================== UTILITIES ========================

/**
 * Strip markdown syntax into clean plain text for PDF rendering.
 * Converts bold, italic, headings, lists, etc. to readable text.
 */
function stripMarkdown(text: string | null | undefined): string {
	if (!text) return "â€”";
	return (
		text
			// Remove headings markers
			.replace(/^#{1,6}\s+/gm, "")
			// Bold
			.replace(/\*\*(.+?)\*\*/g, "$1")
			// Italic
			.replace(/\*(.+?)\*/g, "$1")
			// Unordered list
			.replace(/^[\s]*[-*+]\s+/gm, "â€¢ ")
			// Ordered list (keep numbers)
			.replace(/^(\d+)\.\s+/gm, "$1. ")
			// Horizontal rules
			.replace(/^---+$/gm, "")
			// Blockquotes
			.replace(/^>\s?/gm, "")
			// Inline code
			.replace(/`([^`]+)`/g, "$1")
			// Links [text](url) â†’ text
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
			// Clean up multiple blank lines
			.replace(/\n{3,}/g, "\n\n")
			.trim()
	);
}

// ======================== STYLES ========================

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontSize: 9,
		fontFamily: "Helvetica",
	},
	header: {
		textAlign: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 10,
		color: "#555",
		marginBottom: 2,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: "#ccc",
		marginVertical: 10,
	},
	sectionTitle: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		marginBottom: 8,
		color: "#0066CC",
		paddingBottom: 4,
		borderBottomWidth: 1,
		borderBottomColor: "#0066CC",
	},
	table: {
		width: "100%",
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 0.5,
		borderBottomColor: "#ddd",
		minHeight: 20,
		alignItems: "center",
	},
	tableRowAlt: {
		backgroundColor: "#f9fafb",
	},
	tableHeader: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#333",
		backgroundColor: "#f0f4f8",
		minHeight: 22,
		alignItems: "center",
	},
	tableCell: {
		paddingHorizontal: 4,
		paddingVertical: 3,
		fontSize: 8,
	},
	tableCellBold: {
		paddingHorizontal: 4,
		paddingVertical: 3,
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
	},
	infoRow: {
		flexDirection: "row",
		marginBottom: 4,
	},
	infoLabel: {
		fontFamily: "Helvetica-Bold",
		fontSize: 9,
		width: 100,
	},
	infoValue: {
		fontSize: 9,
	},
	badge: {
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 3,
		fontSize: 7,
	},
	badgeSigned: {
		backgroundColor: "#d1fae5",
		color: "#065f46",
	},
	badgeSubmitted: {
		backgroundColor: "#fef3c7",
		color: "#92400e",
	},
	badgeDraft: {
		backgroundColor: "#f3f4f6",
		color: "#374151",
	},
	badgeRejected: {
		backgroundColor: "#fee2e2",
		color: "#991b1b",
	},
	emptyText: {
		fontSize: 9,
		color: "#999",
		fontStyle: "italic",
		textAlign: "center",
		padding: 16,
	},
	footer: {
		position: "absolute",
		bottom: 20,
		left: 30,
		right: 30,
		textAlign: "center",
		fontSize: 7,
		color: "#999",
		borderTopWidth: 0.5,
		borderTopColor: "#ddd",
		paddingTop: 6,
	},
});

// ======================== TYPES ========================

interface RotationEntry {
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

interface ThesisEntry {
	topic: string | null;
	chiefGuide: string | null;
	semesterRecords: {
		semester: number;
		srJrMember: string | null;
		srMember: string | null;
		facultyMember: string | null;
	}[];
}

interface TrainingEntry {
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

interface StudentPdfData {
	studentName: string;
	rotations: RotationEntry[];
	thesis: ThesisEntry | null;
	training: TrainingEntry[];
}

interface ReviewRotationEntry extends RotationEntry {
	studentName: string;
	batch: string;
	semester: number;
}

interface ReviewThesisEntry extends ThesisEntry {
	studentName: string;
	status: string;
	facultyRemark: string | null;
}

interface ReviewTrainingEntry extends TrainingEntry {
	studentName: string;
	evaluatedBy: string;
}

interface ReviewPdfData {
	reviewerRole: "faculty" | "hod";
	rotations: ReviewRotationEntry[];
	theses: ReviewThesisEntry[];
	training: ReviewTrainingEntry[];
}

// ======================== HELPER COMPONENTS ========================

function StatusBadge({ status }: { status: string }) {
	const s = status.toUpperCase();
	const badgeStyle =
		s === "SIGNED" ? styles.badgeSigned
		: s === "SUBMITTED" ? styles.badgeSubmitted
		: s === "REJECTED" || s === "NEEDS_REVISION" ? styles.badgeRejected
		: styles.badgeDraft;
	return <Text style={[styles.badge, badgeStyle]}>{status}</Text>;
}

function formatDate(d: string | null): string {
	if (!d) return "â€”";
	try {
		return new Date(d).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	} catch {
		return d;
	}
}

// ======================== STUDENT PDF DOCUMENT ========================

function StudentPdfDocument({ data }: { data: StudentPdfData }) {
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>
						PG Residency Logbook â€” Rotation Postings Report
					</Text>
					<Text style={styles.subtitle}>Student: {data.studentName}</Text>
					<Text style={styles.subtitle}>
						Generated: {new Date().toLocaleDateString("en-IN")}
					</Text>
				</View>

				{/* Section 1: Rotation Postings */}
				<Text style={styles.sectionTitle}>Rotation Postings</Text>
				{data.rotations.length === 0 ?
					<Text style={styles.emptyText}>No rotation postings recorded.</Text>
				:	<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableCellBold, { width: "6%" }]}>Sl.</Text>
							<Text style={[styles.tableCellBold, { width: "24%" }]}>
								Rotation
							</Text>
							<Text style={[styles.tableCellBold, { width: "8%" }]}>Elec.</Text>
							<Text style={[styles.tableCellBold, { width: "14%" }]}>
								Start
							</Text>
							<Text style={[styles.tableCellBold, { width: "14%" }]}>End</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>Days</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>
								Status
							</Text>
							<Text style={[styles.tableCellBold, { width: "14%" }]}>
								Remark
							</Text>
						</View>
						{data.rotations.map((r, i) => (
							<View key={i} style={styles.tableRow}>
								<Text style={[styles.tableCell, { width: "6%" }]}>
									{r.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "24%" }]}>
									{r.rotationName}
								</Text>
								<Text style={[styles.tableCell, { width: "8%" }]}>
									{r.isElective ? "Yes" : "No"}
								</Text>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{formatDate(r.startDate)}
								</Text>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{formatDate(r.endDate)}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{r.durationDays ?? "â€”"}
								</Text>
								<View style={[styles.tableCell, { width: "10%" }]}>
									<StatusBadge status={r.status} />
								</View>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{r.facultyRemark ?? "â€”"}
								</Text>
							</View>
						))}
					</View>
				}

				<View style={styles.divider} />

				{/* Section 2: Thesis */}
				<Text style={styles.sectionTitle}>Thesis Topic</Text>
				{!data.thesis?.topic ?
					<Text style={styles.emptyText}>No thesis topic recorded.</Text>
				:	<View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Topic:</Text>
							<Text style={styles.infoValue}>
								{data.thesis.topic ?? "Not set"}
							</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Chief Guide:</Text>
							<Text style={styles.infoValue}>
								{data.thesis.chiefGuide ?? "Not set"}
							</Text>
						</View>
						{(data.thesis.semesterRecords ?? []).length > 0 && (
							<View style={[styles.table, { marginTop: 8 }]}>
								<View style={styles.tableHeader}>
									<Text style={[styles.tableCellBold, { width: "20%" }]}>
										Semester
									</Text>
									<Text style={[styles.tableCellBold, { width: "26%" }]}>
										Sr/Jr Member
									</Text>
									<Text style={[styles.tableCellBold, { width: "26%" }]}>
										Sr Member
									</Text>
									<Text style={[styles.tableCellBold, { width: "28%" }]}>
										Faculty Member
									</Text>
								</View>
								{data.thesis.semesterRecords.map((s, i) => (
									<View key={i} style={styles.tableRow}>
										<Text style={[styles.tableCell, { width: "20%" }]}>
											Semester {s.semester}
										</Text>
										<Text style={[styles.tableCell, { width: "26%" }]}>
											{s.srJrMember ?? "â€”"}
										</Text>
										<Text style={[styles.tableCell, { width: "26%" }]}>
											{s.srMember ?? "â€”"}
										</Text>
										<Text style={[styles.tableCell, { width: "28%" }]}>
											{s.facultyMember ?? "â€”"}
										</Text>
									</View>
								))}
							</View>
						)}
					</View>
				}

				<View style={styles.divider} />

				{/* Section 3: Training & Mentoring */}
				<Text style={styles.sectionTitle}>Training & Mentoring Record</Text>
				{data.training.length === 0 ?
					<Text style={styles.emptyText}>
						No training evaluations recorded.
					</Text>
				:	<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>Sem</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>Know</Text>
							<Text style={[styles.tableCellBold, { width: "13%" }]}>
								Clinical
							</Text>
							<Text style={[styles.tableCellBold, { width: "13%" }]}>
								Procedural
							</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>Soft</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>
								Research
							</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>
								Overall
							</Text>
							<Text style={[styles.tableCellBold, { width: "16%" }]}>
								Status
							</Text>
						</View>
						{data.training.map((t, i) => (
							<View key={i} style={styles.tableRow}>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.semester}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.knowledgeScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{t.clinicalSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{t.proceduralSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.softSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.researchScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.overallScore ?? "â€”"}
								</Text>
								<View style={[styles.tableCell, { width: "16%" }]}>
									<StatusBadge status={t.status} />
								</View>
							</View>
						))}
					</View>
				}

				{/* Footer */}
				<Text style={styles.footer}>
					AIIMS Patna â€” Department of Emergency Medicine â€” PG Residency
					Digital Logbook
				</Text>
			</Page>
		</Document>
	);
}

// ======================== REVIEW (FACULTY/HOD) PDF DOCUMENT ========================

function ReviewPdfDocument({ data }: { data: ReviewPdfData }) {
	const roleLabel = data.reviewerRole === "hod" ? "HOD" : "Faculty";

	return (
		<Document>
			{/* Page 1: Rotation Postings Review */}
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>
						Rotation Postings Review â€” {roleLabel} Report
					</Text>
					<Text style={styles.subtitle}>
						Generated: {new Date().toLocaleDateString("en-IN")}
					</Text>
				</View>

				<Text style={styles.sectionTitle}>Rotation Postings</Text>
				{data.rotations.length === 0 ?
					<Text style={styles.emptyText}>No rotation submissions.</Text>
				:	<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableCellBold, { width: "5%" }]}>Sl.</Text>
							<Text style={[styles.tableCellBold, { width: "16%" }]}>
								Student
							</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>
								Batch
							</Text>
							<Text style={[styles.tableCellBold, { width: "18%" }]}>
								Rotation
							</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>
								Start
							</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>End</Text>
							<Text style={[styles.tableCellBold, { width: "7%" }]}>Days</Text>
							<Text style={[styles.tableCellBold, { width: "8%" }]}>
								Status
							</Text>
							<Text style={[styles.tableCellBold, { width: "16%" }]}>
								Remark
							</Text>
						</View>
						{data.rotations.map((r, i) => (
							<View key={i} style={styles.tableRow}>
								<Text style={[styles.tableCell, { width: "5%" }]}>
									{r.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "16%" }]}>
									{r.studentName}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{r.batch}
								</Text>
								<Text style={[styles.tableCell, { width: "18%" }]}>
									{r.rotationName}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{formatDate(r.startDate)}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{formatDate(r.endDate)}
								</Text>
								<Text style={[styles.tableCell, { width: "7%" }]}>
									{r.durationDays ?? "â€”"}
								</Text>
								<View style={[styles.tableCell, { width: "8%" }]}>
									<StatusBadge status={r.status} />
								</View>
								<Text style={[styles.tableCell, { width: "16%" }]}>
									{r.facultyRemark ?? "â€”"}
								</Text>
							</View>
						))}
					</View>
				}

				<Text style={styles.footer}>
					AIIMS Patna â€” Department of Emergency Medicine â€” PG Residency
					Digital Logbook
				</Text>
			</Page>

			{/* Page 2: Thesis Review */}
			<Page size="A4" style={styles.page}>
				<Text style={styles.sectionTitle}>Thesis Review</Text>
				{data.theses.length === 0 ?
					<Text style={styles.emptyText}>No thesis submissions.</Text>
				:	<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableCellBold, { width: "20%" }]}>
								Student
							</Text>
							<Text style={[styles.tableCellBold, { width: "30%" }]}>
								Topic
							</Text>
							<Text style={[styles.tableCellBold, { width: "18%" }]}>
								Chief Guide
							</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>
								Status
							</Text>
							<Text style={[styles.tableCellBold, { width: "20%" }]}>
								Remark
							</Text>
						</View>
						{data.theses.map((t, i) => (
							<View key={i} style={styles.tableRow}>
								<Text style={[styles.tableCell, { width: "20%" }]}>
									{t.studentName}
								</Text>
								<Text style={[styles.tableCell, { width: "30%" }]}>
									{t.topic ?? "Not set"}
								</Text>
								<Text style={[styles.tableCell, { width: "18%" }]}>
									{t.chiefGuide ?? "Not set"}
								</Text>
								<View style={[styles.tableCell, { width: "12%" }]}>
									<StatusBadge status={t.status} />
								</View>
								<Text style={[styles.tableCell, { width: "20%" }]}>
									{t.facultyRemark ?? "â€”"}
								</Text>
							</View>
						))}
					</View>
				}

				<Text style={styles.footer}>
					AIIMS Patna â€” Department of Emergency Medicine â€” PG Residency
					Digital Logbook
				</Text>
			</Page>

			{/* Page 3: Training & Mentoring Review */}
			<Page size="A4" orientation="landscape" style={styles.page}>
				<Text style={styles.sectionTitle}>Training & Mentoring Review</Text>
				{data.training.length === 0 ?
					<Text style={styles.emptyText}>No training evaluations.</Text>
				:	<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableCellBold, { width: "14%" }]}>
								Student
							</Text>
							<Text style={[styles.tableCellBold, { width: "7%" }]}>Sem</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>Know</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>
								Clinical
							</Text>
							<Text style={[styles.tableCellBold, { width: "11%" }]}>
								Procedural
							</Text>
							<Text style={[styles.tableCellBold, { width: "9%" }]}>Soft</Text>
							<Text style={[styles.tableCellBold, { width: "10%" }]}>
								Research
							</Text>
							<Text style={[styles.tableCellBold, { width: "9%" }]}>
								Overall
							</Text>
							<Text style={[styles.tableCellBold, { width: "12%" }]}>
								Evaluated By
							</Text>
							<Text style={[styles.tableCellBold, { width: "8%" }]}>
								Status
							</Text>
						</View>
						{data.training.map((t, i) => (
							<View key={i} style={styles.tableRow}>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{t.studentName}
								</Text>
								<Text style={[styles.tableCell, { width: "7%" }]}>
									{t.semester}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.knowledgeScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.clinicalSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "11%" }]}>
									{t.proceduralSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{t.softSkillScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.researchScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{t.overallScore ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.evaluatedBy}
								</Text>
								<View style={[styles.tableCell, { width: "8%" }]}>
									<StatusBadge status={t.status} />
								</View>
							</View>
						))}
					</View>
				}

				<Text style={styles.footer}>
					AIIMS Patna â€” Department of Emergency Medicine â€” PG Residency
					Digital Logbook
				</Text>
			</Page>
		</Document>
	);
}

// ======================== PUBLIC EXPORT FUNCTIONS ========================

export async function exportStudentDataToPdf(
	rotations: RotationEntry[],
	thesis: ThesisEntry | null,
	training: TrainingEntry[],
	studentName: string,
) {
	const blob = await pdf(
		<StudentPdfDocument data={{ studentName, rotations, thesis, training }} />,
	).toBlob();
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	const dateStr = formatFileDate();
	saveAs(blob, `Rotation_Postings_${safeName}_${dateStr}.pdf`);
}

export async function exportReviewDataToPdf(
	rotations: ReviewRotationEntry[],
	theses: ReviewThesisEntry[],
	training: ReviewTrainingEntry[],
	reviewerRole: "faculty" | "hod",
) {
	const blob = await pdf(
		<ReviewPdfDocument data={{ reviewerRole, rotations, theses, training }} />,
	).toBlob();
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	const dateStr = formatFileDate();
	saveAs(blob, `Rotation_Review_${roleLabel}_${dateStr}.pdf`);
}

function formatFileDate(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ======================== CASE PRESENTATION TYPES ========================

interface CasePresentationPdfEntry {
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

interface CasePresentationReviewPdfEntry extends CasePresentationPdfEntry {
	studentName: string;
	batch: string;
	semester: number;
}

// ======================== CASE PRESENTATION PDF DOCUMENTS ========================

function CasePresentationStudentPdf({
	entries,
	studentName,
}: {
	entries: CasePresentationPdfEntry[];
	studentName: string;
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						ACADEMIC CASE PRESENTATION AND DISCUSSION
					</Text>
					<Text style={styles.subtitle}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>Student: {studentName}</Text>
				</View>

				<View style={styles.table}>
					{/* Header */}
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "5%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "9%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "13%" }]}>
							Patient Name
						</Text>
						<Text style={[styles.tableCell, { width: "5%" }]}>Age</Text>
						<Text style={[styles.tableCell, { width: "5%" }]}>Sex</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>UHID</Text>
						<Text style={[styles.tableCell, { width: "22%" }]}>
							Complete Diagnosis
						</Text>
						<Text style={[styles.tableCell, { width: "12%" }]}>Category</Text>
						<Text style={[styles.tableCell, { width: "12%" }]}>
							Faculty Remark
						</Text>
						<Text style={[styles.tableCell, { width: "7%" }]}>Status</Text>
					</View>

					{entries.length === 0 ?
						<Text style={styles.emptyText}>No entries yet</Text>
					:	entries.map((e, i) => (
							<View
								key={i}
								style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
							>
								<Text style={[styles.tableCell, { width: "5%" }]}>
									{e.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{e.date ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{e.patientName ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "5%" }]}>
									{e.patientAge ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "5%" }]}>
									{e.patientSex ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{e.uhid ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "22%" }]}>
									{stripMarkdown(e.completeDiagnosis)}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{e.category ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{stripMarkdown(e.facultyRemark)}
								</Text>
								<Text style={[styles.tableCell, { width: "7%" }]}>
									{e.status}
								</Text>
							</View>
						))
					}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

function CasePresentationReviewPdf({
	entries,
	reviewerRole,
}: {
	entries: CasePresentationReviewPdfEntry[];
	reviewerRole: "faculty" | "hod";
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						ACADEMIC CASE PRESENTATION AND DISCUSSION â€” Review
					</Text>
					<Text style={styles.subtitle}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>
						{reviewerRole === "hod" ? "HOD" : "Faculty"} Review Report
					</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "4%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "12%" }]}>Student</Text>
						<Text style={[styles.tableCell, { width: "8%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Patient</Text>
						<Text style={[styles.tableCell, { width: "4%" }]}>Age</Text>
						<Text style={[styles.tableCell, { width: "4%" }]}>Sex</Text>
						<Text style={[styles.tableCell, { width: "8%" }]}>UHID</Text>
						<Text style={[styles.tableCell, { width: "20%" }]}>Diagnosis</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Category</Text>
						<Text style={[styles.tableCell, { width: "13%" }]}>Remark</Text>
						<Text style={[styles.tableCell, { width: "7%" }]}>Status</Text>
					</View>

					{entries.length === 0 ?
						<Text style={styles.emptyText}>No submissions yet</Text>
					:	entries.map((e, i) => (
							<View
								key={i}
								style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
							>
								<Text style={[styles.tableCell, { width: "4%" }]}>
									{e.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{e.studentName}
								</Text>
								<Text style={[styles.tableCell, { width: "8%" }]}>
									{e.date ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{e.patientName ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "4%" }]}>
									{e.patientAge ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "4%" }]}>
									{e.patientSex ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "8%" }]}>
									{e.uhid ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "20%" }]}>
									{stripMarkdown(e.completeDiagnosis)}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{e.category ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{stripMarkdown(e.facultyRemark)}
								</Text>
								<Text style={[styles.tableCell, { width: "7%" }]}>
									{e.status}
								</Text>
							</View>
						))
					}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

// ======================== CASE PRESENTATION PUBLIC EXPORT FUNCTIONS ========================

export async function exportCasePresentationsToPdf(
	entries: CasePresentationPdfEntry[],
	studentName: string,
) {
	const blob = await pdf(
		<CasePresentationStudentPdf entries={entries} studentName={studentName} />,
	).toBlob();
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Case_Presentations_${safeName}_${formatFileDate()}.pdf`);
}

export async function exportCasePresentationReviewToPdf(
	entries: CasePresentationReviewPdfEntry[],
	reviewerRole: "faculty" | "hod",
) {
	const blob = await pdf(
		<CasePresentationReviewPdf entries={entries} reviewerRole={reviewerRole} />,
	).toBlob();
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		blob,
		`Case_Presentations_Review_${roleLabel}_${formatFileDate()}.pdf`,
	);
}

// ======================== JOURNAL CLUB TYPES ========================

interface JournalClubPdfEntry {
	slNo: number;
	date: string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	status: string;
}

interface JournalClubReviewPdfEntry extends JournalClubPdfEntry {
	studentName: string;
	batch: string;
	semester: number;
}

// ======================== JOURNAL CLUB PDF DOCUMENTS ========================

function JournalClubStudentPdf({
	entries,
	studentName,
}: {
	entries: JournalClubPdfEntry[];
	studentName: string;
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						JOURNAL CLUB DISCUSSION / CRITICAL APPRAISAL OF LITERATURE PRESENTED
					</Text>
					<Text style={styles.subtitle}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>Student: {studentName}</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "6%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "12%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "34%" }]}>
							Journal Article
						</Text>
						<Text style={[styles.tableCell, { width: "20%" }]}>
							Type of Study
						</Text>
						<Text style={[styles.tableCell, { width: "18%" }]}>
							Faculty Remark
						</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Status</Text>
					</View>

					{entries.length === 0 ?
						<Text style={styles.emptyText}>No entries yet</Text>
					:	entries.map((e, i) => (
							<View
								key={i}
								style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
							>
								<Text style={[styles.tableCell, { width: "6%" }]}>
									{e.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{e.date ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "34%" }]}>
									{stripMarkdown(e.journalArticle)}
								</Text>
								<Text style={[styles.tableCell, { width: "20%" }]}>
									{stripMarkdown(e.typeOfStudy)}
								</Text>
								<Text style={[styles.tableCell, { width: "18%" }]}>
									{stripMarkdown(e.facultyRemark)}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{e.status}
								</Text>
							</View>
						))
					}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

function JournalClubReviewPdf({
	entries,
	reviewerRole,
}: {
	entries: JournalClubReviewPdfEntry[];
	reviewerRole: "faculty" | "hod";
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						JOURNAL CLUB DISCUSSION / CRITICAL APPRAISAL â€” Review
					</Text>
					<Text style={styles.subtitle}>
						AIIMS Patna â€” MD Emergency Medicine
					</Text>
					<Text style={styles.subtitle}>
						{reviewerRole === "hod" ? "HOD" : "Faculty"} Review Report
					</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "5%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "14%" }]}>Student</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "28%" }]}>
							Journal Article
						</Text>
						<Text style={[styles.tableCell, { width: "17%" }]}>
							Type of Study
						</Text>
						<Text style={[styles.tableCell, { width: "17%" }]}>Remark</Text>
						<Text style={[styles.tableCell, { width: "9%" }]}>Status</Text>
					</View>

					{entries.length === 0 ?
						<Text style={styles.emptyText}>No submissions yet</Text>
					:	entries.map((e, i) => (
							<View
								key={i}
								style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
							>
								<Text style={[styles.tableCell, { width: "5%" }]}>
									{e.slNo}
								</Text>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{e.studentName}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{e.date ?? "â€”"}
								</Text>
								<Text style={[styles.tableCell, { width: "28%" }]}>
									{stripMarkdown(e.journalArticle)}
								</Text>
								<Text style={[styles.tableCell, { width: "17%" }]}>
									{stripMarkdown(e.typeOfStudy)}
								</Text>
								<Text style={[styles.tableCell, { width: "17%" }]}>
									{stripMarkdown(e.facultyRemark)}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{e.status}
								</Text>
							</View>
						))
					}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

// ======================== JOURNAL CLUB PUBLIC EXPORT FUNCTIONS ========================

export async function exportJournalClubsToPdf(
	entries: JournalClubPdfEntry[],
	studentName: string,
) {
	const blob = await pdf(
		<JournalClubStudentPdf entries={entries} studentName={studentName} />,
	).toBlob();
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Journal_Clubs_${safeName}_${formatFileDate()}.pdf`);
}

export async function exportJournalClubReviewToPdf(
	entries: JournalClubReviewPdfEntry[],
	reviewerRole: "faculty" | "hod",
) {
	const blob = await pdf(
		<JournalClubReviewPdf entries={entries} reviewerRole={reviewerRole} />,
	).toBlob();
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(blob, `Journal_Clubs_Review_${roleLabel}_${formatFileDate()}.pdf`);
}

// ======================== CLINICAL SKILLS â€” STUDENT EXPORT ========================

interface ClinicalSkillPdfEntry {
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
}

function ClinicalSkillStudentPdf({
	entries,
	studentName,
	label,
}: {
	entries: ClinicalSkillPdfEntry[];
	studentName: string;
	label: string;
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Log of Clinical Skill Training â€” {label} Patient
					</Text>
					<Text style={styles.subtitle}>Student: {studentName}</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "8%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "25%" }]}>
							Clinical Skill
						</Text>
						<Text style={[styles.tableCell, { width: "30%" }]}>
							Representative Diagnosis
						</Text>
						<Text style={[styles.tableCell, { width: "17%" }]}>
							Level of Confidence
						</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Tally</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Status</Text>
					</View>

					{entries.map((e) => (
						<View key={e.slNo} style={styles.tableRow}>
							<Text style={[styles.tableCell, { width: "8%" }]}>{e.slNo}</Text>
							<Text style={[styles.tableCell, { width: "25%" }]}>
								{e.skillName}
							</Text>
							<Text style={[styles.tableCell, { width: "30%" }]}>
								{e.representativeDiagnosis ?? "â€”"}
							</Text>
							<Text style={[styles.tableCell, { width: "17%" }]}>
								{e.confidenceLevel ?? "â€”"}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.totalTimesPerformed}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.status}
							</Text>
						</View>
					))}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

export async function exportClinicalSkillsToPdf(
	entries: ClinicalSkillPdfEntry[],
	studentName: string,
	label: string,
) {
	const blob = await pdf(
		<ClinicalSkillStudentPdf
			entries={entries}
			studentName={studentName}
			label={label}
		/>,
	).toBlob();
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(blob, `Clinical_Skills_${label}_${safeName}_${formatFileDate()}.pdf`);
}

// ======================== CLINICAL SKILLS â€” FACULTY/HOD REVIEW EXPORT ========================

interface ClinicalSkillReviewPdfEntry {
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

function ClinicalSkillReviewPdf({
	entries,
	reviewerRole,
	label,
}: {
	entries: ClinicalSkillReviewPdfEntry[];
	reviewerRole: "faculty" | "hod";
	label: string;
}) {
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Clinical Skills Review ({label} Patient) â€” {roleLabel}
					</Text>
					<Text style={styles.subtitle}>{entries.length} submissions</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "5%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "14%" }]}>Student</Text>
						<Text style={[styles.tableCell, { width: "22%" }]}>
							Clinical Skill
						</Text>
						<Text style={[styles.tableCell, { width: "25%" }]}>
							Representative Diagnosis
						</Text>
						<Text style={[styles.tableCell, { width: "13%" }]}>Confidence</Text>
						<Text style={[styles.tableCell, { width: "8%" }]}>Tally</Text>
						<Text style={[styles.tableCell, { width: "13%" }]}>Status</Text>
					</View>

					{entries.map((e, i) => (
						<View key={i} style={styles.tableRow}>
							<Text style={[styles.tableCell, { width: "5%" }]}>{e.slNo}</Text>
							<Text style={[styles.tableCell, { width: "14%" }]}>
								{e.studentName}
							</Text>
							<Text style={[styles.tableCell, { width: "22%" }]}>
								{e.skillName}
							</Text>
							<Text style={[styles.tableCell, { width: "25%" }]}>
								{e.representativeDiagnosis ?? "â€”"}
							</Text>
							<Text style={[styles.tableCell, { width: "13%" }]}>
								{e.confidenceLevel ?? "â€”"}
							</Text>
							<Text style={[styles.tableCell, { width: "8%" }]}>
								{e.totalTimesPerformed}
							</Text>
							<Text style={[styles.tableCell, { width: "13%" }]}>
								{e.status}
							</Text>
						</View>
					))}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} â€” {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

export async function exportClinicalSkillReviewToPdf(
	entries: ClinicalSkillReviewPdfEntry[],
	reviewerRole: "faculty" | "hod",
	label: string,
) {
	const blob = await pdf(
		<ClinicalSkillReviewPdf
			entries={entries}
			reviewerRole={reviewerRole}
			label={label}
		/>,
	).toBlob();
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		blob,
		`Clinical_Skills_Review_${label}_${roleLabel}_${formatFileDate()}.pdf`,
	);
}

// ======================== CASE MANAGEMENT — STUDENT EXPORT ========================

interface CaseManagementPdfEntry {
	slNo: number;
	caseSubCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	tally: number;
	status: string;
}

function CaseManagementStudentPdf({
	entries,
	studentName,
	categoryLabel,
}: {
	entries: CaseManagementPdfEntry[];
	studentName: string;
	categoryLabel: string;
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Log of Case Management — {categoryLabel}
					</Text>
					<Text style={styles.subtitle}>Student: {studentName}</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "5%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "18%" }]}>Case Type</Text>
						<Text style={[styles.tableCell, { width: "9%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "12%" }]}>Patient</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>UHID</Text>
						<Text style={[styles.tableCell, { width: "20%" }]}>Diagnosis</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Competency</Text>
						<Text style={[styles.tableCell, { width: "7%" }]}>Tally</Text>
						<Text style={[styles.tableCell, { width: "9%" }]}>Status</Text>
					</View>

					{entries.map((e) => (
						<View key={e.slNo} style={styles.tableRow}>
							<Text style={[styles.tableCell, { width: "5%" }]}>{e.slNo}</Text>
							<Text style={[styles.tableCell, { width: "18%" }]}>
								{e.caseSubCategory}
							</Text>
							<Text style={[styles.tableCell, { width: "9%" }]}>
								{e.date ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "12%" }]}>
								{e.patientName ?
									`${e.patientName}${e.patientAge ? `, ${e.patientAge}` : ""}${e.patientSex ? `/${e.patientSex}` : ""}`
								:	"—"}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.uhid ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "20%" }]}>
								{e.completeDiagnosis ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.competencyLevel ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "7%" }]}>{e.tally}</Text>
							<Text style={[styles.tableCell, { width: "9%" }]}>
								{e.status}
							</Text>
						</View>
					))}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} — {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

export async function exportCaseManagementToPdf(
	entries: CaseManagementPdfEntry[],
	studentName: string,
	categoryLabel: string,
) {
	const blob = await pdf(
		<CaseManagementStudentPdf
			entries={entries}
			studentName={studentName}
			categoryLabel={categoryLabel}
		/>,
	).toBlob();
	const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
	const safeCategory = categoryLabel.replace(/[^a-zA-Z0-9]/g, "_");
	saveAs(
		blob,
		`Case_Management_${safeCategory}_${safeName}_${formatFileDate()}.pdf`,
	);
}

// ======================== CASE MANAGEMENT — FACULTY/HOD REVIEW EXPORT ========================

interface CaseManagementReviewPdfEntry {
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
	tally: number;
	status: string;
	studentName: string;
	batch: string;
	semester: number;
}

function CaseManagementReviewPdf({
	entries,
	reviewerRole,
	label,
}: {
	entries: CaseManagementReviewPdfEntry[];
	reviewerRole: "faculty" | "hod";
	label: string;
}) {
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Case Management Review ({label}) — {roleLabel}
					</Text>
					<Text style={styles.subtitle}>{entries.length} submissions</Text>
				</View>

				<View style={styles.table}>
					<View style={[styles.tableRow, styles.tableHeader]}>
						<Text style={[styles.tableCell, { width: "4%" }]}>Sl.</Text>
						<Text style={[styles.tableCell, { width: "11%" }]}>Student</Text>
						<Text style={[styles.tableCell, { width: "13%" }]}>Category</Text>
						<Text style={[styles.tableCell, { width: "15%" }]}>Case Type</Text>
						<Text style={[styles.tableCell, { width: "8%" }]}>Date</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Patient</Text>
						<Text style={[styles.tableCell, { width: "16%" }]}>Diagnosis</Text>
						<Text style={[styles.tableCell, { width: "10%" }]}>Competency</Text>
						<Text style={[styles.tableCell, { width: "5%" }]}>Tally</Text>
						<Text style={[styles.tableCell, { width: "8%" }]}>Status</Text>
					</View>

					{entries.map((e, i) => (
						<View key={i} style={styles.tableRow}>
							<Text style={[styles.tableCell, { width: "4%" }]}>{e.slNo}</Text>
							<Text style={[styles.tableCell, { width: "11%" }]}>
								{e.studentName}
							</Text>
							<Text style={[styles.tableCell, { width: "13%" }]}>
								{e.categoryLabel}
							</Text>
							<Text style={[styles.tableCell, { width: "15%" }]}>
								{e.caseSubCategory}
							</Text>
							<Text style={[styles.tableCell, { width: "8%" }]}>
								{e.date ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.patientName ?
									`${e.patientName}${e.patientAge ? `, ${e.patientAge}` : ""}`
								:	"—"}
							</Text>
							<Text style={[styles.tableCell, { width: "16%" }]}>
								{e.completeDiagnosis ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "10%" }]}>
								{e.competencyLevel ?? "—"}
							</Text>
							<Text style={[styles.tableCell, { width: "5%" }]}>{e.tally}</Text>
							<Text style={[styles.tableCell, { width: "8%" }]}>
								{e.status}
							</Text>
						</View>
					))}
				</View>

				<View style={styles.footer}>
					<Text>
						Generated on {new Date().toLocaleDateString()} — {entries.length}{" "}
						entries
					</Text>
				</View>
			</Page>
		</Document>
	);
}

export async function exportCaseManagementReviewToPdf(
	entries: CaseManagementReviewPdfEntry[],
	reviewerRole: "faculty" | "hod",
	label: string,
) {
	const blob = await pdf(
		<CaseManagementReviewPdf
			entries={entries}
			reviewerRole={reviewerRole}
			label={label}
		/>,
	).toBlob();
	const roleLabel = reviewerRole === "hod" ? "HOD" : "Faculty";
	saveAs(
		blob,
		`Case_Management_Review_${label}_${roleLabel}_${formatFileDate()}.pdf`,
	);
}
