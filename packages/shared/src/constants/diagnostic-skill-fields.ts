/**
 * @module Diagnostic Skill Field Configs
 * @description Form field configurations for diagnostic skill entry forms.
 * Covers ABG Analysis, ECG Analysis, and Other Diagnostic Analysis.
 * All use confidence levels (VC/FC/SC/NC).
 *
 * @see PG Logbook .md — Section: "DIAGNOSTIC SKILL LOGS"
 */

import { type FormFieldConfig } from "@/types";
import {
	CONFIDENCE_LEVEL_OPTIONS,
	type DiagnosticSkillConfig,
} from "./diagnostic-types";

/**
 * Get form fields for a diagnostic skill entry.
 * @param skillOptions - The predefined skills for the category
 */
export function getDiagnosticSkillFields(
	skillOptions: DiagnosticSkillConfig[],
): FormFieldConfig[] {
	return [
		{
			name: "skillName",
			label: "Skill / Disorder / Investigation",
			type: "select",
			required: true,
			colSpan: 2,
			options: skillOptions.map((s) => ({
				value: s.name,
				label: `${s.slNo}. ${s.name}`,
			})),
		},
		{
			name: "representativeDiagnosis",
			label: "Representative Patient Clinical Diagnosis",
			type: "textarea",
			required: false,
			colSpan: 2,
			placeholder: "Enter a representative clinical diagnosis...",
		},
		{
			name: "confidenceLevel",
			label: "Confidence Level (VC/FC/SC/NC)",
			type: "select",
			required: true,
			colSpan: 1,
			options: CONFIDENCE_LEVEL_OPTIONS.map((o) => ({
				value: o.value,
				label: o.label,
			})),
		},
		{
			name: "totalTimesPerformed",
			label: "Total No. of Times Performed / Tally",
			type: "number",
			required: false,
			colSpan: 1,
			placeholder: "0",
		},
	];
}
