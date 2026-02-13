/**
 * @module Constants Index
 * @description Central export for all constants.
 * Import from "@/lib/constants" in components.
 */

export {
	ROTATION_POSTINGS,
	CORE_ROTATION_NAMES,
	ELECTIVE_ROTATION_NAMES,
	ALL_ROTATION_NAMES,
	type RotationPostingConfig,
} from "./rotation-postings";

export {
	CASE_CATEGORIES,
	CASE_CATEGORY_LABELS,
	getSubCategories,
	TOTAL_CASE_SUB_TYPES,
	type CaseCategoryConfig,
} from "./case-categories";

export {
	PROCEDURE_CATEGORIES,
	PROCEDURE_CATEGORY_LABELS,
	CPR_PROCEDURE_CATEGORIES,
	procedureEnumToSlug,
	procedureSlugToEnum,
	getProcedureBySlug,
	isCprCategory,
	getSkillLevelOptions,
	type ProcedureCategoryConfig,
} from "./procedure-categories";

export {
	CLINICAL_SKILLS_ADULT,
	CLINICAL_SKILLS_PEDIATRIC,
	CONFIDENCE_LEVELS,
	type ClinicalSkillConfig,
} from "./clinical-skills";

export {
	ABG_ANALYSIS_SKILLS,
	ECG_ANALYSIS_SKILLS,
	OTHER_DIAGNOSTIC_SKILLS,
	DIAGNOSTIC_SKILLS,
	DIAGNOSTIC_SKILLS_BY_CATEGORY,
	DIAGNOSTIC_CATEGORY_LABELS,
	diagnosticEnumToSlug,
	diagnosticSlugToEnum,
	getDiagnosticBySlug,
	CONFIDENCE_LEVEL_OPTIONS,
	CONFIDENCE_LEVEL_LABELS,
	type DiagnosticSkillConfig,
} from "./diagnostic-types";

export {
	IMAGING_CATEGORIES,
	IMAGING_CATEGORY_LABELS,
	imagingEnumToSlug,
	imagingSlugToEnum,
	getImagingBySlug,
	type ImagingCategoryConfig,
} from "./imaging-categories";

export {
	ENTRY_STATUS_OPTIONS,
	ENTRY_STATUS_COLORS,
	COMPETENCY_LEVELS,
	SKILL_LEVELS,
	CPR_SKILL_LEVELS,
	PATIENT_CATEGORIES,
	SEX_OPTIONS,
	SEMESTERS,
	DAYS_OF_WEEK,
	EVALUATION_DOMAINS,
	TRAINING_MENTORING_SCORES,
	APP_NAME,
	APP_SHORT_NAME,
	INSTITUTION_NAME,
	DEPARTMENT_NAME,
} from "./entry-status";

export {
	COURSE_ATTENDED_FIELDS,
	CONFERENCE_PARTICIPATION_FIELDS,
	RESEARCH_ACTIVITY_FIELDS,
	DISASTER_DRILL_FIELDS,
	QUALITY_IMPROVEMENT_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "./professional-fields";

export {
	SKILL_LEVEL_OPTIONS_SOAPI,
	SKILL_LEVEL_LABELS_SOAPI,
	TRANSPORT_LOG_FIELDS,
	CONSENT_LOG_FIELDS,
	BAD_NEWS_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "./other-logs-fields";
