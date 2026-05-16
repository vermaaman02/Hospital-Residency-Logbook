/**
 * @module Case Categories Constants
 * @description All 24 case management categories with 308 exact sub-types
 * from the PG Logbook. Names are EXACT matches to the physical logbook.
 *
 * @see PG Logbook .md — Section: "LOG OF CASE MANAGEMENT"
 * @see roadmap.md — Section 6D
 */

export interface CaseCategoryConfig {
  enumValue: string;
  label: string;
  subCategories: string[];
}

export const CASE_CATEGORIES: CaseCategoryConfig[] = [
  // D1 — RESUSCITATION (10)
  {
    enumValue: "RESUSCITATION",
    label: "Resuscitation",
    subCategories: [
      "Acute Airway Obstruction",
      "Anaphylaxis/ Anaphylactic Schock",
      "Unresponsive Patient",
      "Acute Respiratory Distress/ Respiratory Arrest",
      "Cardio-Respiratory Arrest",
      "Patient in shock Hemorrhage",
      "Patient in shock -- Hypovolemic",
      "Obstructive Shock",
      "Distributive Shock/ Septic Shock",
      "Choking Victim-adult pediatric",
    ],
  },

  // D2 — RESUSCITATION IN SPECIAL CIRCUMSTANCES (10)
  {
    enumValue: "RESUSCITATION_SPECIAL",
    label: "Resuscitation in Special Circumstances",
    subCategories: [
      "Cardio-respiratory arrest in Pregnant patient",
      "Neuroprotective Resuscitation",
      "Damage Control Resuscitation",
      "Massive Transfusion",
      "Abdominal Compartment Syndrome",
      "Morbidly obese patient",
      "Immunocompromised post-transplant patient",
      "Pain Assessment and Management",
      "Ascertaining brain death",
      "Care of a patient of organ donation",
    ],
  },

  // D3 — CARDIOVASCULAR EMERGENCIES (20)
  {
    enumValue: "CARDIOVASCULAR",
    label: "Cardiovascular Emergencies",
    subCategories: [
      "Case of Chest Pain",
      "Case of Breathlessness",
      "Case of Palpitations",
      "Case of transient loss of Consciousness",
      "Acute Coronary Syndrome (ACS)",
      "ACS with mechanical complications",
      "Acute Heart Failure",
      "Tachy-arrhythmia",
      "Brady arrhythmia",
      "Acute Pericarditis",
      "Cardiac Tamponade",
      "Valvular Heart Diseases",
      "Prosthetic Heart Valve Disease",
      "Acute Myocarditis",
      "Acute Rheumatic Fever",
      "Infective Endocarditis",
      "Hypertensive urgency & Emergencies",
      "Pacemaker related emergencies",
      "Pulmonary Embolism",
      "Patient with RV dysfunction",
    ],
  },

  // D4 — VASCULAR EMERGENCIES (5)
  {
    enumValue: "VASCULAR",
    label: "Vascular Emergencies",
    subCategories: [
      "Aortic Dissection",
      "Aortic Aneurysmal Disease",
      "Acute limb Ischemia",
      "Peripheral Vascular disease emergencies",
      "Deep vein thrombosis",
    ],
  },

  // D5 — RESPIRATORY EMERGENCIES (10)
  {
    enumValue: "RESPIRATORY",
    label: "Respiratory Emergencies",
    subCategories: [
      "Case of Dyspnoea/ Cough",
      "Case of Hemoptysis",
      "Acute Exacerbation of COPD",
      "Acute severe Asthma",
      "Respiratory failure/ ARDS",
      "Pneumonia & Chest infections",
      "Spontaneous Pneumothorax",
      "Pleural effusion/ Empyema",
      "Mediastinitis & causes",
      "Foreign body in respiratory tract",
    ],
  },

  // D6 — NEUROLOGICAL EMERGENCIES (20)
  {
    enumValue: "NEUROLOGICAL",
    label: "Neurological Emergencies",
    subCategories: [
      "Acute stroke -- anterior circulation",
      "Acute stroke -- posterior circulation",
      "Transient Ischemic attack",
      "CNS Hemorrhage",
      "Case of Seizure/ status epilepticus",
      "Case of headache",
      "Case of acute altered mental status/ coma",
      "Case of Vertigo/ Dizziness",
      "Case of cranial nerve palsy",
      "Meningitis/ Encephalitis",
      "Cavernous sinus thrombosis",
      "Case of ascending/ descending paralysis",
      "Compressive myelopathy",
      "Non-compressive myelopathy",
      "Myasthenia crisis",
      "Acute peripheral neuropathy/ Monopoiesis",
      "Parkinson's Disease/ other movement disorders",
      "Multiple Sclerosis",
      "CNS Tumours related emergencies",
      "VP shunt related emergencies",
    ],
  },

  // D7 — INFECTIOUS EMERGENCIES (20)
  {
    enumValue: "INFECTIOUS",
    label: "Infectious Emergencies",
    subCategories: [
      "Fever evaluation",
      "Tropical infections",
      "Patient with Sepsis/ Septic shock/ MODS",
      "Case of HIV infection",
      "Case of Tuberculosis",
      "Respiratory Infections",
      "Gastrointestinal Infections",
      "Varicella & Zoster",
      "Hemorrhage fever",
      "Acute viral hepatitis",
      "Tetanus",
      "Rabies",
      "Toxic shock Syndrome",
      "Gas gangrene & Anaerobic infections",
      "Skin & Soft tissue infections",
      "Parasitic infestations",
      "Sexually transmitted infections",
      "Needle stick injury",
      "Infections in Immunocompromised",
      "Hospital acquired infections",
    ],
  },

  // D8 — METABOLIC AND ENDOCRINE EMERGENCIES (15)
  {
    enumValue: "METABOLIC_ENDOCRINE",
    label: "Metabolic and Endocrine Emergencies",
    subCategories: [
      "Diabetic Emergencies- Hypoglycemia",
      "Diabetic Keto-acidosis",
      "Hyperosmolar-hyperglycemic coma",
      "Thyrotoxicosis",
      "Myxoedema Coma",
      "Adrenal Disorders",
      "Pituitary Disorders",
      "Diabetic foot and other diabetic complications",
      "Hyponatremia evaluation",
      "Hypernatremia evaluation",
      "Hypocalcemia",
      "Hypercalcemia",
      "Hyper/ Hypokalemia",
      "Acid-base disturbances",
      "Renal tubular acidosis",
    ],
  },

  // D9 — TOXICOLOGICAL & ENVIRONMENTAL EMERGENCIES (26)
  {
    enumValue: "TOXICOLOGICAL_ENVIRONMENTAL",
    label: "Toxicological & Environmental Emergencies",
    subCategories: [
      "Unknown toxin ingestion/ Toxidrome",
      "Insecticides & Pesticides",
      "Ethanol & other toxic alcohol",
      "Opioids",
      "Plant toxins",
      "Hydrocarbons & Kerosene poisoning",
      "Corrosive Ingestion",
      "Carbon Monoxide, Cyanide",
      "Methemoglobinemia",
      "Heavy metal toxicity",
      "Hazardous chemicals/ Industrial chemicals",
      "Prescription drug overdose",
      "Beta blocker/ Calcium channel blocker overdose",
      "Paracetamol overdose",
      "Serotonin Syndrome",
      "Neuroleptic Malignant Syndrome",
      "Battery Ingestion",
      "Snake Bite",
      "Scorpion Envenomation",
      "Bee sting/ other insect bite",
      "Animal Bite",
      "Heat Stroke/ Heat exhaustion",
      "Hypothermia/ Cold injuries/ Frost bite",
      "High altitude illness",
      "Diving related emergencies",
      "Drowning",
    ],
  },

  // D10 — HEMATOLOGICAL EMERGENCIES (10)
  {
    enumValue: "HEMATOLOGICAL",
    label: "Hematological Emergencies",
    subCategories: [
      "Case of Severe Anemia",
      "Thrombocytopenia/ Pancytopenia",
      "Bleeding Disorders/ Hemophilia",
      "Disseminated Intra vascular coagulation",
      "Bleeding in patients on anticoagulation",
      "Sickle cell disease/ crisis",
      "Transfusion reaction",
      "Acute Hematological malignancy",
      "Febrile Neutropenia",
      "Hematopoietic stem cell transplant patient",
    ],
  },

  // D11 — ONCOLOGY & PALLIATIVE CARE EMERGENCIES (10)
  {
    enumValue: "ONCOLOGY_PALLIATIVE",
    label: "Oncology & Palliative Care Emergencies",
    subCategories: [
      "Hyper leukocytosis syndrome",
      "Tumor lysis Syndrome",
      "Superior Venacava Syndrome",
      "Acute upper airway obstruction in oncology",
      "Acute tumor bleeding",
      "Tumor related Cord compression",
      "Metastatic emergencies/ SIADH/ Hypercalcemia",
      "Advanced malignancy- discussing goals of care",
      "Provision of palliative care in EM",
      "End of life care/ care of dying patient",
    ],
  },

  // D12 — PSYCHIATRIC & PSYCHO-SOCIAL EMERGENCIES (10)
  {
    enumValue: "PSYCHIATRIC_PSYCHOSOCIAL",
    label: "Psychiatric & Psycho-Social Emergencies",
    subCategories: [
      "Acute agitated/ Violent patient in ED",
      "Anxiety & Somatoform disorders",
      "Delirium/ Psychosis",
      "Deliberate self-harm/ Suicide",
      "Alcohol substance use/ I V Drug abuse",
      "Acute psychosis -- Bipolar/ Schizophrenia",
      "Thought & mood disorders/ Depression",
      "Eating disorders",
      "Intimate partner violence/ Sexual abuse",
      "Trans-gender patient",
    ],
  },

  // D13 — GERIATRIC EMERGENCIES (8)
  {
    enumValue: "GERIATRIC",
    label: "Geriatric Emergencies",
    subCategories: [
      "Compressive geriatric assessment",
      "Dementia/ Delirium",
      "Evaluation of falls in elderly",
      "Mobility assessment in elderly",
      "Acute confusion in elderly",
      "Polypharmacy",
      "Fragility fractures/ Osteoporosis",
      "Elder abuse",
    ],
  },

  // D14 — DERMATOLOGICAL EMERGENCIES (10)
  {
    enumValue: "DERMATOLOGICAL",
    label: "Dermatological Emergencies",
    subCategories: [
      "Urticaria/ Eczema",
      "Cutaneous drug reaction/ DRESS",
      "Steven Johnson Syndrome",
      "Toxic Epidermal Necrolysis",
      "Bullous disorders of skin",
      "Skin manifestation of Systemic illness",
      "Exanthemas/ Purpuric rash",
      "Skin & Soft tissue infections",
      "Male/ Female genital lesions",
      "Pressure sores",
    ],
  },

  // D15 — RHEUMATOLOGICAL & NON-TRAUMATIC ORTHOPEDIC EMERGENCIES (20)
  {
    enumValue: "RHEUMATOLOGICAL_ORTHOPEDIC",
    label: "Rheumatological & Non-Traumatic Orthopedic Emergencies",
    subCategories: [
      "Acute Vasculitis",
      "Anti- Phospholipid Antibody Syndrome",
      "Kawasaki Disease",
      "Rheumatological disease of vital organs",
      "Immune therapy related emergencies",
      "Acute neck pain",
      "Acute back pain",
      "Spinal infections",
      "Spinal epidural abscess/ hematoma",
      "Cauda equina syndrome & differentials",
      "Acute joint pain & swelling",
      "Acute osteomyelitis",
      "Septic arthritis",
      "Crystal arthropathy/ Gour",
      "Limb pain & swelling/ Tumor",
      "Nerve palsy- Upper limb",
      "Nerve palsy- lower limb",
      "Hand & foot space infection",
      "Bursitis/ Enthesitis",
      "Prosthesis related emergencies",
    ],
  },

  // D16 — EMERGENCIES IN NEPHROLOGY & UROLOGY (16)
  {
    enumValue: "NEPHROLOGY_UROLOGY",
    label: "Emergencies in Nephrology & Urology",
    subCategories: [
      "Acute Kidney injury",
      "Chronic Kidney disease complications",
      "Urinary tract infections",
      "Acute prostatitis",
      "Acute pyelonephritis/ perinephric abscess",
      "Post-renal transplant patient",
      "Case of Hematuria",
      "Acute urinary retention",
      "Nephrolithiasis",
      "Obstructive Uropathy",
      "Acute scrotal/ testicular pain",
      "Torsion testes",
      "Phimosis/ paraphimosis",
      "Priapism",
      "Injury to bladder/ urethra/ testes/ penis",
      "Sexually transmitted infections",
    ],
  },

  // D17 — GASTROENTEROLOGY & HEPATIC EMERGENCIES (10)
  {
    enumValue: "GASTROENTEROLOGY_HEPATIC",
    label: "Gastroenterology & Hepatic Emergencies",
    subCategories: [
      "Hepatitis/ Acute Liver failure",
      "Emergencies in Chronic liver disease",
      "Alcoholic Liver disease",
      "Upper GI Bleed- Variceal/ Non Variceal",
      "Lower GI Bleed",
      "Inflammatory Bowel disease",
      "Liver Abscess/ Abdominal infections",
      "Acute pancreatitis",
      "Acute Cholangitis",
      "Non-surgical causes of pain abdomen",
    ],
  },

  // D18 — SURGICAL EMERGENCIES (10)
  {
    enumValue: "SURGICAL",
    label: "Surgical Emergencies",
    subCategories: [
      "Pain abdomen -- Bowel obstruction/ Volvulus",
      "Pain abdomen -- Surgical Perforation peritonitis",
      "Pain abdomen- cholecystitis/ appendices",
      "Mesenteric Ischemia",
      "Abdominal distension/ mass",
      "GI Malignancy related emergencies",
      "Hernia related emergencies",
      "Ano-rectal abscess",
      "Rectal prolapse",
      "Cellulitis/ Necrotizing Fasciitis",
    ],
  },

  // D19 — OBSTETRICS & GYNAECOLOGICAL EMERGENCIES (18)
  {
    enumValue: "OBSTETRICS_GYNECOLOGICAL",
    label: "Obstetrics & Gynaecological Emergencies",
    subCategories: [
      "Case of lower abdominal pain",
      "Vaginal bleeding -- non-pregnant female",
      "Vaginal bleeding -- pregnant female",
      "Ectopic pregnancy",
      "Abortion",
      "Antepartum hemorrhage",
      "Pre-eclampsia/ Eclampsia",
      "HELLP",
      "Patient in labour",
      "Hyperemesis Gravidarum",
      "Exposure to infections in pregnancy",
      "Post-partum hemorrhage",
      "Puerperal Sepsis",
      "Vaginal discharge/ Pelvic Infections/ STI",
      "Emergency contraception",
      "Female genital injury/ foreign body",
      "Ovarian Hyper stimulation Syndrome",
      "Gynecologic malignancy emergency",
    ],
  },

  // D20 — ENT EMERGENCIES (10)
  {
    enumValue: "ENT",
    label: "ENT Emergencies",
    subCategories: [
      "Upper airway obstruction/ stridor",
      "Epistaxia",
      "Acute throat pain-evaluation",
      "Foreign body ENT",
      "Acute ear pain/ discharge/ ASOM/CSOM",
      "Acute hearing loss/ Vertigo",
      "Acute sinusitis",
      "Tracheostomy emergencies",
      "Isolated facial palsy",
      "Salivary gland diseases",
    ],
  },

  // D21 — OCULAR EMERGENCIES (10)
  {
    enumValue: "OCULAR",
    label: "Ocular Emergencies",
    subCategories: [
      "Acute Red Eye",
      "Painful loss of vision",
      "Painless loss of vision",
      "Orbital cellulitis",
      "Foreign body -- eye",
      "Blunt ocular trauma",
      "Penetrating ocular trauma",
      "Chemical injury to eye",
      "Acute glaucoma",
      "Case of acute diplopia",
    ],
  },

  // D22 — TRAUMA (30)
  {
    enumValue: "TRAUMA",
    label: "Trauma",
    subCategories: [
      "Evaluation & Resuscitation of Trauma patients",
      "Head injury- minor",
      "Head injury- moderate to severe",
      "Neck injury- blunt/ penetrating",
      "Blunt thoracic trauma",
      "Penetrating thoracic trauma",
      "Blunt abdominal trauma",
      "Penetrating abdominal trauma",
      "Pelvic injury -- male",
      "Pelvic injury- female",
      "Spine injury",
      "Maxillofacial injury",
      "Major Vascular injury",
      "Joint Injury",
      "Extremity Trauma -- upper limb",
      "Extremity Trauma -- lower limb",
      "Compartment syndrome",
      "Burns/ Inhalational injury",
      "Electrical burns",
      "Blast injuries",
      "Hand injuries",
      "Amputated digit/limb",
      "Other soft-tissues/ Musculo-tendinous injury",
      "Trauma in elderly",
      "Trauma Pregnancy",
      "Pediatric Trauma",
      "Fat embolism",
      "Dental injuries",
      "Traumatic cardiac arrest- blunt trauma",
      "Traumatic cardiac arrest- penetrating trauma",
    ],
  },

  // D23 — EMERGENCIES: FORENSIC ASPECTS AND DISASTER (10)
  {
    enumValue: "FORENSIC_DISASTER",
    label: "Emergencies: Forensic Aspects and Disaster",
    subCategories: [
      "Medico-legal examinations",
      "Wound examinations/ Grievous injury",
      "Brought dead patient/ Signs of death",
      "Hanging",
      "Homicidal injuries",
      "Case of bullet injury",
      "Examination of victim & accused of Rape",
      "Medical responses to terrorist incident",
      "CBRN Event",
      "Mass gathering related emergency",
    ],
  },

  // D24 — PEDIATRIC EMERGENCIES (30)
  {
    enumValue: "PEDIATRIC",
    label: "Pediatric Emergencies",
    subCategories: [
      "Assessment & care of new-born",
      "Neonatal resuscitations",
      "Care of preterm new-born",
      "Neonatal sepsis",
      "Neonatal jaundice",
      "Assessment of a sick child/ Child in shock",
      "Pediatric cardio-respiratory arrest",
      "Fever in children",
      "Croup/epiglottitis/ upper airway infections",
      "LRTI/ Pneumonia",
      "Asthma/ Bronchiolitis",
      "Foreign body ingestion",
      "Childhood exanthems",
      "Sepsis in children",
      "Gastro-enteritis/ Dehydration",
      "Meningitis/ encephalitis/ CNS infections",
      "Seizure in a child",
      "Cyanotic congenital heart diseases",
      "Acyanotic congenital heart diseases",
      "Pain abdomen in children",
      "Surgical abdomen in children",
      "Pediatric DKA",
      "Unconscious child",
      "Child with poisoning/ Toxin ingestion",
      "Evaluation of a child with incessant crying",
      "Child with failure to thrive/ malnutrition",
      "Limping child/ Painful limb",
      "Pediatric procedural sedation",
      "BRUE/SUDIC (ALTE/SIDS)",
      "Child abuse- physical/sexual",
    ],
  },
] as const;

