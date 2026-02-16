/**
 * @module ClinicalSkillsValidator
 * @description Zod schemas for clinical skill entries (Adult and Pediatric).
 *
 * @see PG Logbook .md — Section: "LOG OF CLINICAL SKILL TRAINING"
 * @see prisma/schema.prisma — ClinicalSkillAdult, ClinicalSkillPediatric models
 */

import { z } from "zod";

export const clinicalSkillSchema = z.object({
	skillName: z.string().min(1, "Skill name is required"),
	representativeDiagnosis: z.string().optional(),
	confidenceLevel: z.enum(["VC", "FC", "SC", "NC"], {
		error: "Confidence level is required",
	}),
	totalTimesPerformed: z.number().int().min(0).default(0),
});

export type ClinicalSkillInput = z.infer<typeof clinicalSkillSchema>;

export const clinicalSkillUpdateSchema = clinicalSkillSchema.partial();
export type ClinicalSkillUpdateInput = z.infer<
	typeof clinicalSkillUpdateSchema
>;
