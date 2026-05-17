/**
 * @module EvaluationValidator
 * @description Zod schemas for resident evaluation and training/mentoring records.
 *
 * @see PG Logbook .md — Sections: Evaluation, Training & Mentoring
 * @see prisma/schema.prisma — ResidentEvaluation, TrainingMentoringRecord models
 */

import { z } from "zod";

export const residentEvaluationSchema = z.object({
	semester: z.number().int().min(1).max(6),
	reviewNo: z.number().int().min(1).max(2),
	knowledgeScore: z.number().int().min(1).max(5).optional(),
	clinicalSkillScore: z.number().int().min(1).max(5).optional(),
	proceduralSkillScore: z.number().int().min(1).max(5).optional(),
	softSkillScore: z.number().int().min(1).max(5).optional(),
	researchScore: z.number().int().min(1).max(5).optional(),
	theoryMarks: z.string().optional(),
	practicalMarks: z.string().optional(),
	description: z.string().optional(),
	roleInActivity: z.string().optional(),
});

export type ResidentEvaluationInput = z.infer<typeof residentEvaluationSchema>;

// trainingMentoringSchema moved to administrative.ts (5-domain scoring)
