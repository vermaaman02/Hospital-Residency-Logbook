/**
 * @module Case Management Field Config
 * @description Form field configuration for case management log entries.
 * Reused across ALL 24 categories — only sub-category options change.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT" (all sections)
 */

import { type FormFieldConfig } from "@/types";

export const COMPETENCY_LEVEL_OPTIONS = [
	{ value: "CBD", label: "CBD — Case Based Discussion" },
	{ value: "S", label: "S — Simulation" },
	{ value: "O", label: "O — Observed" },
	{ value: "MS", label: "MS — Managed under Supervision" },
	{ value: "MI", label: "MI — Managed Independently" },
];

/**
 * Build field config for a specific category.
 * Sub-category options come from the category's sub-categories list.
 */
export function getCaseManagementFields(
	subCategoryOptions: { value: string; label: string }[],
): FormFieldConfig[] {
	return [
		{
			name: "caseSubCategory",
			label: "Case Category",
			type: "select",
			required: true,
			colSpan: 2,
			options: subCategoryOptions,
		},
		{
			name: "date",
			label: "Date",
			type: "date",
			required: true,
			colSpan: 1,
		},
		{
			name: "patientInfo",
			label: "Representative Patient Name/Age/Sex/UHID",
			type: "text",
			required: true,
			colSpan: 2,
			placeholder: "e.g., Ramesh / 45 / M / UHID-12345",
		},
		{
			name: "completeDiagnosis",
			label: "Complete Diagnosis",
			type: "textarea",
			required: true,
			colSpan: 3,
			placeholder: "Enter the complete diagnosis",
		},
		{
			name: "competencyLevel",
			label: "CBD/S/O/MS/MI",
			type: "select",
			required: true,
			colSpan: 1,
			options: COMPETENCY_LEVEL_OPTIONS,
		},
	];
}
