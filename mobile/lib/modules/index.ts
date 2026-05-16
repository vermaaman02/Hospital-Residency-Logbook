/**
 * Module config registry.
 * Each entry maps a URL slug to display config and field adapters
 * so the generic entry list/form/detail screens know how to render each module.
 */

export interface ModuleConfig {
	label: string;
	apiPath: string;
	hasImages?: boolean;
	hasPatientInfo?: boolean;
	hasAttachments?: boolean;
	getTitle: (item: Record<string, unknown>) => string;
	getSubtitle?: (item: Record<string, unknown>) => string | undefined;
}

const MODULES: Record<string, ModuleConfig> = {
	"case-presentations": {
		label: "Case Presentations",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) =>
			String(i.diagnosis ?? i.chiefComplaint ?? i.title ?? "Case Presentation"),
		getSubtitle: (i) =>
			i.patientAge ? `Age: ${i.patientAge} · ${i.patientSex ?? ""}` : undefined,
	},
	"seminar-discussions": {
		label: "Seminar / EBM Discussions",
		apiPath: "case-management",
		getTitle: (i) => String(i.topic ?? i.title ?? "Seminar"),
	},
	"journal-clubs": {
		label: "Journal Clubs",
		apiPath: "case-management",
		getTitle: (i) => String(i.journalTitle ?? i.title ?? "Journal Club"),
		getSubtitle: (i) => i.author ? String(i.author) : undefined,
	},
	"clinical-skills": {
		label: "Clinical Skills",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) => String(i.skillName ?? i.procedure ?? "Clinical Skill"),
		getSubtitle: (i) => i.confidenceLevel ? `Confidence: ${i.confidenceLevel}` : undefined,
	},
	"case-management": {
		label: "Case Management",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) => String(i.diagnosis ?? i.category ?? "Case Management"),
		getSubtitle: (i) => i.subCategory ? String(i.subCategory) : undefined,
	},
	"procedure-logs": {
		label: "Procedure Logs",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) => String(i.procedureName ?? i.procedure ?? "Procedure"),
		getSubtitle: (i) => i.skillLevel ? `Skill: ${i.skillLevel}` : undefined,
	},
	"diagnostic-skills": {
		label: "Diagnostic Skills",
		apiPath: "case-management",
		hasImages: true,
		hasPatientInfo: true,
		getTitle: (i) => String(i.testName ?? i.skill ?? "Diagnostic Skill"),
	},
	"imaging-logs": {
		label: "Imaging Logs",
		apiPath: "case-management",
		hasImages: true,
		hasPatientInfo: true,
		getTitle: (i) => String(i.imagingType ?? i.modality ?? "Imaging"),
		getSubtitle: (i) => i.findings ? String(i.findings).slice(0, 60) : undefined,
	},
	"transport-logs": {
		label: "Transport Logs",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) => String(i.transportType ?? "Transport"),
	},
	"consent-logs": {
		label: "Consent / Communication",
		apiPath: "case-management",
		hasPatientInfo: true,
		getTitle: (i) => String(i.consentType ?? i.communicationType ?? "Consent"),
	},
	"life-support-courses": {
		label: "Life-Support Courses",
		apiPath: "case-management",
		getTitle: (i) => String(i.courseName ?? i.course ?? "Life-Support Course"),
		getSubtitle: (i) => i.certificationBody ? String(i.certificationBody) : undefined,
	},
	conferences: {
		label: "Conferences",
		apiPath: "case-management",
		getTitle: (i) => String(i.conferenceName ?? i.title ?? "Conference"),
		getSubtitle: (i) => i.role ? String(i.role) : undefined,
	},
	"research-activities": {
		label: "Research Activities",
		apiPath: "case-management",
		getTitle: (i) => String(i.projectTitle ?? i.title ?? "Research"),
		getSubtitle: (i) => i.researchType ? String(i.researchType) : undefined,
	},
	"disaster-drills": {
		label: "Disaster Drills",
		apiPath: "case-management",
		getTitle: (i) => String(i.drillType ?? i.title ?? "Disaster Drill"),
		getSubtitle: (i) => i.venue ? String(i.venue) : undefined,
	},
	"quality-improvement": {
		label: "Quality Improvement",
		apiPath: "case-management",
		getTitle: (i) => String(i.projectTitle ?? i.title ?? "QI Project"),
		getSubtitle: (i) => i.department ? String(i.department) : undefined,
	},
	"logbook-reviews": {
		label: "Logbook Reviews",
		apiPath: "logbook-reviews",
		getTitle: (i) => String(i.topic ?? i.title ?? "Logbook Review"),
		getSubtitle: (i) => i.reviewerName ? `Reviewer: ${i.reviewerName}` : undefined,
	},
	"rotation-postings": {
		label: "Rotation Postings",
		apiPath: "rotation-postings",
		hasAttachments: true,
		getTitle: (i) => String(i.rotationName ?? i.department ?? "Rotation Posting"),
		getSubtitle: (i) => {
			const start = i.startDate ? new Date(String(i.startDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
			const end = i.endDate ? new Date(String(i.endDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
			return start && end ? `${start} – ${end}` : undefined;
		},
	},
	thesis: {
		label: "Thesis",
		apiPath: "case-management",
		getTitle: (i) => String(i.title ?? i.thesisTitle ?? "Thesis"),
		getSubtitle: (i) => i.semester ? `Semester ${i.semester}` : undefined,
	},
};

export function getModuleConfig(slug: string): ModuleConfig {
	return (
		MODULES[slug] ?? {
			label: slug,
			apiPath: slug,
			getTitle: (i) => String(i.id ?? "Entry"),
		}
	);
}

export function getAllModules(): Array<{ slug: string } & ModuleConfig> {
	return Object.entries(MODULES).map(([slug, cfg]) => ({ slug, ...cfg }));
}
