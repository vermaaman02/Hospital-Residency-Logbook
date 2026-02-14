/**
 * @module DiagnosticSkillsValidator
 * @description Zod schema for diagnostic skill entries (ABG, ECG, Other).
 *
 * @see PG Logbook .md — Section: "LOG OF DIAGNOSTIC SKILLS"
 * @see prisma/schema.prisma — DiagnosticSkill model
 */

import { z } from "zod";

export const diagnosticSkillSchema = z.object({
	diagnosticCategory: z.enum(
		["ABG_ANALYSIS", "ECG_ANALYSIS", "OTHER_DIAGNOSTIC"],
		{
			error: "Diagnostic category is required",
		},
	),
	skillName: z.string().min(1, "Skill name is required"),
	representativeDiagnosis: z.string().optional(),
	confidenceLevel: z.enum(["VC", "FC", "SC", "NC"], {
		error: "Confidence level is required",
	}),
	totalTimesPerformed: z.number().int().min(0).default(0),
});

export type DiagnosticSkillInput = z.infer<typeof diagnosticSkillSchema>;

export const diagnosticSkillUpdateSchema = diagnosticSkillSchema.partial();
export type DiagnosticSkillUpdateInput = z.infer<
	typeof diagnosticSkillUpdateSchema
>;
