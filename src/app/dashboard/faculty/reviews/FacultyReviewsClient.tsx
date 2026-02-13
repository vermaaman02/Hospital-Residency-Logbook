/**
 * @module FacultyReviewsClient
 * @description Client component for faculty to review and sign-off student entries.
 * Supports: Rotation Postings, Attendance, Case Presentations, Seminars, Journal Clubs.
 */

"use client";

import { useState, useTransition } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	signRotationPosting,
	rejectRotationPosting,
} from "@/actions/rotation-postings";
import { signAttendanceSheet } from "@/actions/attendance";
import {
	signCasePresentation,
	rejectCasePresentation,
} from "@/actions/case-presentations";
import { signSeminar, rejectSeminar } from "@/actions/seminars";
import { signJournalClub, rejectJournalClub } from "@/actions/journal-clubs";
import {
	signClinicalSkill,
	rejectClinicalSkill,
} from "@/actions/clinical-skills";
import {
	signCaseManagementEntry,
	rejectCaseManagementEntry,
} from "@/actions/case-management";
import {
	signProcedureLogEntry,
	rejectProcedureLogEntry,
} from "@/actions/procedure-logs";
import {
	signDiagnosticSkillEntry,
	rejectDiagnosticSkillEntry,
} from "@/actions/diagnostic-skills";
import {
	signImagingLogEntry,
	rejectImagingLogEntry,
} from "@/actions/imaging-logs";
import {
	signCourseAttended,
	rejectCourseAttended,
	signConferenceParticipation,
	rejectConferenceParticipation,
	signResearchActivity,
	rejectResearchActivity,
} from "@/actions/courses-conferences";
import {
	signDisasterDrill,
	rejectDisasterDrill,
	signQualityImprovement,
	rejectQualityImprovement,
} from "@/actions/disaster-qi";
import {
	signTransportLog,
	rejectTransportLog,
	signConsentLog,
	rejectConsentLog,
	signBadNewsLog,
	rejectBadNewsLog,
} from "@/actions/other-logs";
import { CONFIDENCE_LEVELS } from "@/lib/constants/clinical-skills";
import { CASE_CATEGORY_LABELS } from "@/lib/constants/case-categories";
import { COMPETENCY_LEVEL_OPTIONS } from "@/lib/constants/case-management-fields";
import { PROCEDURE_CATEGORY_LABELS } from "@/lib/constants/procedure-categories";
import { SKILL_LEVEL_LABELS } from "@/lib/constants/procedure-log-fields";
import {
	DIAGNOSTIC_CATEGORY_LABELS,
	CONFIDENCE_LEVEL_LABELS,
} from "@/lib/constants/diagnostic-types";
import { IMAGING_CATEGORY_LABELS } from "@/lib/constants/imaging-categories";
import { IMAGING_SKILL_LEVEL_LABELS } from "@/lib/constants/imaging-log-fields";
import { SKILL_LEVEL_LABELS_SOAPI } from "@/lib/constants/other-logs-fields";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
	Check,
	X,
	Loader2,
	FileText,
	Calendar,
	Presentation,
	BookOpen,
	Newspaper,
	Stethoscope,
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	GraduationCap,
	BookOpen as BookOpenAlt,
	Shield,
	Ambulance,
	HeartHandshake,
} from "lucide-react";

interface UserInfo {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
}

interface PendingRotation {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: Date | null;
	endDate: Date | null;
	totalDuration: string | null;
	user: UserInfo;
}

interface AttendanceEntry {
	id: string;
	day: string;
	presentAbsent: string | null;
}

interface PendingAttendance {
	id: string;
	weekStartDate: Date;
	weekEndDate: Date;
	batch: string | null;
	postedDepartment: string | null;
	entries: AttendanceEntry[];
	user: UserInfo;
}

interface AcademicEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	patientInfo?: string | null;
	completeDiagnosis?: string | null;
	category?: string | null;
	journalArticle?: string | null;
	typeOfStudy?: string | null;
	facultyRemark: string | null;
	status: string;
	user: UserInfo;
}

interface FacultyReviewsClientProps {
	pendingRotations: PendingRotation[];
	pendingAttendance: PendingAttendance[];
	pendingCasePresentations: AcademicEntry[];
	pendingSeminars: AcademicEntry[];
	pendingJournalClubs: AcademicEntry[];
	pendingClinicalSkillsAdult: ClinicalSkillReviewEntry[];
	pendingClinicalSkillsPediatric: ClinicalSkillReviewEntry[];
	pendingCaseManagement: CaseManagementReviewEntry[];
	pendingProcedureLogs: ProcedureLogReviewEntry[];
	pendingDiagnosticSkills: DiagnosticSkillReviewEntry[];
	pendingImagingLogs: ImagingLogReviewEntry[];
	pendingCourses: ProfessionalReviewEntry[];
	pendingConferences: ProfessionalReviewEntry[];
	pendingResearch: ProfessionalReviewEntry[];
	pendingDisasterDrills: ProfessionalReviewEntry[];
	pendingQi: ProfessionalReviewEntry[];
	pendingTransportLogs: OtherLogReviewEntry[];
	pendingConsentLogs: OtherLogReviewEntry[];
	pendingBadNewsLogs: OtherLogReviewEntry[];
	isHod: boolean;
}

