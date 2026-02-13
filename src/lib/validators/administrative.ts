/**
 * @module AdministrativeValidator
 * @description Zod schemas for rotation postings, attendance, thesis, training & mentoring.
 *
 * @see PG Logbook .md — Sections: Rotation Posting, Attendance, Thesis, Training & Mentoring
 * @see prisma/schema.prisma — RotationPosting, AttendanceSheet, Thesis, TrainingMentoringRecord models
 */

import { z } from "zod";

export const rotationPostingSchema = z.object({
	rotationName: z
		.string()
		.min(1, "Rotation name is required")
		.max(200, "Too long"),
	isElective: z.boolean().default(false),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	totalDuration: z.string().max(100, "Duration text too long").optional(),
	facultyId: z.string().optional(),
});

export type RotationPostingInput = z.infer<typeof rotationPostingSchema>;

export const attendanceEntrySchema = z.object({
	date: z.coerce.date().optional(),
	day: z.enum([
		"MONDAY",
		"TUESDAY",
		"WEDNESDAY",
		"THURSDAY",
		"FRIDAY",
		"SATURDAY",
		"SUNDAY",
	]),
	presentAbsent: z.string().optional(),
	hodName: z.string().optional(),
});

export const attendanceSheetSchema = z.object({
	weekStartDate: z.coerce.date({
		error: "Week start date is required",
	}),
	weekEndDate: z.coerce.date({ error: "Week end date is required" }),
	batch: z.string().optional(),
	postedDepartment: z.string().optional(),
	entries: z
		.array(attendanceEntrySchema)
		.min(1, "At least one attendance entry is required"),
});

export type AttendanceSheetInput = z.infer<typeof attendanceSheetSchema>;

export const thesisSchema = z.object({
	topic: z.string().min(1, "Thesis topic is required"),
	chiefGuide: z.string().optional(),
});

export type ThesisInput = z.infer<typeof thesisSchema>;

export const thesisSemesterRecordSchema = z.object({
	semester: z.number().int().min(1).max(6),
	srJrMember: z.string().optional(),
	srMember: z.string().optional(),
	facultyMember: z.string().optional(),
});

export type ThesisSemesterRecordInput = z.infer<
	typeof thesisSemesterRecordSchema
>;

// ======================== TRAINING & MENTORING ========================

export const trainingMentoringSchema = z.object({
	semester: z
		.number()
		.int()
		.min(1, "Semester must be 1-6")
		.max(6, "Semester must be 1-6"),
	knowledgeScore: z
		.number()
		.int()
		.min(1, "Score must be 1-5")
		.max(5, "Score must be 1-5")
		.optional(),
	clinicalSkillScore: z.number().int().min(1).max(5).optional(),
	proceduralSkillScore: z.number().int().min(1).max(5).optional(),
	softSkillScore: z.number().int().min(1).max(5).optional(),
	researchScore: z.number().int().min(1).max(5).optional(),
	remarks: z.string().max(1000, "Remarks too long").optional(),
});

export type TrainingMentoringInput = z.infer<typeof trainingMentoringSchema>;
