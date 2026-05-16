/**
 * @module ProcedureLogValidator
 * @description Zod schema for procedure log entries (inline edit update).
 *
 * @see PG Logbook .md — Section: "LOG OF PROCEDURES"
 * @see prisma/schema.prisma — ProcedureLog model
 */

import { z } from "zod";

export const procedureLogUpdateSchema = z.object({
	date: z.string().nullable().optional(),
	patientName: z.string().nullable().optional(),
	patientAge: z.number().min(0).max(150).nullable().optional(),
	patientSex: z.string().nullable().optional(),
	uhid: z.string().nullable().optional(),
	completeDiagnosis: z.string().nullable().optional(),
	procedureDescription: z.string().nullable().optional(),
	performedAtLocation: z.string().nullable().optional(),
	skillLevel: z
		.enum(["S", "O", "A", "PS", "PI", "TM", "TL"])
		.nullable()
		.optional(),
	totalProcedureTally: z.number().min(0).optional(),
	facultyId: z.string().nullable().optional(),
});

export type ProcedureLogUpdateInput = z.infer<typeof procedureLogUpdateSchema>;
