/**
 * @module Diagnostic Types Constants
 * @description ABG analysis (10 skills), ECG analysis (10 skills), Other diagnostics (10 skills).
 * All tracked with confidence levels (VC/FC/SC/NC).
 *
 * @see PG Logbook .md — Section: "DIAGNOSTIC SKILL LOGS"
 */

export interface DiagnosticSkillConfig {
	slNo: number;
	name: string;
}

// ======================== ABG ANALYSIS (10 skills) ========================

export const ABG_ANALYSIS_SKILLS: DiagnosticSkillConfig[] = [
	{ slNo: 1, name: "Respiratory Acidosis acute/chronic" },
	{ slNo: 2, name: "Respiratory Alkalosis acute/chronic" },
	{ slNo: 3, name: "Metabolic acidosis- HAGMA" },
	{ slNo: 4, name: "Metabolic acidosis- NAGMA" },
	{ slNo: 5, name: "Metabolic Alkalosis" },
	{ slNo: 6, name: "Mixed acid base disorders" },
	{ slNo: 7, name: "Mixed acid base disorders with albumin correction" },
	{ slNo: 8, name: "Interpretation of oxygenation" },
	{ slNo: 9, name: "Co-oximetry/ Methemoglobinemia" },
	{ slNo: 10, name: "Osmolar gap" },
] as const;

// ======================== ECG ANALYSIS (10 skills) ========================

export const ECG_ANALYSIS_SKILLS: DiagnosticSkillConfig[] = [
	{ slNo: 1, name: "Normal ECG" },
	{ slNo: 2, name: "Brady Arrhythmias" },
	{ slNo: 3, name: "Conduction disorders" },
	{ slNo: 4, name: "Tachyarrhythmia -- Narrow complex" },
	{ slNo: 5, name: "Tachyarrhythmia -- Wide complex" },
	{ slNo: 6, name: "Cardiac arrest rhythm" },
	{ slNo: 7, name: "Acute coronary syndrome" },
	{ slNo: 8, name: "Electrolyte abnormality" },
	{ slNo: 9, name: "ECG in syncope- channelopathies/ other pathology" },
	{ slNo: 10, name: "ECG Toxicology" },
] as const;

// ======================== OTHER DIAGNOSTIC (10 skills) ========================

export const OTHER_DIAGNOSTIC_SKILLS: DiagnosticSkillConfig[] = [
	{ slNo: 1, name: "Hemogram" },
	{ slNo: 2, name: "Peripheral Smear" },
	{ slNo: 3, name: "Biochemical investigation -- Renal/Liver function tests" },
	{ slNo: 4, name: "Point of care biomarkers interpretation" },
	{ slNo: 5, name: "Urine Dipstick analysis, Urine microscopy" },
	{ slNo: 6, name: "Fluid analysis- Pleural/ peritoneal/ CSF analysis" },
	{
		slNo: 7,
		name: "Investigation in Tropical fever/ Other infectious disease/ Sepsis",
	},
	{ slNo: 8, name: "Investigations in toxicological cases" },
	{
		slNo: 9,
		name: "Other specialized investigation -- Pulmonary function test/ PEFR",
	},
	{
		slNo: 10,
		name: "Other specialized investigation -- Nerve conduction study/EEG/EMG",
	},
] as const;

// ======================== ALL DIAGNOSTIC SKILLS BY CATEGORY ========================

export const DIAGNOSTIC_SKILLS_BY_CATEGORY = {
	ABG_ANALYSIS: ABG_ANALYSIS_SKILLS,
	ECG_ANALYSIS: ECG_ANALYSIS_SKILLS,
	OTHER_DIAGNOSTIC: OTHER_DIAGNOSTIC_SKILLS,
} as const;

export const DIAGNOSTIC_SKILLS = [
	...ABG_ANALYSIS_SKILLS,
	...ECG_ANALYSIS_SKILLS,
	...OTHER_DIAGNOSTIC_SKILLS,
];

export const DIAGNOSTIC_CATEGORY_LABELS: Record<string, string> = {
	ABG_ANALYSIS: "Arterial/Venous Blood Gas (ABG) Analysis",
	ECG_ANALYSIS: "Electrocardiograph (ECG) Analysis",
	OTHER_DIAGNOSTIC: "Other Diagnostic Analysis",
} as const;

// ======================== SLUG HELPERS ========================

/** Convert enum to URL slug: ABG_ANALYSIS → abg-analysis */
export function diagnosticEnumToSlug(enumValue: string): string {
	return enumValue.toLowerCase().replace(/_/g, "-");
}

/** Convert URL slug to enum: abg-analysis → ABG_ANALYSIS */
export function diagnosticSlugToEnum(slug: string): string | undefined {
	const enumValue = slug.toUpperCase().replace(/-/g, "_");
	if (enumValue in DIAGNOSTIC_CATEGORY_LABELS) return enumValue;
	return undefined;
}

/** Get category config by slug */
export function getDiagnosticBySlug(slug: string):
	| {
			enumValue: string;
			label: string;
			skills: DiagnosticSkillConfig[];
	  }
	| undefined {
	const enumValue = diagnosticSlugToEnum(slug);
	if (!enumValue) return undefined;
	return {
		enumValue,
		label: DIAGNOSTIC_CATEGORY_LABELS[enumValue] ?? enumValue,
		skills:
			DIAGNOSTIC_SKILLS_BY_CATEGORY[
				enumValue as keyof typeof DIAGNOSTIC_SKILLS_BY_CATEGORY
			] ?? [],
	};
}

// ======================== CONFIDENCE LEVEL HELPERS ========================

export const CONFIDENCE_LEVEL_OPTIONS = [
	{ value: "VC", label: "Very Confident (VC)" },
	{ value: "FC", label: "Fairly Confident (FC)" },
	{ value: "SC", label: "Slightly Confident (SC)" },
	{ value: "NC", label: "Not Confident (NC)" },
] as const;

export const CONFIDENCE_LEVEL_LABELS: Record<string, string> = {
	VC: "Very Confident",
	FC: "Fairly Confident",
	SC: "Slightly Confident",
	NC: "Not Confident",
} as const;
