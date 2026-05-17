/**
 * @module Procedure Log Field Config
 * @description Form field configurations for procedure log entries.
 * Dynamically switches skill level options based on CPR vs non-CPR categories.
 *
 * @see PG Logbook .md — Section: "LOG OF PROCEDURES"
 * @see roadmap.md — Section 6E
 */

import { type FormFieldConfig } from "@/types";

/** Skill level options for standard procedures (S/O/A/PS/PI) */
export const STANDARD_SKILL_LEVEL_OPTIONS = [
	{ value: "S", label: "S — Simulation" },
	{ value: "O", label: "O — Observed" },
	{ value: "A", label: "A — Assisted" },
	{ value: "PS", label: "PS — Performed under Supervision" },
	{ value: "PI", label: "PI — Performed Independently" },
];

/** Skill level options for CPR procedures (S/TM/TL) */
export const CPR_SKILL_LEVEL_OPTIONS = [
	{ value: "S", label: "S — Simulation" },
	{ value: "TM", label: "TM — Team Member" },
	{ value: "TL", label: "TL — Team Leader" },
];

/** Skill level label map for display in tables/badges */
export const SKILL_LEVEL_LABELS: Record<string, string> = {
	S: "Simulation",
	O: "Observed",
	A: "Assisted",
	PS: "Performed under Supervision",
	PI: "Performed Independently",
	TM: "Team Member",
	TL: "Team Leader",
};

/**
 * Get procedure log form field definitions.
 * Pass `isCpr` to switch skill level options between S/O/A/PS/PI and S/TM/TL.
 */
export function getProcedureLogFields(isCpr: boolean): FormFieldConfig[] {
	return [
		{
			name: "date",
			label: "Date",
			type: "date",
			required: true,
			colSpan: 1,
		},
		{
			name: "patientInfo",
			label: "Patient Name / Age / Sex / UHID",
			type: "text",
			required: true,
			colSpan: 2,
			placeholder: "e.g., John Doe / 45 / M / UHID-123456",
		},
		{
			name: "completeDiagnosis",
			label: "Complete Diagnosis",
			type: "textarea",
			required: true,
			colSpan: 3,
		},
		{
			name: "procedureDescription",
			label: "Procedure Description",
			type: "textarea",
			required: false,
			colSpan: 3,
			placeholder: "Describe the procedure performed",
		},
		{
			name: "performedAtLocation",
			label: "Performed @ Location",
			type: "text",
			required: false,
			colSpan: 1,
			placeholder: "e.g., ER, ICU, OT",
		},
		{
			name: "skillLevel",
			label: isCpr ? "S / TM / TL" : "S / O / A / PS / PI",
			type: "select",
			required: true,
			colSpan: 1,
			options: isCpr ? CPR_SKILL_LEVEL_OPTIONS : STANDARD_SKILL_LEVEL_OPTIONS,
		},
	];
}
