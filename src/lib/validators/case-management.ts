/**
 * @module CaseManagementValidator
 * @description Zod schema for case management log entries.
 *
 * @see PG Logbook .md — Section: "LOG OF CASE MANAGEMENT"
 * @see prisma/schema.prisma — CaseManagementLog model
 */

import { z } from "zod";

export const caseManagementSchema = z.object({
	category: z.string().min(1, "Case category is required"),
	caseSubCategory: z.string().min(1, "Case sub-category is required"),
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	competencyLevel: z.enum(["CBD", "S", "O", "MS", "MI"], {
		error: "Competency level is required",
	}),
});

export type CaseManagementInput = z.infer<typeof caseManagementSchema>;

export const caseManagementUpdateSchema = caseManagementSchema.partial();
export type CaseManagementUpdateInput = z.infer<
	typeof caseManagementUpdateSchema
>;
