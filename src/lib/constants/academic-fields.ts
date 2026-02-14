/**
 * @module Academic Fields Constants
 * @description Constants for Academic Case Presentation form.
 * Fields match exactly: Sl.No (auto), Date, Patient Name, Age, Sex, UHID,
 * Complete Diagnosis, Adult/Pediatric/Non-Trauma/Trauma/Other, Faculty Remark, Faculty Sign.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 */

export const PATIENT_CATEGORY_OPTIONS = [
	{ value: "ADULT_NON_TRAUMA", label: "Adult / Non-Trauma" },
	{ value: "ADULT_TRAUMA", label: "Adult / Trauma" },
	{ value: "PEDIATRIC_NON_TRAUMA", label: "Pediatric / Non-Trauma" },
	{ value: "PEDIATRIC_TRAUMA", label: "Pediatric / Trauma" },
	{ value: "OTHER", label: "Other" },
] as const;

export const SEX_OPTIONS = [
	{ value: "Male", label: "Male" },
	{ value: "Female", label: "Female" },
	{ value: "Other", label: "Other" },
] as const;

// Legacy field configs for Journal Club forms (used by GenericLogForm)
import { type FormFieldConfig } from "@/types";

export const journalClubFields: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "journalArticle",
		label: "Journal Article",
		type: "textarea",
		required: true,
		placeholder: "Title, authors, journal, year...",
		colSpan: 2,
	},
	{
		name: "typeOfStudy",
		label: "Type of Study",
		type: "text",
		required: false,
		placeholder: "e.g., RCT, Meta-analysis, Cohort...",
		colSpan: 1,
	},
];
