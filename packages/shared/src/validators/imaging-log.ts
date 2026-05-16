/**
 * @module ImagingLogValidator
 * @description Zod schema for imaging log entries.
 *
 * @see PG Logbook .md — Section: "LOG OF IMAGING SKILLS"
 * @see prisma/schema.prisma — ImagingLog model
 */

import { z } from "zod";

export const imagingLogSchema = z.object({
	imagingCategory: z.enum(
		[
			"ULTRASOUND_ECHO_NON_TRAUMA",
			"POCUS_TRAUMA",
			"XRAY_CT_NON_TRAUMA",
			"XRAY_CT_MRI_BRAIN",
			"XRAY_CT_TRAUMA",
		],
		{
			error: "Imaging category is required",
		},
	),
	date: z.coerce.date({ error: "Date is required" }),
	patientInfo: z.string().min(1, "Patient information is required"),
	completeDiagnosis: z.string().min(1, "Complete diagnosis is required"),
	procedureDescription: z.string().optional(),
	performedAtLocation: z.string().optional(),
	skillLevel: z.enum(["S", "O", "A", "PS", "PI"], {
		error: "Skill level is required",
	}),
});

export type ImagingLogInput = z.infer<typeof imagingLogSchema>;

export const imagingLogUpdateSchema = imagingLogSchema.partial();
export type ImagingLogUpdateInput = z.infer<typeof imagingLogUpdateSchema>;
