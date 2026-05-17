/**
 * @module EvaluationFieldConfigs
 * @description Field configurations for Evaluation & Assessment modules (I1-I3).
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION: PERIODIC LOG BOOK FACULTY REVIEW"
 *                        "RESIDENT EVALUATION GRAPH"
 *                        "End Semester Assessment"
 * @see prisma/schema.prisma — ResidentEvaluation model
 */

import type { FormFieldConfig } from "@/types";

// ─── I1: Periodic Logbook Review ────────────────────────────

export const PERIODIC_REVIEW_FIELDS: FormFieldConfig[] = [
	{
		name: "semester",
		label: "Semester",
		type: "select",
		required: true,
		colSpan: 1,
		options: [
			{ value: "1", label: "Semester 1" },
			{ value: "2", label: "Semester 2" },
			{ value: "3", label: "Semester 3" },
			{ value: "4", label: "Semester 4" },
			{ value: "5", label: "Semester 5" },
			{ value: "6", label: "Semester 6" },
		],
	},
	{
		name: "reviewNo",
		label: "Review No.",
		type: "select",
		required: true,
		colSpan: 1,
		options: [
			{ value: "1", label: "Review 1" },
			{ value: "2", label: "Review 2" },
		],
	},
	{
		name: "description",
		label: "Description of Work Done",
		type: "textarea",
		required: true,
		colSpan: 2,
		placeholder: "Describe the work done during this review period",
	},
	{
		name: "roleInActivity",
		label: "Role in the activity",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., Primary Resident, Team Member",
	},
];

// ─── I2: Evaluation Graph (Faculty fills per semester) ──────

export const EVALUATION_GRAPH_FIELDS: FormFieldConfig[] = [
	{
		name: "semester",
		label: "Semester",
		type: "select",
		required: true,
		colSpan: 1,
		options: [
			{ value: "1", label: "Semester 1" },
			{ value: "2", label: "Semester 2" },
			{ value: "3", label: "Semester 3" },
			{ value: "4", label: "Semester 4" },
			{ value: "5", label: "Semester 5" },
			{ value: "6", label: "Semester 6" },
		],
	},
	{
		name: "knowledgeScore",
		label: "Knowledge (1-5)",
		type: "number",
		required: true,
		colSpan: 1,
		helpText: "Rate 1 (Poor) to 5 (Excellent)",
	},
	{
		name: "clinicalSkillScore",
		label: "Clinical Skills (1-5)",
		type: "number",
		required: true,
		colSpan: 1,
		helpText: "Rate 1 (Poor) to 5 (Excellent)",
	},
	{
		name: "proceduralSkillScore",
		label: "Procedural Skills (1-5)",
		type: "number",
		required: true,
		colSpan: 1,
		helpText: "Rate 1 (Poor) to 5 (Excellent)",
	},
	{
		name: "softSkillScore",
		label: "Soft Skills & Other (1-5)",
		type: "number",
		required: true,
		colSpan: 1,
		helpText: "Rate 1 (Poor) to 5 (Excellent)",
	},
	{
		name: "researchScore",
		label: "Research (1-5)",
		type: "number",
		required: true,
		colSpan: 1,
		helpText: "Rate 1 (Poor) to 5 (Excellent)",
	},
];

// ─── I3: End Semester Assessment ─────────────────────────────

export const END_SEMESTER_ASSESSMENT_FIELDS: FormFieldConfig[] = [
	{
		name: "semester",
		label: "Semester",
		type: "select",
		required: true,
		colSpan: 1,
		options: [
			{ value: "1", label: "Semester 1" },
			{ value: "2", label: "Semester 2" },
			{ value: "3", label: "Semester 3" },
			{ value: "4", label: "Semester 4" },
			{ value: "5", label: "Semester 5" },
			{ value: "6", label: "Semester 6" },
		],
	},
	{
		name: "theoryMarks",
		label: "Theory Marks",
		type: "text",
		required: true,
		colSpan: 1,
		placeholder: "e.g., 75/100",
	},
	{
		name: "practicalMarks",
		label: "Practical Marks",
		type: "text",
		required: true,
		colSpan: 1,
		placeholder: "e.g., 80/100",
	},
];

// ─── Score labels ────────────────────────────────────────────

export const SCORE_LABELS: Record<number, string> = {
	1: "Poor",
	2: "Below Average",
	3: "Average",
	4: "Good",
	5: "Excellent",
} as const;

export const SCORE_COLORS: Record<number, string> = {
	1: "text-red-600 bg-red-50",
	2: "text-orange-600 bg-orange-50",
	3: "text-amber-600 bg-amber-50",
	4: "text-blue-600 bg-blue-50",
	5: "text-green-600 bg-green-50",
} as const;

export const REVIEW_SCHEDULE = [
	{ slNo: 1, semester: 1, reviewNo: 1, label: "SEM 1 — Review 1" },
	{ slNo: 2, semester: 1, reviewNo: 2, label: "SEM 1 — Review 2" },
	{ slNo: 3, semester: 2, reviewNo: 1, label: "SEM 2 — Review 1" },
	{ slNo: 4, semester: 2, reviewNo: 2, label: "SEM 2 — Review 2" },
	{ slNo: 5, semester: 3, reviewNo: 1, label: "SEM 3 — Review 1" },
	{ slNo: 6, semester: 3, reviewNo: 2, label: "SEM 3 — Review 2" },
	{ slNo: 7, semester: 4, reviewNo: 1, label: "SEM 4 — Review 1" },
	{ slNo: 8, semester: 4, reviewNo: 2, label: "SEM 4 — Review 2" },
	{ slNo: 9, semester: 5, reviewNo: 1, label: "SEM 5 — Review 1" },
	{ slNo: 10, semester: 5, reviewNo: 2, label: "SEM 5 — Review 2" },
	{ slNo: 11, semester: 6, reviewNo: 1, label: "SEM 6 — Review 1" },
	{ slNo: 12, semester: 6, reviewNo: 2, label: "SEM 6 — Review 2" },
] as const;