interface ClinicalSkillReviewEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface CaseManagementReviewEntry {
	id: string;
	slNo: number;
	category: string;
	caseSubCategory: string;
	date: Date | string | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	facultyRemark: string | null;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface ProcedureLogReviewEntry {
	id: string;
	slNo: number;
	procedureCategory: string;
	date: Date | string | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface DiagnosticSkillReviewEntry {
	id: string;
	slNo: number;
	diagnosticCategory: string;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface ImagingLogReviewEntry {
	id: string;
	slNo: number;
	imagingCategory: string;
	date: Date | string | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface ProfessionalReviewEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

interface OtherLogReviewEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	status: string;
	user: UserInfo;
	[key: string]: unknown;
}

type RejectType =
	| "rotation"
	| "casePresentation"
	| "seminar"
	| "journalClub"
	| "clinicalSkillAdult"
	| "clinicalSkillPediatric"
	| "caseManagement"
	| "procedureLog"
	| "diagnosticSkill"
	| "imagingLog"
	| "courseAttended"
	| "conferenceParticipation"
	| "researchActivity"
	| "disasterDrill"
	| "qualityImprovement"
	| "transportLog"
	| "consentLog"
	| "badNewsLog";

export function FacultyReviewsClient({
	pendingRotations,
	pendingAttendance,
	pendingCasePresentations,
	pendingSeminars,
	pendingJournalClubs,
	pendingClinicalSkillsAdult,
	pendingClinicalSkillsPediatric,
	pendingCaseManagement,
	pendingProcedureLogs,
	pendingDiagnosticSkills,
	pendingImagingLogs,
	pendingCourses,
	pendingConferences,
	pendingResearch,
	pendingDisasterDrills,
	pendingQi,
	pendingTransportLogs,
	pendingConsentLogs,
	pendingBadNewsLogs,
	isHod,
}: FacultyReviewsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [rejectTarget, setRejectTarget] = useState<{
		id: string;
		type: RejectType;
	} | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	function handleSign(id: string, type: RejectType) {
		startTransition(async () => {
			try {
				switch (type) {
					case "rotation":
						await signRotationPosting(id);
						break;
					case "casePresentation":
						await signCasePresentation(id);
						break;
					case "seminar":
						await signSeminar(id);
						break;
					case "journalClub":
						await signJournalClub(id);
						break;
					case "clinicalSkillAdult":
						await signClinicalSkill("adult", id);
						break;
					case "clinicalSkillPediatric":
						await signClinicalSkill("pediatric", id);
						break;
					case "caseManagement":
						await signCaseManagementEntry(id);
						break;
					case "procedureLog":
						await signProcedureLogEntry(id);
						break;
					case "diagnosticSkill":
						await signDiagnosticSkillEntry(id);
						break;
					case "imagingLog":
						await signImagingLogEntry(id);
						break;
					case "courseAttended":
						await signCourseAttended(id);
						break;
					case "conferenceParticipation":
						await signConferenceParticipation(id);
						break;
					case "researchActivity":
						await signResearchActivity(id);
						break;
					case "disasterDrill":
						await signDisasterDrill(id);
						break;
					case "qualityImprovement":
						await signQualityImprovement(id);
						break;
					case "transportLog":
						await signTransportLog(id);
						break;
					case "consentLog":
						await signConsentLog(id);
						break;
					case "badNewsLog":
						await signBadNewsLog(id);
						break;
				}
				toast.success("Entry signed successfully");
				router.refresh();
			} catch {
				toast.error("Failed to sign");
			}
		});
	}

	function handleReject() {
		if (!rejectTarget || !rejectRemark.trim()) {
			toast.error("Please provide a remark");
			return;
		}
		startTransition(async () => {
			try {
				switch (rejectTarget.type) {
					case "rotation":
						await rejectRotationPosting(rejectTarget.id, rejectRemark);
						break;
					case "casePresentation":
						await rejectCasePresentation(rejectTarget.id, rejectRemark);
						break;
					case "seminar":
						await rejectSeminar(rejectTarget.id, rejectRemark);
						break;
					case "journalClub":
						await rejectJournalClub(rejectTarget.id, rejectRemark);
						break;
					case "clinicalSkillAdult":
						await rejectClinicalSkill("adult", rejectTarget.id, rejectRemark);
						break;
					case "clinicalSkillPediatric":
						await rejectClinicalSkill(
							"pediatric",
							rejectTarget.id,
							rejectRemark,
						);
						break;
					case "caseManagement":
						await rejectCaseManagementEntry(rejectTarget.id, rejectRemark);
						break;
					case "procedureLog":
						await rejectProcedureLogEntry(rejectTarget.id, rejectRemark);
						break;
					case "diagnosticSkill":
						await rejectDiagnosticSkillEntry(rejectTarget.id, rejectRemark);
						break;
					case "imagingLog":
						await rejectImagingLogEntry(rejectTarget.id, rejectRemark);
						break;
					case "courseAttended":
						await rejectCourseAttended(rejectTarget.id, rejectRemark);
						break;
					case "conferenceParticipation":
						await rejectConferenceParticipation(rejectTarget.id, rejectRemark);
						break;
					case "researchActivity":
						await rejectResearchActivity(rejectTarget.id, rejectRemark);
						break;
					case "disasterDrill":
						await rejectDisasterDrill(rejectTarget.id, rejectRemark);
						break;
					case "qualityImprovement":
						await rejectQualityImprovement(rejectTarget.id, rejectRemark);
						break;
					case "transportLog":
						await rejectTransportLog(rejectTarget.id, rejectRemark);
						break;
					case "consentLog":
						await rejectConsentLog(rejectTarget.id, rejectRemark);
						break;
					case "badNewsLog":
						await rejectBadNewsLog(rejectTarget.id, rejectRemark);
						break;
				}
				toast.success("Revision requested");
				setRejectDialogOpen(false);
				setRejectRemark("");
				router.refresh();
			} catch {
				toast.error("Failed to reject");
			}
		});
	}

	function handleSignAttendance(id: string) {
		startTransition(async () => {
			try {
				await signAttendanceSheet(id);
				toast.success("Attendance sheet signed");
				router.refresh();
			} catch {
				toast.error("Failed to sign");
			}
		});
	}

	function openRejectDialog(id: string, type: RejectType) {
		setRejectTarget({ id, type });
		setRejectRemark("");
		setRejectDialogOpen(true);
	}

	const totalPending =
		pendingRotations.length +
		pendingAttendance.length +
		pendingCasePresentations.length +
		pendingSeminars.length +
		pendingJournalClubs.length +
		pendingClinicalSkillsAdult.length +
		pendingClinicalSkillsPediatric.length +
		pendingCaseManagement.length +
		pendingProcedureLogs.length +
		pendingDiagnosticSkills.length +
		pendingImagingLogs.length +
		pendingCourses.length +
		pendingConferences.length +
		pendingResearch.length +
		pendingDisasterDrills.length +
		pendingQi.length +
		pendingTransportLogs.length +
		pendingConsentLogs.length +
		pendingBadNewsLogs.length;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Badge variant="outline" className="text-sm">
					{totalPending} pending review{totalPending !== 1 ? "s" : ""}
				</Badge>
			</div>

			<Tabs defaultValue="rotations">
				<TabsList className="flex-wrap h-auto">
					<TabsTrigger value="rotations">
						<FileText className="h-4 w-4 mr-1" />
						Rotations ({pendingRotations.length})
					</TabsTrigger>
					{isHod && (
						<TabsTrigger value="attendance">
							<Calendar className="h-4 w-4 mr-1" />
							Attendance ({pendingAttendance.length})
						</TabsTrigger>
					)}
					<TabsTrigger value="casePresentations">
						<Presentation className="h-4 w-4 mr-1" />
						Case Presentations ({pendingCasePresentations.length})
					</TabsTrigger>
					<TabsTrigger value="seminars">
						<BookOpen className="h-4 w-4 mr-1" />
						Seminars ({pendingSeminars.length})
					</TabsTrigger>
					<TabsTrigger value="journalClubs">
						<Newspaper className="h-4 w-4 mr-1" />
						Journal Clubs ({pendingJournalClubs.length})
					</TabsTrigger>
					<TabsTrigger value="clinicalSkills">
						<Stethoscope className="h-4 w-4 mr-1" />
						Clinical Skills (
						{pendingClinicalSkillsAdult.length +
							pendingClinicalSkillsPediatric.length}
						)
					</TabsTrigger>
					<TabsTrigger value="caseManagement">
						<ClipboardList className="h-4 w-4 mr-1" />
						Case Mgmt ({pendingCaseManagement.length})
					</TabsTrigger>
					<TabsTrigger value="procedureLogs">
						<Syringe className="h-4 w-4 mr-1" />
						Procedures ({pendingProcedureLogs.length})
					</TabsTrigger>
					<TabsTrigger value="diagnosticSkills">
						<Activity className="h-4 w-4 mr-1" />
						Diagnostics ({pendingDiagnosticSkills.length})
					</TabsTrigger>
					<TabsTrigger value="imagingLogs">
						<Scan className="h-4 w-4 mr-1" />
						Imaging ({pendingImagingLogs.length})
					</TabsTrigger>
					<TabsTrigger value="courses">
						<GraduationCap className="h-4 w-4 mr-1" />
						Courses ({pendingCourses.length})
					</TabsTrigger>
					<TabsTrigger value="conferences">
						<BookOpenAlt className="h-4 w-4 mr-1" />
						Conferences ({pendingConferences.length})
					</TabsTrigger>
					<TabsTrigger value="research">
						<BookOpenAlt className="h-4 w-4 mr-1" />
						Research ({pendingResearch.length})
					</TabsTrigger>
					<TabsTrigger value="disasterDrills">
						<Shield className="h-4 w-4 mr-1" />
						Disaster ({pendingDisasterDrills.length})
					</TabsTrigger>
					<TabsTrigger value="qi">
						<Shield className="h-4 w-4 mr-1" />
						QI ({pendingQi.length})
					</TabsTrigger>
					<TabsTrigger value="transportLogs">
						<Ambulance className="h-4 w-4 mr-1" />
						Transport ({pendingTransportLogs.length})
					</TabsTrigger>
					<TabsTrigger value="consentLogs">
						<HeartHandshake className="h-4 w-4 mr-1" />
						Consent ({pendingConsentLogs.length})
					</TabsTrigger>
					<TabsTrigger value="badNewsLogs">
						<HeartHandshake className="h-4 w-4 mr-1" />
						Bad News ({pendingBadNewsLogs.length})
					</TabsTrigger>
				</TabsList>

				{/* Rotations Tab */}
				<TabsContent value="rotations" className="mt-4 space-y-4">
					{pendingRotations.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending rotation postings to review
						</div>
					:	pendingRotations.map((rotation) => (
							<Card key={rotation.id}>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-base">
												{rotation.rotationName}
											</CardTitle>
											<CardDescription>
												{rotation.user.firstName} {rotation.user.lastName} — Sl.
												No. {rotation.slNo}
												{rotation.isElective && " (Elective)"}
											</CardDescription>
										</div>
										<Badge
											variant="outline"
											className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
										>
											Submitted
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
										{rotation.startDate && (
											<span>
												{format(new Date(rotation.startDate), "dd MMM yyyy")}
												{rotation.endDate &&
													` – ${format(new Date(rotation.endDate), "dd MMM yyyy")}`}
											</span>
										)}
										{rotation.totalDuration && (
											<span>Duration: {rotation.totalDuration}</span>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											onClick={() => handleSign(rotation.id, "rotation")}
											disabled={isPending}
										>
											{isPending ?
												<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
											:	<Check className="h-3.5 w-3.5 mr-1" />}
											Sign Off
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => openRejectDialog(rotation.id, "rotation")}
											disabled={isPending}
										>
											<X className="h-3.5 w-3.5 mr-1" />
											Request Revision
										</Button>
									</div>
								</CardContent>
							</Card>
						))
					}
				</TabsContent>

				{/* Attendance Tab — HOD only */}
				{isHod && (
					<TabsContent value="attendance" className="mt-4 space-y-4">
						{pendingAttendance.length === 0 ?
							<div className="border rounded-lg p-8 text-center text-muted-foreground">
								No pending attendance sheets to review
							</div>
						:	pendingAttendance.map((sheet) => {
								const presentDays = sheet.entries.filter(
									(e) => e.presentAbsent?.toLowerCase() === "present",
								).length;
								return (
									<Card key={sheet.id}>
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<div>
													<CardTitle className="text-base">
														Week:{" "}
														{format(new Date(sheet.weekStartDate), "dd MMM")} –{" "}
														{format(new Date(sheet.weekEndDate), "dd MMM yyyy")}
													</CardTitle>
													<CardDescription>
														{sheet.user.firstName} {sheet.user.lastName}
														{sheet.postedDepartment &&
															` — ${sheet.postedDepartment}`}
														{` — ${presentDays}/${sheet.entries.length} days present`}
													</CardDescription>
												</div>
												<Badge
													variant="outline"
													className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
												>
													Submitted
												</Badge>
											</div>
										</CardHeader>
										<CardContent>
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													onClick={() => handleSignAttendance(sheet.id)}
													disabled={isPending}
												>
													{isPending ?
														<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
													:	<Check className="h-3.5 w-3.5 mr-1" />}
													Sign Off
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})
						}
					</TabsContent>
				)}

				{/* Case Presentations Tab */}
				<TabsContent value="casePresentations" className="mt-4 space-y-4">
					{pendingCasePresentations.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending case presentations to review
						</div>
					:	pendingCasePresentations.map((entry) => (
							<AcademicReviewCard
								key={entry.id}
								entry={entry}
								type="casePresentation"
								title={`Case Presentation #${entry.slNo}`}
								subtitle={entry.completeDiagnosis ?? "No diagnosis"}
								detail={entry.patientInfo ?? ""}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "casePresentation")}
								onReject={() => openRejectDialog(entry.id, "casePresentation")}
							/>
						))
					}
				</TabsContent>

				{/* Seminars Tab */}
				<TabsContent value="seminars" className="mt-4 space-y-4">
					{pendingSeminars.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending seminars to review
						</div>
					:	pendingSeminars.map((entry) => (
							<AcademicReviewCard
								key={entry.id}
								entry={entry}
								type="seminar"
								title={`Seminar #${entry.slNo}`}
								subtitle={entry.completeDiagnosis ?? "No diagnosis"}
								detail={entry.patientInfo ?? ""}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "seminar")}
								onReject={() => openRejectDialog(entry.id, "seminar")}
							/>
						))
					}
				</TabsContent>

				{/* Journal Clubs Tab */}
				<TabsContent value="journalClubs" className="mt-4 space-y-4">
					{pendingJournalClubs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending journal clubs to review
						</div>
					:	pendingJournalClubs.map((entry) => (
							<AcademicReviewCard
								key={entry.id}
								entry={entry}
								type="journalClub"
								title={`Journal Club #${entry.slNo}`}
								subtitle={entry.journalArticle ?? "No article"}
								detail={entry.typeOfStudy ?? ""}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "journalClub")}
								onReject={() => openRejectDialog(entry.id, "journalClub")}
							/>
						))
					}
				</TabsContent>

				{/* Clinical Skills Tab */}
				<TabsContent value="clinicalSkills" className="mt-4 space-y-4">
					{(
						pendingClinicalSkillsAdult.length === 0 &&
						pendingClinicalSkillsPediatric.length === 0
					) ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending clinical skills to review
						</div>
					:	<>
							{pendingClinicalSkillsAdult.length > 0 && (
								<div className="space-y-3">
									<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
										Adult Skills ({pendingClinicalSkillsAdult.length})
									</h3>
									{pendingClinicalSkillsAdult.map((skill) => {
										const confLabel =
											CONFIDENCE_LEVELS.find(
												(c) => c.value === skill.confidenceLevel,
											)?.label ?? skill.confidenceLevel;
										return (
											<Card key={skill.id}>
												<CardHeader className="pb-3">
													<div className="flex items-start justify-between">
														<div>
															<CardTitle className="text-base">
																{skill.skillName}
															</CardTitle>
															<CardDescription>
																{skill.user.firstName} {skill.user.lastName} —
																Tally: {skill.totalTimesPerformed}
																{confLabel && ` — ${confLabel}`}
															</CardDescription>
														</div>
														<Badge
															variant="outline"
															className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
														>
															Submitted
														</Badge>
													</div>
												</CardHeader>
												<CardContent>
													{skill.representativeDiagnosis && (
														<p className="text-sm text-muted-foreground mb-3">
															{skill.representativeDiagnosis}
														</p>
													)}
													<div className="flex items-center gap-2">
														<Button
															size="sm"
															onClick={() =>
																handleSign(skill.id, "clinicalSkillAdult")
															}
															disabled={isPending}
														>
															{isPending ?
																<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
															:	<Check className="h-3.5 w-3.5 mr-1" />}
															Sign Off
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																openRejectDialog(skill.id, "clinicalSkillAdult")
															}
															disabled={isPending}
														>
															<X className="h-3.5 w-3.5 mr-1" />
															Request Revision
														</Button>
													</div>
												</CardContent>
											</Card>
										);
									})}
								</div>
							)}
							{pendingClinicalSkillsPediatric.length > 0 && (
								<div className="space-y-3">
									<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
										Pediatric Skills ({pendingClinicalSkillsPediatric.length})
									</h3>
									{pendingClinicalSkillsPediatric.map((skill) => {
										const confLabel =
											CONFIDENCE_LEVELS.find(
												(c) => c.value === skill.confidenceLevel,
											)?.label ?? skill.confidenceLevel;
										return (
											<Card key={skill.id}>
												<CardHeader className="pb-3">
													<div className="flex items-start justify-between">
														<div>
															<CardTitle className="text-base">
																{skill.skillName}
															</CardTitle>
															<CardDescription>
																{skill.user.firstName} {skill.user.lastName} —
																Tally: {skill.totalTimesPerformed}
																{confLabel && ` — ${confLabel}`}
															</CardDescription>
														</div>
														<Badge
															variant="outline"
															className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
														>
															Submitted
														</Badge>
													</div>
												</CardHeader>
												<CardContent>
													{skill.representativeDiagnosis && (
														<p className="text-sm text-muted-foreground mb-3">
															{skill.representativeDiagnosis}
														</p>
													)}
													<div className="flex items-center gap-2">
														<Button
															size="sm"
															onClick={() =>
																handleSign(skill.id, "clinicalSkillPediatric")
															}
															disabled={isPending}
														>
															{isPending ?
																<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
															:	<Check className="h-3.5 w-3.5 mr-1" />}
															Sign Off
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																openRejectDialog(
																	skill.id,
																	"clinicalSkillPediatric",
																)
															}
															disabled={isPending}
														>
															<X className="h-3.5 w-3.5 mr-1" />
															Request Revision
														</Button>
													</div>
												</CardContent>
											</Card>
										);
									})}
								</div>
							)}
						</>
					}
				</TabsContent>

				{/* Case Management Tab */}
				<TabsContent value="caseManagement" className="mt-4 space-y-4">
					{pendingCaseManagement.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending case management entries to review
						</div>
					:	pendingCaseManagement.map((entry) => {
							const catLabel =
								CASE_CATEGORY_LABELS[entry.category] ?? entry.category;
							const compLabel =
								COMPETENCY_LEVEL_OPTIONS.find(
									(o) => o.value === entry.competencyLevel,
								)?.label ?? entry.competencyLevel;
							return (
								<Card key={entry.id}>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-base">
													{entry.caseSubCategory}
												</CardTitle>
												<CardDescription>
													{entry.user.firstName} {entry.user.lastName} —{" "}
													{catLabel}
													{entry.date &&
														` — ${format(new Date(entry.date), "dd MMM yyyy")}`}
												</CardDescription>
											</div>
											<Badge
												variant="outline"
												className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>
												Submitted
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-muted-foreground mb-3 space-y-1">
											{entry.patientInfo && <p>{entry.patientInfo}</p>}
											{entry.completeDiagnosis && (
												<p className="font-medium text-foreground">
													{entry.completeDiagnosis}
												</p>
											)}
											{compLabel && (
												<p>
													Competency:{" "}
													<Badge variant="outline" className="text-xs">
														{compLabel}
													</Badge>
												</p>
											)}
											<p>Tally: {entry.totalCaseTally}</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												onClick={() => handleSign(entry.id, "caseManagement")}
												disabled={isPending}
											>
												{isPending ?
													<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
												:	<Check className="h-3.5 w-3.5 mr-1" />}
												Sign Off
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openRejectDialog(entry.id, "caseManagement")
												}
												disabled={isPending}
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Request Revision
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})
					}
				</TabsContent>

				{/* Procedure Logs Tab */}
				<TabsContent value="procedureLogs" className="mt-4 space-y-4">
					{pendingProcedureLogs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending procedure log entries to review
						</div>
					:	pendingProcedureLogs.map((entry) => {
							const catLabel =
								PROCEDURE_CATEGORY_LABELS[entry.procedureCategory] ??
								entry.procedureCategory;
							const skillLabel =
								entry.skillLevel ?
									`${entry.skillLevel} — ${SKILL_LEVEL_LABELS[entry.skillLevel] ?? entry.skillLevel}`
								:	"—";
							return (
								<Card key={entry.id}>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-base">
													{catLabel} — Sl. {entry.slNo}
												</CardTitle>
												<CardDescription>
													{entry.user.firstName} {entry.user.lastName}
													{entry.date &&
														` — ${format(new Date(entry.date), "dd MMM yyyy")}`}
												</CardDescription>
											</div>
											<Badge
												variant="outline"
												className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>
												Submitted
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-muted-foreground mb-4 space-y-1">
											{entry.patientInfo && <p>Patient: {entry.patientInfo}</p>}
											{entry.completeDiagnosis && (
												<p>Diagnosis: {entry.completeDiagnosis}</p>
											)}
											{entry.procedureDescription && (
												<p>Procedure: {entry.procedureDescription}</p>
											)}
											{entry.performedAtLocation && (
												<p>Location: {entry.performedAtLocation}</p>
											)}
											<p>
												Skill Level:{" "}
												<Badge variant="outline" className="text-xs">
													{skillLabel}
												</Badge>
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												onClick={() => handleSign(entry.id, "procedureLog")}
												disabled={isPending}
											>
												{isPending ?
													<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
												:	<Check className="h-3.5 w-3.5 mr-1" />}
												Sign Off
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openRejectDialog(entry.id, "procedureLog")
												}
												disabled={isPending}
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Request Revision
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})
					}
				</TabsContent>

				{/* Diagnostics Tab */}
				<TabsContent value="diagnosticSkills" className="mt-4 space-y-4">
					{pendingDiagnosticSkills.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending diagnostic skill entries to review
						</div>
					:	pendingDiagnosticSkills.map((entry) => {
							const catLabel =
								DIAGNOSTIC_CATEGORY_LABELS[entry.diagnosticCategory] ??
								entry.diagnosticCategory;
							const confLabel =
								entry.confidenceLevel ?
									`${entry.confidenceLevel} — ${CONFIDENCE_LEVEL_LABELS[entry.confidenceLevel] ?? entry.confidenceLevel}`
								:	"—";
							return (
								<Card key={entry.id}>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-base">
													{catLabel} — {entry.skillName}
												</CardTitle>
												<CardDescription>
													{entry.user.firstName} {entry.user.lastName} — Sl.{" "}
													{entry.slNo}
												</CardDescription>
											</div>
											<Badge
												variant="outline"
												className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>
												Submitted
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-muted-foreground mb-4 space-y-1">
											{entry.representativeDiagnosis && (
												<p>
													Representative Diagnosis:{" "}
													{entry.representativeDiagnosis}
												</p>
											)}
											<p>
												Confidence:{" "}
												<Badge variant="outline" className="text-xs">
													{confLabel}
												</Badge>
											</p>
											<p>Times Performed: {entry.totalTimesPerformed}</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												onClick={() => handleSign(entry.id, "diagnosticSkill")}
												disabled={isPending}
											>
												{isPending ?
													<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
												:	<Check className="h-3.5 w-3.5 mr-1" />}
												Sign Off
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openRejectDialog(entry.id, "diagnosticSkill")
												}
												disabled={isPending}
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Request Revision
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})
					}
				</TabsContent>

				{/* Imaging Tab */}
				<TabsContent value="imagingLogs" className="mt-4 space-y-4">
					{pendingImagingLogs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending imaging log entries to review
						</div>
					:	pendingImagingLogs.map((entry) => {
							const catLabel =
								IMAGING_CATEGORY_LABELS[entry.imagingCategory] ??
								entry.imagingCategory;
							const skillLabel =
								entry.skillLevel ?
									`${entry.skillLevel} — ${IMAGING_SKILL_LEVEL_LABELS[entry.skillLevel] ?? entry.skillLevel}`
								:	"—";
							return (
								<Card key={entry.id}>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-base">
													{catLabel} — Sl. {entry.slNo}
												</CardTitle>
												<CardDescription>
													{entry.user.firstName} {entry.user.lastName}
													{entry.date &&
														` — ${format(new Date(entry.date as string), "dd MMM yyyy")}`}
												</CardDescription>
											</div>
											<Badge
												variant="outline"
												className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>
												Submitted
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-muted-foreground mb-4 space-y-1">
											{entry.patientInfo && <p>Patient: {entry.patientInfo}</p>}
											{entry.completeDiagnosis && (
												<p>Diagnosis: {entry.completeDiagnosis}</p>
											)}
											{entry.procedureDescription && (
												<p>Procedure: {entry.procedureDescription}</p>
											)}
											{entry.performedAtLocation && (
												<p>Location: {entry.performedAtLocation}</p>
											)}
											<p>
												Skill Level:{" "}
												<Badge variant="outline" className="text-xs">
													{skillLabel}
												</Badge>
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												onClick={() => handleSign(entry.id, "imagingLog")}
												disabled={isPending}
											>
												{isPending ?
													<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
												:	<Check className="h-3.5 w-3.5 mr-1" />}
												Sign Off
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => openRejectDialog(entry.id, "imagingLog")}
												disabled={isPending}
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Request Revision
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})
					}
				</TabsContent>

				{/* Courses Tab (H1) */}
				<TabsContent value="courses" className="mt-4 space-y-4">
					{pendingCourses.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending course entries to review
						</div>
					:	pendingCourses.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="courseAttended"
								title={`Course: ${(entry as Record<string, unknown>).courseName ?? "—"}`}
								details={[
									{
										label: "Conducted@",
										value: (entry as Record<string, unknown>)
											.conductedAt as string,
									},
									{
										label: "Confidence",
										value: (entry as Record<string, unknown>)
											.confidenceLevel as string,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "courseAttended")}
								onReject={() => openRejectDialog(entry.id, "courseAttended")}
							/>
						))
					}
				</TabsContent>

				{/* Conferences Tab (H2) */}
				<TabsContent value="conferences" className="mt-4 space-y-4">
					{pendingConferences.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending conference entries to review
						</div>
					:	pendingConferences.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="conferenceParticipation"
								title={`Conference: ${(entry as Record<string, unknown>).conferenceName ?? "—"}`}
								details={[
									{
										label: "Conducted@",
										value: (entry as Record<string, unknown>)
											.conductedAt as string,
									},
									{
										label: "Role",
										value: (entry as Record<string, unknown>)
											.participationRole as string,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "conferenceParticipation")}
								onReject={() =>
									openRejectDialog(entry.id, "conferenceParticipation")
								}
							/>
						))
					}
				</TabsContent>

				{/* Research Tab (H3) */}
				<TabsContent value="research" className="mt-4 space-y-4">
					{pendingResearch.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending research entries to review
						</div>
					:	pendingResearch.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="researchActivity"
								title={`Research: ${(entry as Record<string, unknown>).activity ?? "—"}`}
								details={[
									{
										label: "Conducted@",
										value: (entry as Record<string, unknown>)
											.conductedAt as string,
									},
									{
										label: "Role",
										value: (entry as Record<string, unknown>)
											.participationRole as string,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "researchActivity")}
								onReject={() => openRejectDialog(entry.id, "researchActivity")}
							/>
						))
					}
				</TabsContent>

				{/* Disaster Drills Tab (H4) */}
				<TabsContent value="disasterDrills" className="mt-4 space-y-4">
					{pendingDisasterDrills.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending disaster drill entries to review
						</div>
					:	pendingDisasterDrills.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="disasterDrill"
								title={`Disaster Drill: ${(entry as Record<string, unknown>).description ?? "—"}`}
								details={[
									{
										label: "Role",
										value: (entry as Record<string, unknown>)
											.roleInActivity as string,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "disasterDrill")}
								onReject={() => openRejectDialog(entry.id, "disasterDrill")}
							/>
						))
					}
				</TabsContent>

				{/* QI Tab (H5) */}
				<TabsContent value="qi" className="mt-4 space-y-4">
					{pendingQi.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending QI entries to review
						</div>
					:	pendingQi.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="qualityImprovement"
								title={`QI: ${(entry as Record<string, unknown>).description ?? "—"}`}
								details={[
									{
										label: "Role",
										value: (entry as Record<string, unknown>)
											.roleInActivity as string,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "qualityImprovement")}
								onReject={() =>
									openRejectDialog(entry.id, "qualityImprovement")
								}
							/>
						))
					}
				</TabsContent>

				{/* Transport Tab (H6) */}
				<TabsContent value="transportLogs" className="mt-4 space-y-4">
					{pendingTransportLogs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending transport log entries to review
						</div>
					:	pendingTransportLogs.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="transportLog"
								title={`Transport: ${entry.patientInfo ?? "—"}`}
								details={[
									{ label: "Diagnosis", value: entry.completeDiagnosis },
									{
										label: "Skill",
										value:
											entry.skillLevel ?
												(SKILL_LEVEL_LABELS_SOAPI[entry.skillLevel] ??
												entry.skillLevel)
											:	null,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "transportLog")}
								onReject={() => openRejectDialog(entry.id, "transportLog")}
							/>
						))
					}
				</TabsContent>

				{/* Consent Tab (H7) */}
				<TabsContent value="consentLogs" className="mt-4 space-y-4">
					{pendingConsentLogs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending consent log entries to review
						</div>
					:	pendingConsentLogs.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="consentLog"
								title={`Consent: ${entry.patientInfo ?? "—"}`}
								details={[
									{ label: "Diagnosis", value: entry.completeDiagnosis },
									{
										label: "Skill",
										value:
											entry.skillLevel ?
												(SKILL_LEVEL_LABELS_SOAPI[entry.skillLevel] ??
												entry.skillLevel)
											:	null,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "consentLog")}
								onReject={() => openRejectDialog(entry.id, "consentLog")}
							/>
						))
					}
				</TabsContent>

				{/* Bad News Tab (H8) */}
				<TabsContent value="badNewsLogs" className="mt-4 space-y-4">
					{pendingBadNewsLogs.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending bad news log entries to review
						</div>
					:	pendingBadNewsLogs.map((entry) => (
							<GenericReviewCard
								key={entry.id}
								entry={entry}
								rejectType="badNewsLog"
								title={`Bad News: ${entry.patientInfo ?? "—"}`}
								details={[
									{ label: "Diagnosis", value: entry.completeDiagnosis },
									{
										label: "Skill",
										value:
											entry.skillLevel ?
												(SKILL_LEVEL_LABELS_SOAPI[entry.skillLevel] ??
												entry.skillLevel)
											:	null,
									},
								]}
								isPending={isPending}
								onSign={() => handleSign(entry.id, "badNewsLog")}
								onReject={() => openRejectDialog(entry.id, "badNewsLog")}
							/>
						))
					}
				</TabsContent>
			</Tabs>

			{/* Reject Dialog */}
			<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Provide a remark explaining what needs to be revised.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Enter your remark..."
						value={rejectRemark}
						onChange={(e) => setRejectRemark(e.target.value)}
						rows={4}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={isPending || !rejectRemark.trim()}
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Request Revision
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/* ─── Reusable Academic Review Card ─── */

