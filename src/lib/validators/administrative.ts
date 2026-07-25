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
	markedAt: z.coerce.date().optional(),
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
});

export const attendanceSheetSchema = z
	.object({
		weekStartDate: z.coerce.date({
			error: "Week start date is required",
		}),
		weekEndDate: z.coerce.date({ error: "Week end date is required" }),
		batch: z.string().optional(),
		postedDepartment: z.string().optional(),
		entries: z
			.array(attendanceEntrySchema)
			.min(1, "At least one attendance entry is required"),
	})
	.superRefine((data, ctx) => {
		if (data.weekEndDate < data.weekStartDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Week end date must be on or after week start date",
				path: ["weekEndDate"],
			});
		}

		const seen = new Set<string>();
		for (const entry of data.entries) {
			if (!entry.date) continue;
			const key =
				entry.date.getFullYear() +
				"-" +
				String(entry.date.getMonth() + 1).padStart(2, "0") +
				"-" +
				String(entry.date.getDate()).padStart(2, "0");
			if (seen.has(key)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Duplicate attendance date in the same week",
					path: ["entries"],
				});
				break;
			}
			seen.add(key);
		}
	});

export type AttendanceSheetInput = z.infer<typeof attendanceSheetSchema>;

export const dailyAttendanceSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	presentAbsent: z.enum(["Present", "Absent", "Leave", "Holiday"], {
		error: "Attendance status is required",
	}),
	hodName: z.string().nullable().optional(),
	postedDepartment: z.string().nullable().optional(),
	latitude: z.number().nullable().optional(),
	longitude: z.number().nullable().optional(),
});

export type DailyAttendanceInput = z.infer<typeof dailyAttendanceSchema>;

export const attendanceConfigSchema = z.object({
	batchId: z.string().min(1, "Batch is required"),
	academicYearStart: z.coerce.date().optional(),
	academicYearEnd: z.coerce.date().optional(),
	classStartTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
		.optional(),
	classEndTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
		.optional(),
	locationRestricted: z.boolean().default(false),
	campusLatitude: z.number().min(-90).max(90).optional(),
	campusLongitude: z.number().min(-180).max(180).optional(),
	campusRadiusMeters: z.number().int().min(50).max(10000).optional(),
	weeklyOffDays: z.array(z.string()).default([]),
	minimumAttendancePct: z.number().int().min(0).max(100).default(75),
});

export type AttendanceConfigInput = z.infer<typeof attendanceConfigSchema>;

export const attendanceHolidaySchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	label: z.string().min(1, "Holiday label is required").max(100),
	batchId: z.string().optional(),
});

export type AttendanceHolidayInput = z.infer<typeof attendanceHolidaySchema>;

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
