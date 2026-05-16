/**
 * @module RotationPostingFields
 * @description Field configuration for the Rotation Posting form.
 * Matches PG Logbook exactly: Sl No (auto), Rotation Name, Date, Total Duration, Faculty Signature.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

import { type FormFieldConfig } from "@/types";
import { ALL_ROTATION_NAMES } from "@/lib/constants/rotation-postings";

export const rotationPostingFields: FormFieldConfig[] = [
	{
		name: "rotationName",
		label: "Rotation Posting",
		type: "select",
		required: true,
		colSpan: 2,
		options: ALL_ROTATION_NAMES.map((name) => ({
			value: name,
			label: name,
		})),
		helpText: "Select the department for this rotation posting",
	},
	{
		name: "isElective",
		label: "Elective",
		type: "checkbox",
		required: false,
		colSpan: 1,
		helpText: "Check if this is an elective rotation (Sl. No. 8-20)",
	},
	{
		name: "startDate",
		label: "Start Date",
		type: "date",
		required: false,
		colSpan: 1,
	},
	{
		name: "endDate",
		label: "End Date",
		type: "date",
		required: false,
		colSpan: 1,
	},
	{
		name: "totalDuration",
		label: "Total Duration",
		type: "text",
		required: false,
		colSpan: 1,
		placeholder: "e.g., 3 months",
	},
];
