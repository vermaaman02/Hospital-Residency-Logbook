/**
 * @module Case Presentation Fields
 * @description FormFieldConfig for Academic Case Presentation form.
 * Fields match exactly: Sl.No (auto), Date, Patient Name/Age/Sex/UHID,
 * Complete Diagnosis, Adult/Pediatric/Non-Trauma/Trauma, Faculty Remark, Faculty Sign.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 */

import { type FormFieldConfig } from "@/types";

export const PATIENT_CATEGORY_OPTIONS = [
	{ value: "ADULT_NON_TRAUMA", label: "Adult / Non-Trauma" },
	{ value: "ADULT_TRAUMA", label: "Adult / Trauma" },
	{ value: "PEDIATRIC_NON_TRAUMA", label: "Pediatric / Non-Trauma" },
	{ value: "PEDIATRIC_TRAUMA", label: "Pediatric / Trauma" },
] as const;

export const casePresentationFields: FormFieldConfig[] = [
	{
		name: "date",
		label: "Date",
		type: "date",
		required: true,
		colSpan: 1,
	},
	{
		name: "patientInfo",
		label: "Patient Name/Age/Sex/UHID",
		type: "text",
		required: true,
		placeholder: "e.g., Raj Kumar / 45 / M / UHID-12345",
		colSpan: 2,
	},
	{
		name: "completeDiagnosis",
		label: "Complete Diagnosis",
		type: "textarea",
		required: true,
		placeholder: "Enter the complete diagnosis...",
		colSpan: 3,
	},
	{
		name: "category",
		label: "Adult/Pediatric/Non-Trauma/Trauma",
		type: "select",
		required: false,
		colSpan: 1,
		options: [
			{ value: "ADULT_NON_TRAUMA", label: "Adult / Non-Trauma" },
			{ value: "ADULT_TRAUMA", label: "Adult / Trauma" },
			{ value: "PEDIATRIC_NON_TRAUMA", label: "Pediatric / Non-Trauma" },
			{ value: "PEDIATRIC_TRAUMA", label: "Pediatric / Trauma" },
		],
	},
];

export const seminarFields: FormFieldConfig[] = [
	{
		name: "date",
		label: "Date",
		type: "date",
		required: true,
		colSpan: 1,
	},
	{
		name: "patientInfo",
		label: "Patient Name/Age/Sex/UHID",
		type: "text",
		required: true,
		placeholder: "e.g., Raj Kumar / 45 / M / UHID-12345",
		colSpan: 2,
	},
	{
		name: "completeDiagnosis",
		label: "Complete Diagnosis",
		type: "textarea",
		required: true,
		placeholder: "Enter the complete diagnosis...",
		colSpan: 3,
	},
	{
		name: "category",
		label: "Adult/Pediatric/Non-Trauma/Trauma",
		type: "select",
		required: false,
		colSpan: 1,
		options: [
			{ value: "ADULT_NON_TRAUMA", label: "Adult / Non-Trauma" },
			{ value: "ADULT_TRAUMA", label: "Adult / Trauma" },
			{ value: "PEDIATRIC_NON_TRAUMA", label: "Pediatric / Non-Trauma" },
			{ value: "PEDIATRIC_TRAUMA", label: "Pediatric / Trauma" },
		],
	},
];

export const journalClubFields: FormFieldConfig[] = [
	{
		name: "date",
		label: "Date",
		type: "date",
		required: true,
		colSpan: 1,
	},
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
