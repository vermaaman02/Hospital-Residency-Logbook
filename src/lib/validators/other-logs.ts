/**
 * @module OtherLogsValidator
 * @description Zod schemas for transport, consent, and bad news logs.
 *
 * @see PG Logbook .md — Sections: Transport, Consent, Breaking Bad News
 * @see prisma/schema.prisma — TransportLog, ConsentLog, BadNewsLog models
 */

import { z } from "zod";

const commonLogSchema = z.object({
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	procedureDescription: z.string().optional(),
	performedAtLocation: z.string().optional(),
	skillLevel: z.enum(["S", "O", "A", "PS", "PI"], {
		error: "Skill level is required",
	}),
});

export const transportLogSchema = commonLogSchema;
export type TransportLogInput = z.infer<typeof transportLogSchema>;

export const consentLogSchema = commonLogSchema;
export type ConsentLogInput = z.infer<typeof consentLogSchema>;

export const badNewsLogSchema = commonLogSchema;
export type BadNewsLogInput = z.infer<typeof badNewsLogSchema>;
