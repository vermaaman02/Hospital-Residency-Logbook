/**
 * Mobile-safe types shared between the web app and the mobile app.
 * No framework-specific imports (no react, no react-hook-form, no @tanstack/react-table).
 */

// ======================== ENTRY STATUS ========================

export type EntryStatus =
	| "DRAFT"
	| "SUBMITTED"
	| "SIGNED"
	| "REJECTED"
	| "NEEDS_REVISION";

export type Role = "hod" | "faculty" | "student";

// ======================== PATIENT INFO ========================

export interface PatientInfo {
	patientName: string;
	patientAge: number;
	patientSex: "Male" | "Female" | "Other";
	uhid: string;
}

// ======================== COMPETENCY & SKILL TYPES ========================

export type CompetencyLevelType = "CBD" | "S" | "O" | "MS" | "MI";
export type ConfidenceLevelType = "VC" | "FC" | "SC" | "NC";
export type SkillLevelType = "S" | "O" | "A" | "PS" | "PI";
export type CprSkillLevelType = "S" | "TM" | "TL";

// ======================== API RESPONSE ========================

export interface ApiResponse<T = unknown> {
	ok: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedApiResponse<T> {
	ok: boolean;
	data?: {
		items: T[];
		nextCursor: string | null;
	};
	error?: string;
}

// ======================== USER / ME ========================

export interface MeUser {
	id: string;
	clerkId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	role: string;
	profileImageUrl: string | null;
	batch: string | null;
	currentSemester: number | null;
	department: string | null;
}

// ======================== EVALUATION ========================

export interface EvaluationScores {
	knowledgeScore: number;
	clinicalSkillScore: number;
	proceduralSkillScore: number;
	softSkillScore: number;
	researchScore: number;
}

// ======================== DIGITAL SIGNATURE ========================

export interface DigitalSignatureInfo {
	signedById: string;
	signedByName: string;
	signedAt: string;
	remark?: string;
}

// ======================== DASHBOARD SUMMARY ========================

export interface DashboardModuleSummary {
	module: string;
	draft: number;
	submitted: number;
	signed: number;
	rejected: number;
	needsRevision: number;
	total: number;
}

export interface DashboardSummary {
	modules: DashboardModuleSummary[];
	totalEntries: number;
	totalSigned: number;
	totalPending: number;
}

// ======================== INBOX ========================

export interface InboxItem {
	id: string;
	entityType: string;
	entityId: string;
	status: EntryStatus;
	studentName: string | null;
	facultyName: string | null;
	updatedAt: string;
	summary: string | null;
}
