/**
 * @module Entry Status & Shared Constants
 * @description Status labels, colors, competency levels, skill levels, and other shared constants.
 *
 * @see copilot-instructions.md — Section 11 for status badge colors
 */

// ======================== ENTRY STATUS ========================

export const ENTRY_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "SIGNED", label: "Signed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NEEDS_REVISION", label: "Needs Revision" },
] as const;

export const ENTRY_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  SUBMITTED: "bg-amber-100 text-amber-700 border-amber-300",
  SIGNED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  NEEDS_REVISION: "bg-orange-100 text-orange-700 border-orange-300",
} as const;

// ======================== COMPETENCY LEVELS (Case Management) ========================

export const COMPETENCY_LEVELS = [
  { value: "CBD", label: "CBD — Case Based Discussion" },
  { value: "S", label: "S — Simulation" },
  { value: "O", label: "O — Observed" },
  { value: "MS", label: "MS — Managed under Supervision" },
  { value: "MI", label: "MI — Managed Independently" },
] as const;

// ======================== SKILL LEVELS (Procedures) ========================

export const SKILL_LEVELS = [
  { value: "S", label: "S — Simulation" },
  { value: "O", label: "O — Observed" },
  { value: "A", label: "A — Assisted" },
  { value: "PS", label: "PS — Performed under Supervision" },
  { value: "PI", label: "PI — Performed Independently" },
] as const;

// ======================== CPR SKILL LEVELS ========================

export const CPR_SKILL_LEVELS = [
  { value: "S", label: "S — Simulation" },
  { value: "TM", label: "TM — Team Member" },
  { value: "TL", label: "TL — Team Leader" },
] as const;

// ======================== PATIENT CATEGORIES ========================

export const PATIENT_CATEGORIES = [
  { value: "ADULT_NON_TRAUMA", label: "Adult Non-Trauma" },
  { value: "ADULT_TRAUMA", label: "Adult Trauma" },
  { value: "PEDIATRIC_NON_TRAUMA", label: "Pediatric Non-Trauma" },
  { value: "PEDIATRIC_TRAUMA", label: "Pediatric Trauma" },
] as const;

// ======================== SEX OPTIONS ========================

export const SEX_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
] as const;

// ======================== SEMESTERS ========================

export const SEMESTERS = [
  { value: 1, label: "Semester 1" },
  { value: 2, label: "Semester 2" },
  { value: 3, label: "Semester 3" },
  { value: 4, label: "Semester 4" },
  { value: 5, label: "Semester 5" },
  { value: 6, label: "Semester 6" },
] as const;

// ======================== DAYS OF WEEK ========================

export const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
] as const;

// ======================== EVALUATION DOMAINS ========================

export const EVALUATION_DOMAINS = [
  { key: "knowledgeScore", label: "Knowledge" },
  { key: "clinicalSkillScore", label: "Clinical Skills" },
  { key: "proceduralSkillScore", label: "Procedural Skills" },
  { key: "softSkillScore", label: "Soft Skills" },
  { key: "researchScore", label: "Research" },
] as const;

// ======================== TRAINING MENTORING SCORES ========================

export const TRAINING_MENTORING_SCORES = [
  { value: 1, label: "1 — Requires Remedial" },
  { value: 2, label: "2 — Inconsistent" },
  { value: 3, label: "3 — Meets Expectations" },
  { value: 4, label: "4 — Exceeds Expectations" },
  { value: 5, label: "5 — Exceptional" },
] as const;

// ======================== APP METADATA ========================

export const APP_NAME = "AIIMS Patna PG Residency Digital Logbook" as const;
export const APP_SHORT_NAME = "PG Logbook" as const;
export const INSTITUTION_NAME = "All India Institute of Medical Sciences, Patna, Bihar" as const;
export const DEPARTMENT_NAME = "Department of Emergency Medicine" as const;