// ======================== HELPERS ========================

/** Map of enum value → display label */
export const CASE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CASE_CATEGORIES.map((cat) => [cat.enumValue, cat.label]),
);

/** Get sub-categories for a given category enum value */
export function getSubCategories(categoryEnum: string): string[] {
  const category = CASE_CATEGORIES.find((c) => c.enumValue === categoryEnum);
  return category?.subCategories ?? [];
}

/** Total sub-types count (should be 308) */
export const TOTAL_CASE_SUB_TYPES = CASE_CATEGORIES.reduce(
  (sum, cat) => sum + cat.subCategories.length,
  0,
);

/** Convert enum value to URL-safe slug (lowercase, hyphens) */
export function categoryEnumToSlug(enumValue: string): string {
  return enumValue.toLowerCase().replace(/_/g, "-");
}

/** Convert URL slug back to enum value (uppercase, underscores) */
export function categorySlugToEnum(slug: string): string | undefined {
  const enumValue = slug.toUpperCase().replace(/-/g, "_");
  const exists = CASE_CATEGORIES.find((c) => c.enumValue === enumValue);
  return exists ? enumValue : undefined;
}

/** Find a category config by slug */
export function getCategoryBySlug(slug: string): CaseCategoryConfig | undefined {
  const enumValue = categorySlugToEnum(slug);
  if (!enumValue) return undefined;
  return CASE_CATEGORIES.find((c) => c.enumValue === enumValue);
}

/** Get sub-category options formatted for form selects */
export function getSubCategoryOptions(categoryEnum: string): { value: string; label: string }[] {
  return getSubCategories(categoryEnum).map((sc) => ({ value: sc, label: sc }));
}
