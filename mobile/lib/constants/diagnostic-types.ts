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
	bgColor: string;
	borderColor: string;
	textColor: string;
}

export const CONFIDENCE_LEVELS: ConfidenceLevelOption[] = [
	{
		label: "VC",
		value: "VC",
		description: "Very Confident",
		bgColor: "#E6F4EA",
		borderColor: "#34A853",
		textColor: "#137333",
	},
	{
		label: "FC",
		value: "FC",
		description: "Fairly Confident",
		bgColor: "#E8F0FE",
		borderColor: "#4285F4",
		textColor: "#1A73E8",
	},
	{
		label: "SC",
		value: "SC",
		description: "Somewhat Confident",
		bgColor: "#FEF7E0",
		borderColor: "#FBBC04",
		textColor: "#B06000",
	},
	{
		label: "NC",
		value: "NC",
		description: "Not Confident",
		bgColor: "#FCE8E6",
		borderColor: "#EA4335",
		textColor: "#C5221F",
	},
];

export interface PredefinedSkillConfig {
	slNo: number;
	name: string;
}

export const PREDEFINED_DIAGNOSTIC_SKILLS: Record<string, PredefinedSkillConfig[]> = {
	ABG_ANALYSIS: [
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
	],
	ECG_ANALYSIS: [
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
	],
	OTHER_DIAGNOSTIC: [
		{ slNo: 1, name: "Hemogram" },
		{ slNo: 2, name: "Peripheral Smear" },
		{ slNo: 3, name: "Biochemical investigation -- Renal/Liver function tests" },
		{ slNo: 4, name: "Point of care biomarkers interpretation" },
		{ slNo: 5, name: "Urine Dipstick analysis, Urine microscopy" },
		{ slNo: 6, name: "Fluid analysis- Pleural/ peritoneal/ CSF analysis" },
		{ slNo: 7, name: "Investigation in Tropical fever/ Other infectious disease/ Sepsis" },
		{ slNo: 8, name: "Investigations in toxicological cases" },
		{ slNo: 9, name: "Other specialized investigation -- Pulmonary function test/ PEFR" },
		{ slNo: 10, name: "Other specialized investigation -- Nerve conduction study/EEG/EMG" },
	],
};
