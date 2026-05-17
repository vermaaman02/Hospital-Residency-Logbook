/**
 * @module Clinical Skills Constants
 * @description 10 clinical skills each for Adult and Pediatric patients.
 * Tracked with confidence levels (VC/FC/SC/NC).
 *
 * @see PG Logbook .md — Section: "LOG OF CLINICAL SKILL TRAINING"
 */

export interface ClinicalSkillConfig {
  slNo: number;
  name: string;
}

export const CLINICAL_SKILLS_ADULT: ClinicalSkillConfig[] = [
  { slNo: 1, name: "Initial Assessment Non-Trauma" },
  { slNo: 2, name: "Initial Assessment Trauma" },
  { slNo: 3, name: "Secondary Survey" },
  { slNo: 4, name: "General Physical + Head to toe Examination" },
  { slNo: 5, name: "Respiratory System Examination" },
  { slNo: 6, name: "Cardiovascular System Examination" },
  { slNo: 7, name: "Central Nervous & Peripheral Nervous System Examination" },
  { slNo: 8, name: "Per abdominal Examination + Uro/Gynecological Examination" },
  { slNo: 9, name: "ENT + Ophthalmological Examination" },
  { slNo: 10, name: "Musculoskeletal + Joint Examination" },
] as const;

export const CLINICAL_SKILLS_PEDIATRIC: ClinicalSkillConfig[] = [
  { slNo: 1, name: "Initial Assessment Non-Trauma" },
  { slNo: 2, name: "Initial Assessment Trauma" },
  { slNo: 3, name: "Secondary Survey" },
  { slNo: 4, name: "General Physical + Head to toe Examination" },
  { slNo: 5, name: "Respiratory System Examination" },
  { slNo: 6, name: "Cardiovascular System Examination" },
  { slNo: 7, name: "Central Nervous & Peripheral Nervous System Examination" },
  { slNo: 8, name: "Per abdominal Examination + Uro/Gynecological Examination" },
  { slNo: 9, name: "ENT + Ophthalmological Examination" },
  { slNo: 10, name: "Musculoskeletal + Joint Examination" },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: "VC", label: "Very Confident (VC)" },
  { value: "FC", label: "Fairly Confident (FC)" },
  { value: "SC", label: "Slightly Confident (SC)" },
  { value: "NC", label: "Not Confident (NC)" },
] as const;