interface AcademicReviewCardProps {
	entry: AcademicEntry;
	type: RejectType;
	title: string;
	subtitle: string;
	detail: string;
	isPending: boolean;
	onSign: () => void;
	onReject: () => void;
}

function AcademicReviewCard({
	entry,
	type: _type,
	title,
	subtitle,
	detail,
	isPending,
	onSign,
	onReject,
}: AcademicReviewCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">{title}</CardTitle>
						<CardDescription>
							{entry.user.firstName} {entry.user.lastName}
							{entry.date &&
								` — ${format(new Date(entry.date), "dd MMM yyyy")}`}
						</CardDescription>
					</div>
					<Badge
						variant="outline"
						className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
					>
						Submitted
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-sm text-muted-foreground mb-4 space-y-1">
					<p className="font-medium text-foreground">{subtitle}</p>
					{detail && <p>{detail}</p>}
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" onClick={onSign} disabled={isPending}>
						{isPending ?
							<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
						:	<Check className="h-3.5 w-3.5 mr-1" />}
						Sign Off
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onReject}
						disabled={isPending}
					>
						<X className="h-3.5 w-3.5 mr-1" />
						Request Revision
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

/* ─── Generic Review Card (Professional & Other Logs) ─── */

interface GenericReviewCardDetail {
	label: string;
	value: string | null | undefined;
}

