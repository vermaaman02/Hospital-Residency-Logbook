/**
 * @module Clinical Skills Field Config
 * @description Form field configuration for clinical skills entries.
 * Used with GenericLogForm for both Adult and Pediatric skill forms.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

import { type FormFieldConfig } from "@/types";
import { CONFIDENCE_LEVELS } from "@/lib/constants/clinical-skills";

export const CONFIDENCE_LEVEL_OPTIONS = CONFIDENCE_LEVELS.map((cl) => ({
	value: cl.value,
	label: cl.label,
}));

export const clinicalSkillFields: FormFieldConfig[] = [
	{
		name: "skillName",
		label: "Clinical Skill",
		type: "text",
		required: true,
		colSpan: 2,
		disabled: true, // Pre-populated, not editable
	},
	{
		name: "representativeDiagnosis",
		label: "Representative Patient Clinical Diagnosis",
		type: "textarea",
		required: false,
		colSpan: 3,
		placeholder: "Enter the representative patient's clinical diagnosis",
	},
	{
		name: "confidenceLevel",
		label: "Confidence Level (VC/FC/SC/NC)",
		type: "select",
		required: true,
		colSpan: 1,
		options: CONFIDENCE_LEVEL_OPTIONS,
	},
	{
		name: "totalTimesPerformed",
		label: "Total No. of times performed",
		type: "number",
		required: true,
		colSpan: 1,
		placeholder: "0",
	},
];
