/**
 * @module AcademicValidator
 * @description Zod schemas for academic records: case presentations, seminars, journal clubs.
 *
 * @see PG Logbook .md — Sections: Case Presentation, Seminar, Journal Club
 * @see prisma/schema.prisma — CasePresentation, Seminar, JournalClub models
 */

import { z } from "zod";

export const casePresentationSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	category: z
		.enum([
			"ADULT_NON_TRAUMA",
			"ADULT_TRAUMA",
			"PEDIATRIC_NON_TRAUMA",
			"PEDIATRIC_TRAUMA",
		])
		.optional(),
});

export type CasePresentationInput = z.infer<typeof casePresentationSchema>;

export const seminarSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	category: z
		.enum([
			"ADULT_NON_TRAUMA",
			"ADULT_TRAUMA",
			"PEDIATRIC_NON_TRAUMA",
			"PEDIATRIC_TRAUMA",
		])
		.optional(),
});

export type SeminarInput = z.infer<typeof seminarSchema>;

export const journalClubSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	journalArticle: z.string().min(1, "Journal article reference is required"),
	typeOfStudy: z.string().optional(),
});

export type JournalClubInput = z.infer<typeof journalClubSchema>;
