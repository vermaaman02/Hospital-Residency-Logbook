/**
 * @module Rotation Postings Constants
 * @description All 20 rotation posting departments from the PG Logbook.
 * Core postings (1-7) and Elective postings (8-20).
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

export interface RotationPostingConfig {
  slNo: number;
  name: string;
  isElective: boolean;
}

export const ROTATION_POSTINGS: RotationPostingConfig[] = [
  // Core Postings (1-7)
  { slNo: 1, name: "Emergency Medicine", isElective: false },
  { slNo: 2, name: "Critical Care", isElective: false },
  { slNo: 3, name: "Trauma surgery (including Ortho trauma & Neuro Trauma)", isElective: false },
  { slNo: 4, name: "Neonatal ICU", isElective: false },
  { slNo: 5, name: "Cardiology", isElective: false },
  { slNo: 6, name: "Medicine", isElective: false },
  { slNo: 7, name: "Pediatric Emergency and critical care", isElective: false },

  // Elective Postings (8-20)
  { slNo: 8, name: "Nephrology", isElective: true },
  { slNo: 9, name: "Gastroenterology", isElective: true },
  { slNo: 10, name: "Neurology", isElective: true },
  { slNo: 11, name: "Anesthesia", isElective: true },
  { slNo: 12, name: "Pulmonary Medicine & Sleep disorders", isElective: true },
  { slNo: 13, name: "Hematology Medical Oncology", isElective: true },
  { slNo: 14, name: "Dermatology", isElective: true },
  { slNo: 15, name: "Psychiatry", isElective: true },
  { slNo: 16, name: "Obstetrics & Gynecology", isElective: true },
  { slNo: 17, name: "Oto-rhino laryngology", isElective: true },
  { slNo: 18, name: "Ophthalmology", isElective: true },
  { slNo: 19, name: "Forensic Medicine", isElective: true },
  { slNo: 20, name: "Community Medicine", isElective: true },
] as const;

export const CORE_ROTATION_NAMES = ROTATION_POSTINGS
  .filter((r) => !r.isElective)
  .map((r) => r.name);

export const ELECTIVE_ROTATION_NAMES = ROTATION_POSTINGS
  .filter((r) => r.isElective)
  .map((r) => r.name);

export const ALL_ROTATION_NAMES = ROTATION_POSTINGS.map((r) => r.name);
