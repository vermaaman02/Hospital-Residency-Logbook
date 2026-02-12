/**
 * @module Imaging Categories Constants
 * @description 5 imaging categories with display labels and target entry counts.
 * Tracked with skill levels (S/O/A/PS/PI).
 *
 * @see PG Logbook .md — Section: "IMAGING LOGS"
 */

export interface ImagingCategoryConfig {
  code: string;
  enumValue: string;
  label: string;
  maxEntries: number;
}

export const IMAGING_CATEGORIES: ImagingCategoryConfig[] = [
  {
    code: "G1",
    enumValue: "ULTRASOUND_ECHO_NON_TRAUMA",
    label: "Ultrasound & Echocardiography Examination: Non-Trauma Adult / Pediatric",
    maxEntries: 60,
  },
  {
    code: "G2",
    enumValue: "POCUS_TRAUMA",
    label: "Point of Care Ultrasonography Examination: Trauma: Adult / Pediatric",
    maxEntries: 50,
  },
  {
    code: "G3",
    enumValue: "XRAY_CT_NON_TRAUMA",
    label: "Imaging Analysis X-Ray/ CT Scans: Non-Trauma: Adult / Pediatric",
    maxEntries: 40,
  },
  {
    code: "G4",
    enumValue: "XRAY_CT_MRI_BRAIN",
    label: "Imaging Analysis X-Ray/ CT Scans/ MRI Brain: Non-Trauma: Adult / Pediatric",
    maxEntries: 10,
  },
  {
    code: "G5",
    enumValue: "XRAY_CT_TRAUMA",
    label: "Imaging Analysis (X-Ray, CT Scan): Trauma: Adult / Pediatric",
    maxEntries: 50,
  },
] as const;

export const IMAGING_CATEGORY_LABELS: Record<string, string> = {
  ULTRASOUND_ECHO_NON_TRAUMA: "Ultrasound & Echo (Non-Trauma)",
  POCUS_TRAUMA: "POCUS (Trauma)",
  XRAY_CT_NON_TRAUMA: "X-Ray/CT (Non-Trauma)",
  XRAY_CT_MRI_BRAIN: "X-Ray/CT/MRI Brain",
  XRAY_CT_TRAUMA: "X-Ray/CT (Trauma)",
} as const;
