/**
 * @module ProfessionalValidator
 * @description Zod schemas for courses, conferences, research, disaster drills, QI.
 *
 * @see PG Logbook .md — Sections: Courses, Conferences, Research, Disaster Drills, QI
 * @see prisma/schema.prisma — CourseAttended, ConferenceParticipation, ResearchActivity,
 *      DisasterDrill, QualityImprovement models
 */

import { z } from "zod";

export const courseAttendedSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	courseName: z.string().min(1, "Course name is required"),
	conductedAt: z.string().optional(),
	confidenceLevel: z.string().optional(),
});

export type CourseAttendedInput = z.infer<typeof courseAttendedSchema>;

export const conferenceParticipationSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	conferenceName: z.string().min(1, "Conference name is required"),
	conductedAt: z.string().optional(),
	participationRole: z.string().optional(),
});

export type ConferenceParticipationInput = z.infer<
	typeof conferenceParticipationSchema
>;

export const researchActivitySchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	activity: z.string().min(1, "Activity description is required"),
	conductedAt: z.string().optional(),
	participationRole: z.string().optional(),
});

export type ResearchActivityInput = z.infer<typeof researchActivitySchema>;

export const disasterDrillSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	description: z.string().min(1, "Description is required"),
	roleInActivity: z.string().optional(),
});

export type DisasterDrillInput = z.infer<typeof disasterDrillSchema>;

export const qualityImprovementSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	description: z.string().min(1, "Description is required"),
	roleInActivity: z.string().optional(),
});

export type QualityImprovementInput = z.infer<typeof qualityImprovementSchema>;
