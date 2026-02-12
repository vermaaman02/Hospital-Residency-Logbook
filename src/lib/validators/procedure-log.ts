/**
 * @module ProcedureLogValidator
 * @description Zod schema for procedure log entries.
 *
 * @see PG Logbook .md — Section: "LOG OF PROCEDURES"
 * @see prisma/schema.prisma — ProcedureLog model
 */

import { z } from "zod";

export const procedureLogSchema = z.object({
	procedureCategory: z.string().min(1, "Procedure category is required"),
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	procedureDescription: z.string().optional(),
	performedAtLocation: z.string().optional(),
	skillLevel: z.enum(["S", "O", "A", "PS", "PI", "TM", "TL"], {
		error: "Skill level is required",
	}),
});

export type ProcedureLogInput = z.infer<typeof procedureLogSchema>;

export const procedureLogUpdateSchema = procedureLogSchema.partial();
export type ProcedureLogUpdateInput = z.infer<typeof procedureLogUpdateSchema>;
