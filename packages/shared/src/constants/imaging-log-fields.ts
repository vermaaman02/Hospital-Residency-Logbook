/**
 * @module Imaging Log Field Configs
 * @description Form field configurations for imaging log entry forms.
 * Covers 5 imaging categories: Ultrasound/Echo, POCUS Trauma, X-Ray/CT (Non-Trauma),
 * X-Ray/CT/MRI Brain, X-Ray/CT (Trauma).
 * All use skill levels (S/O/A/PS/PI).
 *
 * @see PG Logbook .md — Section: "IMAGING LOGS"
 */

import { type FormFieldConfig } from "@/types";

/** Skill level options for imaging logs (same as standard procedures) */
export const IMAGING_SKILL_LEVEL_OPTIONS = [
	{ value: "S", label: "Simulation (S)" },
	{ value: "O", label: "Observed (O)" },
	{ value: "A", label: "Assisted (A)" },
	{ value: "PS", label: "Performed under Supervision (PS)" },
	{ value: "PI", label: "Performed Independently (PI)" },
] as const;

export const IMAGING_SKILL_LEVEL_LABELS: Record<string, string> = {
	S: "Simulation",
	O: "Observed",
	A: "Assisted",
	PS: "Performed under Supervision",
	PI: "Performed Independently",
} as const;

/** Get form fields for an imaging log entry */
export function getImagingLogFields(): FormFieldConfig[] {
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
			placeholder: "e.g., Ram Kumar / 45 / M / 123456",
		},
		{
			name: "completeDiagnosis",
			label: "Complete Diagnosis",
			type: "textarea",
			required: true,
			colSpan: 2,
			placeholder: "Enter complete diagnosis...",
		},
		{
			name: "procedureDescription",
			label: "Procedure Description",
			type: "textarea",
			required: false,
			colSpan: 2,
			placeholder: "Describe the imaging procedure performed...",
		},
		{
			name: "performedAtLocation",
			label: "Performed @ Location",
			type: "text",
			required: false,
			colSpan: 1,
			placeholder: "e.g., ER, ICU, Radiology",
		},
		{
			name: "skillLevel",
			label: "Skill Level (S/O/A/PS/PI)",
			type: "select",
			required: true,
			colSpan: 1,
			options: IMAGING_SKILL_LEVEL_OPTIONS.map((o) => ({
				value: o.value,
				label: o.label,
			})),
		},
	];
}