interface GenericReviewCardProps {
	entry: {
		id: string;
		slNo: number;
		date: Date | string | null;
		user: { firstName: string | null; lastName: string | null };
	};
	rejectType: RejectType;
	title: string;
	details: GenericReviewCardDetail[];
	isPending: boolean;
	onSign: () => void;
	onReject: () => void;
}

function GenericReviewCard({
	entry,
	rejectType: _rejectType,
	title,
	details,
	isPending,
	onSign,
	onReject,
}: GenericReviewCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">{title}</CardTitle>
						<CardDescription>
							{entry.user.firstName} {entry.user.lastName}
							{entry.date &&
								` — ${format(new Date(entry.date as string), "dd MMM yyyy")}`}
						</CardDescription>
					</div>
					<Badge
						variant="outline"
						className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
					>
						Submitted
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-sm text-muted-foreground mb-4 space-y-1">
					{details.map((d) =>
						d.value ?
							<p key={d.label}>
								<span className="font-medium text-foreground">{d.label}:</span>{" "}
								{d.value}
							</p>
						:	null,
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" onClick={onSign} disabled={isPending}>
						{isPending ?
							<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
						:	<Check className="h-3.5 w-3.5 mr-1" />}
						Sign Off
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onReject}
						disabled={isPending}
					>
						<X className="h-3.5 w-3.5 mr-1" />
						Request Revision
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
