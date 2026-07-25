export interface DiagnosticCategoryConfig {
	key: string;
	enumValue: string;
	label: string;
	subtitle: string;
	totalSkills: number;
}

export const DIAGNOSTIC_CATEGORIES: DiagnosticCategoryConfig[] = [
	{
		key: "abg-analysis",
		enumValue: "ABG_ANALYSIS",
		label: "Arterial/Venous Blood Gas (ABG) Analysis",
		subtitle: "ABG interpretation, acid-base disorders & oxygenation",
		totalSkills: 10,
	},
	{
		key: "ecg-analysis",
		enumValue: "ECG_ANALYSIS",
		label: "Electrocardiograph (ECG) Analysis",
		subtitle: "Arrhythmia, ACS, conduction disorders & arrest rhythms",
		totalSkills: 10,
	},
	{
		key: "other-diagnostic",
		enumValue: "OTHER_DIAGNOSTIC",
		label: "Other Diagnostic Analysis",
		subtitle: "Hemogram, peripheral smear, fluids, dipstick & biomarkers",
		totalSkills: 10,
	},
];

export interface ConfidenceLevelOption {
	label: string;
	value: "VC" | "FC" | "SC" | "NC";
	description: string;
}

export const CONFIDENCE_LEVELS: ConfidenceLevelOption[] = [
	{ label: "VC", value: "VC", description: "Very Confident" },
	{ label: "FC", value: "FC", description: "Fairly Confident" },
	{ label: "SC", value: "SC", description: "Somewhat Confident" },
	{ label: "NC", value: "NC", description: "Not Confident" },
];
