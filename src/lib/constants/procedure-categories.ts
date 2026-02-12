/**
 * @module Procedure Categories Constants
 * @description All 48 procedure categories with display labels and target entry counts.
 * Tracked with skill levels (S/O/A/PS/PI) or CPR-specific (S/TM/TL).
 *
 * @see PG Logbook .md — Section: "LOG OF PROCEDURES"
 * @see roadmap.md — Section 6E
 */

export interface ProcedureCategoryConfig {
  enumValue: string;
  label: string;
  maxEntries: number;
  isCpr?: boolean; // Uses TM/TL instead of A/PS/PI
}

export const PROCEDURE_CATEGORIES: ProcedureCategoryConfig[] = [
  { enumValue: "AIRWAY_ADULT", label: "Airway Management — Adult", maxEntries: 90 },
  { enumValue: "AIRWAY_ADULT_ALTERNATIVE", label: "Airway Management — Adult Alternative", maxEntries: 20 },
  { enumValue: "AIRWAY_PEDIATRIC_NEONATAL", label: "Airway Management — Pediatric & Neonatal", maxEntries: 30 },
  { enumValue: "BREATHING_VENTILATOR", label: "Breathing & Ventilator Management", maxEntries: 50 },
  { enumValue: "NEEDLE_THORACOCENTESIS_ICD", label: "Needle Thoracocentesis / ICD", maxEntries: 15 },
  { enumValue: "PERIPHERAL_IV_ADULT", label: "Peripheral IV Access — Adult", maxEntries: 40 },
  { enumValue: "PERIPHERAL_IV_PEDIATRIC", label: "Peripheral IV Access — Pediatric", maxEntries: 20 },
  { enumValue: "CENTRAL_IV", label: "Central IV Access", maxEntries: 20 },
  { enumValue: "CENTRAL_IV_PICC", label: "Central IV / PICC Line", maxEntries: 5 },
  { enumValue: "ARTERIAL_PUNCTURE_ABG", label: "Arterial Puncture & ABG", maxEntries: 50 },
  { enumValue: "INTRAOSSEOUS_VENOUS_CUTDOWN", label: "Intraosseous / Venous Cutdown", maxEntries: 5 },
  { enumValue: "HEMODYNAMIC_MONITORING_CVP", label: "Hemodynamic Monitoring / CVP", maxEntries: 10 },
  { enumValue: "CARDIOVERSION_DEFIBRILLATION_ADULT", label: "Cardioversion / Defibrillation — Adult", maxEntries: 10 },
  { enumValue: "CARDIOVERSION_DEFIBRILLATION_PEDIATRIC", label: "Cardioversion / Defibrillation — Pediatric", maxEntries: 5 },
  { enumValue: "CPR_ADULT", label: "CPR — Adult", maxEntries: 30, isCpr: true },
  { enumValue: "PERICARDIOCENTESIS_CARDIAC_PACING", label: "Pericardiocentesis / Cardiac Pacing", maxEntries: 5 },
  { enumValue: "CPR_SPECIAL_PEDIATRIC_NEONATAL", label: "CPR — Special / Pediatric / Neonatal", maxEntries: 15, isCpr: true },
  { enumValue: "NASOGASTRIC_TUBE", label: "Nasogastric Tube Insertion", maxEntries: 30 },
  { enumValue: "FOLEYS_CATHETERISATION", label: "Foley's Catheterisation", maxEntries: 30 },
  { enumValue: "GUIDED_SUPRAPUBIC_CATHETERISATION", label: "Guided Suprapubic Catheterisation", maxEntries: 5 },
  { enumValue: "PARACENTESIS", label: "Paracentesis", maxEntries: 10 },
  { enumValue: "LUMBAR_PUNCTURE", label: "Lumbar Puncture", maxEntries: 10 },
  { enumValue: "INCISION_DRAINAGE", label: "Incision & Drainage", maxEntries: 10 },
  { enumValue: "PER_RECTAL_PROCTOSCOPY", label: "Per Rectal / Proctoscopy", maxEntries: 10 },
  { enumValue: "PENILE_EMERGENCIES", label: "Penile Emergencies", maxEntries: 5 },
  { enumValue: "NASAL_PACKING", label: "Nasal Packing", maxEntries: 10 },
  { enumValue: "ENT_DIAGNOSTIC_EXAMINATION", label: "ENT Diagnostic Examination", maxEntries: 10 },
  { enumValue: "ENT_FOREIGN_BODY_REMOVAL", label: "ENT Foreign Body Removal", maxEntries: 10 },
  { enumValue: "TRACHEOSTOMY_MANAGEMENT", label: "Tracheostomy Management", maxEntries: 5 },
  { enumValue: "WOUND_MANAGEMENT_SIMPLE_COMPLEX", label: "Wound Management — Simple & Complex", maxEntries: 50 },
  { enumValue: "WOUND_MANAGEMENT_ANIMAL_BITE", label: "Wound Management — Animal Bite", maxEntries: 15 },
  { enumValue: "WOUND_MANAGEMENT_BURNS_AMPUTATION", label: "Wound Management — Burns & Amputation", maxEntries: 15 },
  { enumValue: "CERVICAL_COLLAR", label: "Cervical Collar Application", maxEntries: 20 },
  { enumValue: "SPINAL_IMMOBILIZATION", label: "Spinal Immobilization", maxEntries: 20 },
  { enumValue: "PELVIC_STABILIZATION", label: "Pelvic Stabilization", maxEntries: 10 },
  { enumValue: "SPLINTING_FRACTURES", label: "Splinting of Fractures", maxEntries: 30 },
  { enumValue: "PLASTER_TECHNIQUE", label: "Plaster Technique", maxEntries: 20 },
  { enumValue: "REDUCTION_DISLOCATION", label: "Reduction of Dislocation", maxEntries: 10 },
  { enumValue: "OTHER_PROCEDURES", label: "Other Procedures", maxEntries: 20 },
  { enumValue: "REGIONAL_ANAESTHESIA_NERVE_BLOCK", label: "Regional Anaesthesia / Nerve Block", maxEntries: 10 },
  { enumValue: "PROCEDURAL_SEDATION", label: "Procedural Sedation", maxEntries: 15 },
  { enumValue: "MAXILLOFACIAL_DENTAL", label: "Maxillofacial & Dental Procedures", maxEntries: 10 },
  { enumValue: "EMERGENCY_BURR_HOLE_EVD", label: "Emergency Burr Hole / EVD", maxEntries: 5 },
  { enumValue: "PER_VAGINAL_SPECULUM", label: "Per Vaginal / Speculum Examination", maxEntries: 10 },
  { enumValue: "VAGINAL_DELIVERY", label: "Vaginal Delivery", maxEntries: 5 },
  { enumValue: "SEXUAL_ABUSE_EXAMINATION", label: "Sexual Abuse Examination", maxEntries: 5 },
  { enumValue: "OPHTHALMIC_SLIT_LAMP", label: "Ophthalmic Slit Lamp Examination", maxEntries: 10 },
  { enumValue: "OPHTHALMIC_FB_REMOVAL", label: "Ophthalmic Foreign Body Removal", maxEntries: 5 },
  { enumValue: "ANY_OTHER", label: "Any Other Procedure", maxEntries: 20 },
] as const;

export const PROCEDURE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PROCEDURE_CATEGORIES.map((cat) => [cat.enumValue, cat.label]),
);

export const CPR_PROCEDURE_CATEGORIES = PROCEDURE_CATEGORIES
  .filter((cat) => cat.isCpr)
  .map((cat) => cat.enumValue);
