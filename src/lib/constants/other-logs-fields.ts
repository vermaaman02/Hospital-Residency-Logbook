/**
 * @module OtherLogsFieldConfigs
 * @description Field configurations for Transport (H6), Consent (H7), Breaking Bad News (H8).
 *
 * @see PG Logbook .md — Sections: Transport of Critically Ill, Informed Consent, Breaking Bad News
 * @see prisma/schema.prisma — TransportLog, ConsentLog, BadNewsLog models
 */

import type { FormFieldConfig } from "@/types";

export const SKILL_LEVEL_OPTIONS_SOAPI = [
	{ value: "S", label: "S — Simulation" },
	{ value: "O", label: "O — Observed" },
	{ value: "A", label: "A — Assisted" },
	{ value: "PS", label: "PS — Performed under Supervision" },
	{ value: "PI", label: "PI — Performed Independently" },
] as const;

export const SKILL_LEVEL_LABELS_SOAPI: Record<string, string> = {
	S: "Simulation",
	O: "Observed",
	A: "Assisted",
	PS: "Performed under Supervision",
	PI: "Performed Independently",
};

// Shared fields for H6, H7, H8 — they differ only in label context
function getCommonOtherLogFields(
	procedureLabel: string,
	procedurePlaceholder: string,
): FormFieldConfig[] {
	return [
		{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
		{
			name: "patientInfo",
			label: "Patient Name/ Age/Sex/UHID",
			type: "text",
			required: true,
			colSpan: 2,
			placeholder: "e.g., Rajesh Kumar, 45/M, UHID: 123456",
		},
		{
			name: "completeDiagnosis",
			label: "Complete Diagnosis",
			type: "textarea",
			required: true,
			colSpan: 2,
			placeholder: "Enter complete diagnosis",
		},
		{
			name: "procedureDescription",
			label: procedureLabel,
			type: "textarea",
			colSpan: 2,
			placeholder: procedurePlaceholder,
		},
		{
			name: "performedAtLocation",
			label: "Performed @ Location",
			type: "text",
			colSpan: 1,
			placeholder: "e.g., Emergency Ward, ICU, Ambulance",
		},
		{
			name: "skillLevel",
			label: "S/ O/ A/ PS/ PI",
			type: "select",
			required: true,
			colSpan: 1,
			options: [...SKILL_LEVEL_OPTIONS_SOAPI],
		},
	];
}

// ─── H6: Transport of Critically Ill Patient ──────────────────

export const TRANSPORT_LOG_FIELDS = getCommonOtherLogFields(
	"Procedure Description",
	"Describe the transport procedure performed",
);

// ─── H7: Taking Informed Consent ──────────────────────────────

export const CONSENT_LOG_FIELDS = getCommonOtherLogFields(
	"Procedure Description",
	"Describe the consent procedure context",
);

// ─── H8: Breaking Bad News ────────────────────────────────────

export const BAD_NEWS_LOG_FIELDS = getCommonOtherLogFields(
	"Procedure Description",
	"Describe the breaking bad news situation",
);

// ─── Category Metadata ────────────────────────────────────────

export const OTHER_LOG_CATEGORIES = {
	TRANSPORT: {
		label:
			"Transport of Critically Ill Patient (Inter/Intra-Hospital): Adult / Pediatric",
		shortLabel: "Transport",
		code: "H6",
		maxEntries: 10,
	},
	CONSENT: {
		label: "Taking Informed Consent",
		shortLabel: "Informed Consent",
		code: "H7",
		maxEntries: 10,
	},
	BAD_NEWS: {
		label: "Breaking Bad News",
		shortLabel: "Breaking Bad News",
		code: "H8",
		maxEntries: 10,
	},
} as const;
