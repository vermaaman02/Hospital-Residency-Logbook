/**
 * Module form registry.
 * Each form component renders the field set for one logbook module.
 * All use react-hook-form control passed from the generic form screen.
 */

import { View, Text, StyleSheet } from "react-native";
import { FormField } from "@/components/forms/FormField";
import { SelectPicker } from "@/components/forms/SelectPicker";
import { PatientInfoFields } from "@/components/forms/PatientInfoFields";
import { CloudinaryUploadRN } from "@/components/forms/CloudinaryUploadRN";
import { useWatch } from "react-hook-form";
import type { ModuleFormProps, ModuleFormComponent } from "./types";
import { CASE_CATEGORIES, getSubCategories } from "@logbook/shared/constants/case-categories";
import { CLINICAL_SKILLS_ADULT, CLINICAL_SKILLS_PEDIATRIC, CONFIDENCE_LEVELS, type ClinicalSkillConfig } from "@logbook/shared/constants/clinical-skills";
import { DIAGNOSTIC_SKILLS } from "@logbook/shared/constants/diagnostic-types";
import { IMAGING_CATEGORIES } from "@logbook/shared/constants/imaging-categories";
import { COMPETENCY_LEVELS, SKILL_LEVELS } from "@logbook/shared/constants/entry-status";
import { PROCEDURE_CATEGORIES } from "@logbook/shared/constants/procedure-categories";
import { ALL_ROTATION_NAMES } from "@logbook/shared/constants/rotation-postings";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toOptions(arr: readonly string[]): { label: string; value: string }[] {
	return arr.map((v) => ({ label: v, value: v }));
}

function toObjOptions<T extends { label?: string; name?: string; value?: string; enumValue?: string; slug?: string }>(
	arr: T[],
): { label: string; value: string }[] {
	return arr.map((item) => ({
		label: item.label ?? item.name ?? "",
		value: item.value ?? item.enumValue ?? item.slug ?? item.label ?? item.name ?? "",
	}));
}

function SectionHeading({ label }: { label: string }) {
	return <Text style={styles.section}>{label}</Text>;
}

// ─── 1. Case Presentations ───────────────────────────────────────────────────

