/**
 * @module AdministrativeValidator
 * @description Zod schemas for rotation postings, attendance, thesis.
 *
 * @see PG Logbook .md — Sections: Rotation Posting, Attendance, Thesis
 * @see prisma/schema.prisma — RotationPosting, AttendanceSheet, Thesis models
 */

import { z } from "zod";

export const rotationPostingSchema = z.object({
	rotationName: z.string().min(1, "Rotation name is required"),
	isElective: z.boolean().default(false),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	totalDuration: z.string().optional(),
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
