/**
 * @module export-pdf
 * @description PDF document generation for Rotation Postings data.
 * Creates a multi-section PDF: Rotation Postings table, Thesis details,
 * Training & Mentoring scores. Uses @react-pdf/renderer for document creation
 * and file-saver for browser download.
 *
 * @see PG Logbook .md — LOG OF ROTATION POSTINGS, Thesis, Training & Mentoring
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
	if (!d) return "—";
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
					<Text style={styles.title}>AIIMS Patna — MD Emergency Medicine</Text>
					<Text style={styles.subtitle}>
						PG Residency Logbook — Rotation Postings Report
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
									{r.durationDays ?? "—"}
								</Text>
								<View style={[styles.tableCell, { width: "10%" }]}>
									<StatusBadge status={r.status} />
								</View>
								<Text style={[styles.tableCell, { width: "14%" }]}>
									{r.facultyRemark ?? "—"}
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
											{s.srJrMember ?? "—"}
										</Text>
										<Text style={[styles.tableCell, { width: "26%" }]}>
											{s.srMember ?? "—"}
										</Text>
										<Text style={[styles.tableCell, { width: "28%" }]}>
											{s.facultyMember ?? "—"}
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
									{t.knowledgeScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{t.clinicalSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "13%" }]}>
									{t.proceduralSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.softSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.researchScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "12%" }]}>
									{t.overallScore ?? "—"}
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
					AIIMS Patna — Department of Emergency Medicine — PG Residency Digital
					Logbook
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
					<Text style={styles.title}>AIIMS Patna — MD Emergency Medicine</Text>
					<Text style={styles.subtitle}>
						Rotation Postings Review — {roleLabel} Report
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
									{r.durationDays ?? "—"}
								</Text>
								<View style={[styles.tableCell, { width: "8%" }]}>
									<StatusBadge status={r.status} />
								</View>
								<Text style={[styles.tableCell, { width: "16%" }]}>
									{r.facultyRemark ?? "—"}
								</Text>
							</View>
						))}
					</View>
				}

				<Text style={styles.footer}>
					AIIMS Patna — Department of Emergency Medicine — PG Residency Digital
					Logbook
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
									{t.facultyRemark ?? "—"}
								</Text>
							</View>
						))}
					</View>
				}

				<Text style={styles.footer}>
					AIIMS Patna — Department of Emergency Medicine — PG Residency Digital
					Logbook
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
									{t.knowledgeScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.clinicalSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "11%" }]}>
									{t.proceduralSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{t.softSkillScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "10%" }]}>
									{t.researchScore ?? "—"}
								</Text>
								<Text style={[styles.tableCell, { width: "9%" }]}>
									{t.overallScore ?? "—"}
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
					AIIMS Patna — Department of Emergency Medicine — PG Residency Digital
					Logbook
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
