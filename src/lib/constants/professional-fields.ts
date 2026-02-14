/**
 * @module ProfessionalFieldConfigs
 * @description Field configurations for all 8 Professional Development sub-modules (H1–H8).
 *
 * @see PG Logbook .md — Sections: Courses, Conferences, Research, Disaster, QI
 * @see prisma/schema.prisma — CourseAttended, ConferenceParticipation, ResearchActivity,
 *      DisasterDrill, QualityImprovement models
 */

import type { FormFieldConfig } from "@/types";

// ─── H1: Life Support & Skill Courses ─────────────────────────

export const COURSE_ATTENDED_FIELDS: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "courseName",
		label: "Course Name",
		type: "text",
		required: true,
		colSpan: 2,
		placeholder: "e.g., ACLS, BLS, PALS, ATLS",
	},
	{
		name: "conductedAt",
		label: "Conducted@",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., AIIMS Patna, AIIMS Delhi",
	},
	{
		name: "confidenceLevel",
		label: "Confidence Level",
		type: "select",
		colSpan: 1,
		options: [
			{ value: "VC", label: "VC — Very Confident" },
			{ value: "FC", label: "FC — Fairly Confident" },
			{ value: "SC", label: "SC — Slightly Confident" },
			{ value: "NC", label: "NC — Not Confident" },
		],
	},
];

// ─── H2: Conference & Academic Activity Participation ──────────

export const CONFERENCE_PARTICIPATION_FIELDS: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "conferenceName",
		label: "Conference/ Academic Activity",
		type: "text",
		required: true,
		colSpan: 2,
		placeholder: "e.g., INDUSEM, EMCON, APEMCON",
	},
	{
		name: "conductedAt",
		label: "Conducted@",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., AIIMS New Delhi",
	},
	{
		name: "participationRole",
		label: "Participation Role",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., Presenter, Attendee, Poster, Oral",
	},
];

// ─── H3: Research/Teaching/Community Activity ──────────────────

export const RESEARCH_ACTIVITY_FIELDS: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "activity",
		label: "Activity",
		type: "textarea",
		required: true,
		colSpan: 2,
		placeholder: "Describe the research, teaching, or community activity",
	},
	{
		name: "conductedAt",
		label: "Conducted@",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., AIIMS Patna, Community Center",
	},
	{
		name: "participationRole",
		label: "Participation Role",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., Principal Investigator, Trainer, Volunteer",
	},
];

// ─── H4: Disaster Management Drill ────────────────────────────

export const DISASTER_DRILL_FIELDS: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "description",
		label: "Description of Work Done",
		type: "textarea",
		required: true,
		colSpan: 2,
		placeholder: "Describe the major incident/disaster/mass casualty drill",
	},
	{
		name: "roleInActivity",
		label: "Role in the activity",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., Triage Officer, Team Leader, Participant",
	},
];

// ─── H5: Quality Improvement / Patient Safety / Clinical Audit ─

export const QUALITY_IMPROVEMENT_FIELDS: FormFieldConfig[] = [
	{ name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
	{
		name: "description",
		label: "Description of Work Done",
		type: "textarea",
		required: true,
		colSpan: 2,
		placeholder: "Describe the QI project, patient safety initiative, or audit",
	},
	{
		name: "roleInActivity",
		label: "Role in the activity",
		type: "text",
		colSpan: 1,
		placeholder: "e.g., Auditor, Lead, Participant",
	},
];

// ─── Category Metadata ────────────────────────────────────────

export const PROFESSIONAL_CATEGORIES = {
	COURSES: {
		label: "Life-Support and Other Skill Development Courses Attended",
		shortLabel: "Courses",
		code: "H1",
		maxEntries: 10,
	},
	CONFERENCES: {
		label: "Conference and Other Academic Activity Participation",
		shortLabel: "Conferences",
		code: "H2",
		maxEntries: 10,
	},
	RESEARCH: {
		label:
			"Other Research/ Team Building/ Teaching & Training/ Community Outreach Activity",
		shortLabel: "Research & Teaching",
		code: "H3",
		maxEntries: 10,
	},
	DISASTER: {
		label:
			"Major Incident Planning/ Disaster Management Drill/ Mass Casualty Management/ Prehospital EM",
		shortLabel: "Disaster Drills",
		code: "H4",
		maxEntries: 10,
	},
	QI: {
		label: "Quality Improvement/ Patient Safety Initiative/ Clinical Audit",
		shortLabel: "Quality Improvement",
		code: "H5",
		maxEntries: 10,
	},
} as const;
