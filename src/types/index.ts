/**
 * @module Types
 * @description Central type definitions for the AIIMS Patna PG Residency Logbook.
 * All shared interfaces and types are exported from this file.
 *
 * @see roadmap.md — Section 5 for database models
 * @see copilot-instructions.md — Section 6 for component architecture
 */

import { type FieldValues, type DefaultValues } from "react-hook-form";
import { type ZodType } from "zod";
import { type ReactNode } from "react";
import { type ColumnDef } from "@tanstack/react-table";

// ======================== FORM FIELD CONFIG ========================

export interface FormFieldOption {
	value: string;
	label: string;
}

export type FormFieldType =
	| "text"
	| "textarea"
	| "date"
	| "select"
	| "radio"
	| "number"
	| "patient-info"
	| "competency"
	| "confidence"
	| "skill-level"
	| "cpr-skill-level"
	| "checkbox";

export interface FormFieldConfig {
	name: string;
	label: string;
	type: FormFieldType;
	placeholder?: string;
	required?: boolean;
	options?: FormFieldOption[];
	colSpan?: 1 | 2 | 3;
	helpText?: string;
	disabled?: boolean;
}

// ======================== GENERIC FORM PROPS ========================

export interface GenericLogFormProps<T extends FieldValues> {
	schema: ZodType<T>;
	defaultValues: DefaultValues<T>;
	fields: FormFieldConfig[];
	onSubmit: (data: T) => Promise<void>;
	onSaveDraft?: (data: Partial<T>) => void;
	entryStatus?: EntryStatus;
	isEditable?: boolean;
	title: string;
	description?: string;
	isLoading?: boolean;
}

// ======================== DATA TABLE PROPS ========================

export interface FilterConfig {
	name: string;
	label: string;
	options: FormFieldOption[];
}

export interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T, unknown>[];
	searchable?: boolean;
	searchField?: string;
	filterable?: boolean;
	filterOptions?: FilterConfig[];
	pagination?: boolean;
	pageSize?: number;
	onRowClick?: (row: T) => void;
	actions?: (row: T) => ReactNode;
	emptyMessage?: string;
	exportable?: boolean;
}

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

// ======================== SIDEBAR NAVIGATION ========================

export interface NavItem {
	title: string;
	href: string;
	icon: string;
	badge?: number;
	children?: NavItem[];
}

export interface SidebarSection {
	title: string;
	items: NavItem[];
}

// ======================== PAGE HEADER ========================

export interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	breadcrumbs?: BreadcrumbItem[];
}

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

// ======================== STAT CARD ========================

export interface StatCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon?: React.ComponentType<{ className?: string }>;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

// ======================== API RESPONSE ========================

export interface ApiResponse<T = unknown> {
	data?: T;
	error?: string;
	details?: unknown;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

// ======================== EVALUATION ========================

export interface EvaluationScores {
	knowledgeScore: number;
	clinicalSkillScore: number;
	proceduralSkillScore: number;
	softSkillScore: number;
	researchScore: number;
}

// ======================== STATUS BADGE ========================

export interface StatusBadgeProps {
	status: EntryStatus;
	size?: "sm" | "md" | "lg";
}

// ======================== DIGITAL SIGNATURE ========================

export interface DigitalSignatureInfo {
	signedById: string;
	signedByName: string;
	signedAt: Date;
	remark?: string;
}