export function CasePresentationsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Case Details" />
			<FormField control={control} name="chiefComplaint" label="Chief Complaint" placeholder="Main presenting complaint" error={(errors.chiefComplaint as { message?: string } | undefined)?.message} multiline numberOfLines={2} />
			<FormField control={control} name="diagnosis" label="Diagnosis" placeholder="Final diagnosis" error={(errors.diagnosis as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="competencyLevel" label="Competency Level" options={COMPETENCY_LEVELS.map((c) => ({ label: c.label, value: c.value }))} error={(errors.competencyLevel as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 2. Seminar / EBM ────────────────────────────────────────────────────────

export function SeminarForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="topic" label="Topic" placeholder="Seminar / EBM topic" error={(errors.topic as { message?: string } | undefined)?.message} />
			<FormField control={control} name="presenter" label="Presenter" placeholder="Who presented?" error={(errors.presenter as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="summary" label="Summary / Remarks" placeholder="Key learning points…" multiline numberOfLines={4} error={(errors.summary as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 3. Journal Clubs ────────────────────────────────────────────────────────

export function JournalClubForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="journalTitle" label="Journal Title" placeholder="e.g. NEJM, Lancet" error={(errors.journalTitle as { message?: string } | undefined)?.message} />
			<FormField control={control} name="articleTitle" label="Article Title" placeholder="Paper title" error={(errors.articleTitle as { message?: string } | undefined)?.message} />
			<FormField control={control} name="author" label="First Author" placeholder="e.g. Smith et al." error={(errors.author as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="summary" label="Critical Appraisal / Remarks" placeholder="Your notes…" multiline numberOfLines={4} error={(errors.summary as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 4 & 5. Clinical Skills (Adult / Pediatric) ───────────────────────────────

function ClinicalSkillsFormBase({
	control,
	errors,
	skills,
}: ModuleFormProps & { skills: readonly ClinicalSkillConfig[] }) {
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Skill Details" />
			<SelectPicker
				control={control}
				name="skillName"
				label="Clinical Skill"
				options={skills.map((s) => ({ label: s.name, value: s.name }))}
				searchable
				error={(errors.skillName as { message?: string } | undefined)?.message}
			/>
			<SelectPicker
				control={control}
				name="confidenceLevel"
				label="Confidence Level"
				options={CONFIDENCE_LEVELS.map((c) => ({ label: c.label, value: c.value }))}
				error={(errors.confidenceLevel as { message?: string } | undefined)?.message}
			/>
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="remarks" label="Remarks" placeholder="Additional notes…" multiline numberOfLines={3} error={(errors.remarks as { message?: string } | undefined)?.message} />
		</View>
	);
}

export function ClinicalSkillsAdultForm({ control, errors }: ModuleFormProps) {
	return <ClinicalSkillsFormBase control={control} errors={errors} skills={CLINICAL_SKILLS_ADULT} />;
}

export function ClinicalSkillsPediatricForm({ control, errors }: ModuleFormProps) {
	return <ClinicalSkillsFormBase control={control} errors={errors} skills={CLINICAL_SKILLS_PEDIATRIC} />;
}

// ─── 6. Case Management ──────────────────────────────────────────────────────

export function CaseManagementForm({ control, errors }: ModuleFormProps) {
	const selectedCategory = useWatch({ control, name: "category" }) as string | undefined;
	const subCats = selectedCategory ? CASE_CATEGORIES.find((cat) => cat.enumValue === selectedCategory)?.subCategories ?? [] : [];

	const catOptions = CASE_CATEGORIES.map((cat) => ({ label: cat.label, value: cat.enumValue }));

	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Case Details" />
			<SelectPicker control={control} name="category" label="Category" options={catOptions} searchable error={(errors.category as { message?: string } | undefined)?.message} />
			{(subCats as string[]).length > 0 && (
				<SelectPicker
					control={control}
					name="caseSubCategory"
					label="Sub-Category"
					options={toOptions(subCats as string[])}
					searchable
					error={(errors.caseSubCategory as { message?: string } | undefined)?.message}
				/>
			)}
			<FormField control={control} name="completeDiagnosis" label="Complete Diagnosis" placeholder="Full diagnosis" multiline numberOfLines={2} error={(errors.completeDiagnosis as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="competencyLevel" label="Competency Level" options={COMPETENCY_LEVELS.map((c) => ({ label: c.label, value: c.value }))} error={(errors.competencyLevel as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 7. Procedure Logs ───────────────────────────────────────────────────────

export function ProcedureLogsForm({ control, errors }: ModuleFormProps) {
	const allProcedures = PROCEDURE_CATEGORIES.map((cat) => ({ label: cat.label, value: cat.enumValue }));
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Procedure Details" />
			<SelectPicker
				control={control}
				name="procedureName"
				label="Procedure"
				options={allProcedures}
				searchable
				error={(errors.procedureName as { message?: string } | undefined)?.message}
			/>
			<SelectPicker
				control={control}
				name="skillLevel"
				label="Skill Level"
				options={SKILL_LEVELS.map((s) => ({ label: s.label, value: s.value }))}
				error={(errors.skillLevel as { message?: string } | undefined)?.message}
			/>
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="remarks" label="Remarks" placeholder="Notes…" multiline numberOfLines={3} error={(errors.remarks as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 8. Diagnostic Skills ────────────────────────────────────────────────────

export function DiagnosticSkillsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Skill Details" />
			<SelectPicker
				control={control}
				name="skillName"
				label="Diagnostic Skill"
				options={DIAGNOSTIC_SKILLS.map((s) => ({ label: s.name, value: s.name }))}
				searchable
				error={(errors.skillName as { message?: string } | undefined)?.message}
			/>
			<SelectPicker
				control={control}
				name="confidenceLevel"
				label="Confidence Level"
				options={CONFIDENCE_LEVELS.map((c) => ({ label: c.label, value: c.value }))}
				error={(errors.confidenceLevel as { message?: string } | undefined)?.message}
			/>
			<FormField control={control} name="findings" label="Findings" placeholder="Describe the findings…" multiline numberOfLines={3} error={(errors.findings as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 9. Imaging Logs ─────────────────────────────────────────────────────────

export function ImagingLogsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Imaging Details" />
			<SelectPicker
				control={control}
				name="imagingType"
				label="Imaging Type"
				options={IMAGING_CATEGORIES.map((i) => ({ label: i.label, value: i.enumValue }))}
				searchable
				error={(errors.imagingType as { message?: string } | undefined)?.message}
			/>
			<SelectPicker
				control={control}
				name="confidenceLevel"
				label="Confidence Level"
				options={CONFIDENCE_LEVELS.map((c) => ({ label: c.label, value: c.value }))}
				error={(errors.confidenceLevel as { message?: string } | undefined)?.message}
			/>
			<FormField control={control} name="findings" label="Findings" placeholder="Radiological findings…" multiline numberOfLines={3} error={(errors.findings as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 10. Transport Logs ───────────────────────────────────────────────────────

export function TransportLogsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<PatientInfoFields control={control} errors={errors as Record<string, { message?: string }>} />
			<SectionHeading label="Transport Details" />
			<SelectPicker control={control} name="transportType" label="Transport Type" options={[{ label: "ICU Transfer", value: "ICU Transfer" }, { label: "Inter-Hospital", value: "Inter-Hospital" }, { label: "Emergency", value: "Emergency" }, { label: "Other", value: "Other" }]} error={(errors.transportType as { message?: string } | undefined)?.message} />
			<FormField control={control} name="from" label="From" placeholder="Origin location" error={(errors.from as { message?: string } | undefined)?.message} />
			<FormField control={control} name="to" label="To" placeholder="Destination" error={(errors.to as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="remarks" label="Remarks" placeholder="Clinical notes…" multiline numberOfLines={3} error={(errors.remarks as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 11. Life-Support Courses ─────────────────────────────────────────────────

export function LifeSupportCoursesForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="courseName" label="Course Name" placeholder="e.g. BLS, ACLS, PALS" error={(errors.courseName as { message?: string } | undefined)?.message} />
			<FormField control={control} name="certificationBody" label="Certification Body" placeholder="e.g. AHA, NRC" error={(errors.certificationBody as { message?: string } | undefined)?.message} />
			<FormField control={control} name="venue" label="Venue" placeholder="Where was it held?" error={(errors.venue as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 12. Conferences ──────────────────────────────────────────────────────────

export function ConferencesForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="conferenceName" label="Conference Name" placeholder="e.g. ISCCM Annual Conference" error={(errors.conferenceName as { message?: string } | undefined)?.message} />
			<FormField control={control} name="topic" label="Topic / Paper Title" placeholder="Title of presentation or attended session" error={(errors.topic as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="role" label="Role" options={[{ label: "Presenter", value: "Presenter" }, { label: "Attendee", value: "Attendee" }, { label: "Chairperson", value: "Chairperson" }, { label: "Organizer", value: "Organizer" }]} error={(errors.role as { message?: string } | undefined)?.message} />
			<FormField control={control} name="venue" label="Venue / City" placeholder="e.g. New Delhi" error={(errors.venue as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 13. Research Activities ──────────────────────────────────────────────────

export function ResearchActivitiesForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="projectTitle" label="Project / Paper Title" placeholder="Title of research" error={(errors.projectTitle as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="researchType" label="Type" options={[{ label: "Case Report", value: "Case Report" }, { label: "Cohort Study", value: "Cohort Study" }, { label: "RCT", value: "RCT" }, { label: "Review Article", value: "Review Article" }, { label: "Audit", value: "Audit" }, { label: "Other", value: "Other" }]} error={(errors.researchType as { message?: string } | undefined)?.message} />
			<FormField control={control} name="journalOrConference" label="Journal / Conference" placeholder="Where was it submitted/published?" error={(errors.journalOrConference as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="status" label="Status" options={[{ label: "Ongoing", value: "Ongoing" }, { label: "Submitted", value: "Submitted" }, { label: "Published", value: "Published" }]} error={(errors.status as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 14. Disaster Drills ─────────────────────────────────────────────────────

export function DisasterDrillsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="drillType" label="Drill Type" placeholder="e.g. Mass Casualty, Fire Drill" error={(errors.drillType as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="role" label="Role" options={[{ label: "Participant", value: "Participant" }, { label: "Team Leader", value: "Team Leader" }, { label: "Organizer", value: "Organizer" }]} error={(errors.role as { message?: string } | undefined)?.message} />
			<FormField control={control} name="venue" label="Venue" placeholder="Where was the drill held?" error={(errors.venue as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="remarks" label="Remarks" placeholder="Key learnings…" multiline numberOfLines={3} error={(errors.remarks as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 15. Quality Improvement ─────────────────────────────────────────────────

export function QualityImprovementForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="projectTitle" label="QI Project Title" placeholder="Title" error={(errors.projectTitle as { message?: string } | undefined)?.message} />
			<FormField control={control} name="department" label="Department" placeholder="e.g. ICU, Emergency" error={(errors.department as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="role" label="Role" options={[{ label: "PI", value: "PI" }, { label: "Co-investigator", value: "Co-investigator" }, { label: "Team Member", value: "Team Member" }]} error={(errors.role as { message?: string } | undefined)?.message} />
			<FormField control={control} name="problem" label="Problem Statement" placeholder="What problem does this project address?" multiline numberOfLines={3} error={(errors.problem as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 16. Logbook Reviews ─────────────────────────────────────────────────────

export function LogbookReviewsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="topic" label="Review Topic" placeholder="Topic discussed" error={(errors.topic as { message?: string } | undefined)?.message} />
			<FormField control={control} name="reviewerName" label="Reviewer Name" placeholder="Supervising faculty" error={(errors.reviewerName as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
			<FormField control={control} name="feedback" label="Feedback / Remarks" placeholder="Summary of review…" multiline numberOfLines={4} error={(errors.feedback as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 17. Rotation Postings ───────────────────────────────────────────────────

export function RotationPostingsForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<SelectPicker
				control={control}
				name="rotationName"
				label="Rotation / Department"
				options={toOptions(ALL_ROTATION_NAMES as readonly string[])}
				searchable
				error={(errors.rotationName as { message?: string } | undefined)?.message}
			/>
			<FormField control={control} name="startDate" label="Start Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-01" error={(errors.startDate as { message?: string } | undefined)?.message} />
			<FormField control={control} name="endDate" label="End Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-31" error={(errors.endDate as { message?: string } | undefined)?.message} />
			<FormField control={control} name="totalDuration" label="Total Duration (weeks)" placeholder="e.g. 4" keyboardType="number-pad" error={(errors.totalDuration as { message?: string } | undefined)?.message} />
			<FormField control={control} name="remarks" label="Remarks" placeholder="Additional notes…" multiline numberOfLines={3} error={(errors.remarks as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── 18. Thesis ──────────────────────────────────────────────────────────────

export function ThesisForm({ control, errors }: ModuleFormProps) {
	return (
		<View style={styles.form}>
			<FormField control={control} name="title" label="Thesis Title" placeholder="Full title of thesis" error={(errors.title as { message?: string } | undefined)?.message} />
			<FormField control={control} name="guide" label="Guide / Supervisor" placeholder="Dr. Name" error={(errors.guide as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="semester" label="Semester" options={[1, 2, 3, 4, 5, 6].map((s) => ({ label: `Semester ${s}`, value: String(s) }))} error={(errors.semester as { message?: string } | undefined)?.message} />
			<SelectPicker control={control} name="stage" label="Stage" options={[{ label: "Protocol Submitted", value: "Protocol Submitted" }, { label: "Data Collection", value: "Data Collection" }, { label: "Analysis", value: "Analysis" }, { label: "Writing", value: "Writing" }, { label: "Submitted", value: "Submitted" }]} error={(errors.stage as { message?: string } | undefined)?.message} />
			<FormField control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="e.g. 2025-01-15" error={(errors.date as { message?: string } | undefined)?.message} />
		</View>
	);
}

// ─── Registry ────────────────────────────────────────────────────────────────

const FORM_REGISTRY: Record<string, ModuleFormComponent> = {
	"case-presentations":   CasePresentationsForm,
	"seminar-discussions":  SeminarForm,
	"journal-clubs":        JournalClubForm,
	"clinical-skills":      ClinicalSkillsAdultForm,
	"clinical-skills-adult":ClinicalSkillsAdultForm,
	"clinical-skills-pediatric": ClinicalSkillsPediatricForm,
	"case-management":      CaseManagementForm,
	"procedure-logs":       ProcedureLogsForm,
	"diagnostic-skills":    DiagnosticSkillsForm,
	"imaging-logs":         ImagingLogsForm,
	"transport-logs":       TransportLogsForm,
	"consent-logs":         TransportLogsForm,
	"life-support-courses": LifeSupportCoursesForm,
	conferences:            ConferencesForm,
	"research-activities":  ResearchActivitiesForm,
	"disaster-drills":      DisasterDrillsForm,
	"quality-improvement":  QualityImprovementForm,
	"logbook-reviews":      LogbookReviewsForm,
	"rotation-postings":    RotationPostingsForm,
	thesis:                 ThesisForm,
};

export function getModuleForm(slug: string): ModuleFormComponent | null {
	return FORM_REGISTRY[slug] ?? null;
}

const styles = StyleSheet.create({
	form: { gap: 16 },
	section: {
		fontSize: 12,
		fontWeight: "700",
		color: "#475569",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginTop: 8,
	},
});
