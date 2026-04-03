/**
 * @module StudentAssessmentsClient
 * @description Client component for students to view assessments, submit work,
 * and check grades/evaluations. Two tabs: "Assessments" and "Grades & Evaluations".
 */

"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CloudinaryUpload } from "@/components/shared/CloudinaryUpload";
import {
	MarkdownEditor,
	renderMarkdown,
} from "@/components/shared/MarkdownEditor";
import { submitAssessment, saveDraftSubmission } from "@/actions/assessments";
import {
	Search,
	Loader2,
	FileText,
	Calendar,
	Clock,
	ExternalLink,
	Send,
	Save,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Award,
	AlertCircle,
	CheckCircle2,
	BarChart3,
	BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, formatDistanceToNow } from "date-fns";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface EvaluationInfo {
	marks: number | null;
	grade: string | null;
	feedback: string | null;
	rejectionReason: string | null;
	evaluatedAt: string | null;
	evaluatedBy: { firstName: string; lastName: string } | null;
}

interface SubmissionInfo {
	id: string;
	status: string;
	content: string | null;
	attachments: string[];
	submittedAt: string | null;
	evaluation: EvaluationInfo | null;
}

interface AssessmentRow {
	id: string;
	title: string;
	description: string | null;
	assessmentType: string;
	batch: { id: string; name: string };
	createdBy: { id: string; firstName: string; lastName: string };
	deadline: string | null;
	resourceLinks: string[];
	attachments: string[];
	maxMarks: number | null;
	totalMarks: number | null;
	isPublished: boolean;
	createdAt: string;
	submissions: SubmissionInfo[];
}

interface StudentAssessmentsClientProps {
	assessments: AssessmentRow[];
}

const ASSESSMENT_TYPES = [
	{ value: "THEORY", label: "Theory" },
	{ value: "PRACTICAL", label: "Practical" },
	{ value: "VIVA", label: "Viva" },
	{ value: "ASSIGNMENT", label: "Assignment" },
	{ value: "PROJECT", label: "Project" },
	{ value: "OTHER", label: "Other" },
];

const PAGE_SIZE = 10;

// ======================== COMPONENT ========================

export function StudentAssessmentsClient({
	assessments,
}: StudentAssessmentsClientProps) {
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("assessments");

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [gradesPage, setGradesPage] = useState(1);

	// Submit dialog
	const [submitAssessmentData, setSubmitAssessmentData] =
		useState<AssessmentRow | null>(null);
	const [submissionContent, setSubmissionContent] = useState("");
	const [submissionAttachments, setSubmissionAttachments] = useState<string[]>([]);

	// View detail dialog
	const [viewingAssessment, setViewingAssessment] =
		useState<AssessmentRow | null>(null);

	// ======================== DERIVED DATA ========================

	const filtered = useMemo(() => {
		let result = [...assessments];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(a) =>
					a.title.toLowerCase().includes(q) ||
					a.createdBy.firstName.toLowerCase().includes(q) ||
					a.createdBy.lastName.toLowerCase().includes(q),
			);
		}
		if (typeFilter !== "all")
			result = result.filter((a) => a.assessmentType === typeFilter);
		return result;
	}, [assessments, searchQuery, typeFilter]);

	const pendingAssessments = useMemo(() => {
		return filtered.filter((a) => {
			const sub = a.submissions[0];
			return !sub || sub.status === "DRAFT" || sub.status === "NEEDS_REVISION";
		});
	}, [filtered]);

	const evaluatedAssessments = useMemo(() => {
		return filtered.filter((a) => {
			const sub = a.submissions[0];
			return sub && (sub.status === "SIGNED" || sub.evaluation);
		});
	}, [filtered]);

	const submittedAssessments = useMemo(() => {
		return filtered.filter((a) => {
			const sub = a.submissions[0];
			return (
				sub &&
				(sub.status === "SUBMITTED" ||
					sub.status === "SIGNED" ||
					sub.status === "NEEDS_REVISION")
			);
		});
	}, [filtered]);

	// Paginated data
	const totalPagesAssessments = Math.max(
		1,
		Math.ceil(filtered.length / PAGE_SIZE),
	);
	const paginatedAssessments = filtered.slice(
		(page - 1) * PAGE_SIZE,
		page * PAGE_SIZE,
	);

	const assessmentsWithGrades = useMemo(() => {
		return assessments.filter((a) => a.submissions[0]?.evaluation);
	}, [assessments]);
	const totalPagesGrades = Math.max(
		1,
		Math.ceil(assessmentsWithGrades.length / PAGE_SIZE),
	);
	const paginatedGrades = assessmentsWithGrades.slice(
		(gradesPage - 1) * PAGE_SIZE,
		gradesPage * PAGE_SIZE,
	);

	// Stats
	const totalCount = assessments.length;
	const pendingCount = pendingAssessments.length;
	const submittedCount = submittedAssessments.length;
	const evaluatedCount = evaluatedAssessments.length;

	// ======================== HANDLERS ========================

	const openSubmitDialog = useCallback((a: AssessmentRow) => {
		const existing = a.submissions[0];
		setSubmitAssessmentData(a);
		setSubmissionContent(existing?.content ?? "");
		setSubmissionAttachments(existing?.attachments ?? []);
	}, []);

	const handleSubmit = useCallback(() => {
		if (!submitAssessmentData) return;
		startTransition(async () => {
			try {
				await submitAssessment(submitAssessmentData.id, submissionContent, submissionAttachments);
				toast.success("Assessment submitted successfully!");
				setSubmitAssessmentData(null);
				setSubmissionContent("");
				setSubmissionAttachments([]);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to submit");
			}
		});
	}, [submitAssessmentData, submissionContent, submissionAttachments]);

	const handleSaveDraft = useCallback(() => {
		if (!submitAssessmentData) return;
		startTransition(async () => {
			try {
				await saveDraftSubmission(submitAssessmentData.id, submissionContent, submissionAttachments);
				toast.success("Draft saved");
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save draft",
				);
			}
		});
	}, [submitAssessmentData, submissionContent, submissionAttachments]);

	// ======================== HELPERS ========================

	const getExternalUrl = (url: string) => {
		if (!url) return "#";
		return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
	};

	function getSubmissionStatusInfo(a: AssessmentRow) {
		const sub = a.submissions[0];
		if (!sub)
			return { label: "Not Started", color: "bg-gray-100 text-gray-600" };
		switch (sub.status) {
			case "DRAFT":
				return { label: "Draft Saved", color: "bg-yellow-100 text-yellow-700" };
			case "SUBMITTED":
				return { label: "Submitted", color: "bg-blue-100 text-blue-700" };
			case "SIGNED":
				return { label: "Evaluated", color: "bg-green-100 text-green-700" };
			case "NEEDS_REVISION":
				return { label: "Needs Revision", color: "bg-red-100 text-red-700" };
			case "REJECTED":
				return { label: "Rejected", color: "bg-red-100 text-red-700" };
			default:
				return { label: sub.status, color: "bg-gray-100 text-gray-600" };
		}
	}

	function isOverdue(a: AssessmentRow) {
		if (!a.deadline) return false;
		const sub = a.submissions[0];
		if (sub && sub.status !== "DRAFT" && sub.status !== "NEEDS_REVISION")
			return false;
		return isPast(new Date(a.deadline));
	}

	// ======================== RENDER ========================

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="border-l-4 border-l-hospital-primary">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<BookOpen className="h-8 w-8 text-hospital-primary opacity-70" />
							<div>
								<p className="text-2xl font-bold">{totalCount}</p>
								<p className="text-xs text-muted-foreground">
									Total Assessments
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-amber-400">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<Clock className="h-8 w-8 text-amber-500 opacity-70" />
							<div>
								<p className="text-2xl font-bold">{pendingCount}</p>
								<p className="text-xs text-muted-foreground">Pending</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-400">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<Send className="h-8 w-8 text-blue-500 opacity-70" />
							<div>
								<p className="text-2xl font-bold">{submittedCount}</p>
								<p className="text-xs text-muted-foreground">Submitted</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-400">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<Award className="h-8 w-8 text-green-500 opacity-70" />
							<div>
								<p className="text-2xl font-bold">{evaluatedCount}</p>
								<p className="text-xs text-muted-foreground">Evaluated</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2 max-w-md">
					<TabsTrigger value="assessments" className="gap-2">
						<ClipboardList className="h-4 w-4" />
						Assessments
					</TabsTrigger>
					<TabsTrigger value="grades" className="gap-2">
						<BarChart3 className="h-4 w-4" />
						Grades & Evaluations
					</TabsTrigger>
				</TabsList>

				{/* ======================== TAB 1: ASSESSMENTS ======================== */}
				<TabsContent value="assessments" className="space-y-4 mt-4">
					{/* Filters */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by title or faculty..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setPage(1);
								}}
								className="pl-10"
							/>
						</div>
						<Select
							value={typeFilter}
							onValueChange={(v) => {
								setTypeFilter(v);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{ASSESSMENT_TYPES.map((t) => (
									<SelectItem key={t.value} value={t.value}>
										{t.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Assessment Cards */}
					{filtered.length === 0 ?
						<Card>
							<CardContent className="py-16 text-center">
								<FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
								<p className="text-lg font-medium text-muted-foreground">
									No assessments available
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Your faculty or HOD has not published any assessments for your
									batch yet.
								</p>
							</CardContent>
						</Card>
					:	<>
							<div className="grid gap-4">
								{paginatedAssessments.map((a) => {
									const statusInfo = getSubmissionStatusInfo(a);
									const overdue = isOverdue(a);
									const sub = a.submissions[0];
									const canSubmit =
										!sub ||
										sub.status === "DRAFT" ||
										sub.status === "NEEDS_REVISION";

									return (
										<Card
											key={a.id}
											className={`transition-colors ${overdue ? "border-red-200 bg-red-50/30" : ""}`}
										>
											<CardContent className="pt-5 pb-5">
												<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
													<div className="flex-1 min-w-0">
														<div className="flex items-start gap-2 flex-wrap">
															<h3 className="font-semibold text-base">
																{a.title}
															</h3>
															<Badge
																variant="outline"
																className="text-xs shrink-0"
															>
																{ASSESSMENT_TYPES.find(
																	(t) => t.value === a.assessmentType,
																)?.label ?? a.assessmentType}
															</Badge>
															<Badge
																className={`text-xs shrink-0 ${statusInfo.color}`}
															>
																{statusInfo.label}
															</Badge>
														</div>
														<p className="text-sm text-muted-foreground mt-1">
															By {a.createdBy.firstName} {a.createdBy.lastName}{" "}
															• {a.batch.name}
														</p>
														<div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
															{a.deadline && (
																<span
																	className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : ""}`}
																>
																	{overdue ?
																		<AlertCircle className="h-3.5 w-3.5" />
																	:	<Calendar className="h-3.5 w-3.5" />}
																	{overdue ? "Overdue: " : "Deadline: "}
																	{format(
																		new Date(a.deadline),
																		"dd MMM yyyy, hh:mm a",
																	)}
																	{!overdue &&
																		a.deadline &&
																		!isPast(new Date(a.deadline)) && (
																			<span className="text-xs">
																				(
																				{formatDistanceToNow(
																					new Date(a.deadline),
																					{ addSuffix: true },
																				)}
																				)
																			</span>
																		)}
																</span>
															)}
															{a.maxMarks && (
																<span className="flex items-center gap-1">
																	<Award className="h-3.5 w-3.5" />
																	Max Marks: {a.maxMarks}
																</span>
															)}
														</div>

														{/* Rejection Reason */}
														{sub?.status === "NEEDS_REVISION" &&
															sub.evaluation?.rejectionReason && (
																<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
																	<p className="font-medium flex items-center gap-1">
																		<AlertCircle className="h-3.5 w-3.5" />
																		Revision Required:
																	</p>
																	<p className="mt-0.5">
																		{sub.evaluation.rejectionReason}
																	</p>
																</div>
															)}
													</div>

													<div className="flex gap-2 shrink-0 sm:flex-col">
														<Button
															variant="outline"
															size="sm"
															onClick={() => setViewingAssessment(a)}
														>
															<FileText className="mr-1 h-3 w-3" />
															Details
														</Button>
														{canSubmit && (
															<Button
																size="sm"
																onClick={() => openSubmitDialog(a)}
																disabled={isPending}
															>
																<Send className="mr-1 h-3 w-3" />
																{sub ? "Resubmit" : "Submit"}
															</Button>
														)}
														{sub?.status === "SUBMITTED" && (
															<Badge className="bg-blue-100 text-blue-700 justify-center">
																<Clock className="mr-1 h-3 w-3" />
																Under Review
															</Badge>
														)}
													</div>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>

							{/* Pagination */}
							{totalPagesAssessments > 1 && (
								<div className="flex items-center justify-between mt-4">
									<p className="text-sm text-muted-foreground">
										Showing {(page - 1) * PAGE_SIZE + 1}–
										{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
										{filtered.length}
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page === 1}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="flex items-center px-3 text-sm">
											{page} / {totalPagesAssessments}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setPage((p) => Math.min(totalPagesAssessments, p + 1))
											}
											disabled={page === totalPagesAssessments}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					}
				</TabsContent>

				{/* ======================== TAB 2: GRADES ======================== */}
				<TabsContent value="grades" className="space-y-4 mt-4">
					{assessmentsWithGrades.length === 0 ?
						<Card>
							<CardContent className="py-16 text-center">
								<BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
								<p className="text-lg font-medium text-muted-foreground">
									No evaluations yet
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Your grades will appear here once faculty evaluates your
									submissions.
								</p>
							</CardContent>
						</Card>
					:	<>
							<div className="grid gap-4">
								{paginatedGrades.map((a) => {
									const sub = a.submissions[0];
									const evaluation = sub?.evaluation;
									if (!evaluation) return null;

									const isRejected =
										sub.status === "NEEDS_REVISION" ||
										sub.status === "REJECTED";

									return (
										<Card
											key={a.id}
											className={
												isRejected ? "border-red-200" : "border-green-200"
											}
										>
											<CardContent className="pt-5 pb-5">
												<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
													<div className="flex-1 min-w-0">
														<div className="flex items-start gap-2 flex-wrap">
															<h3 className="font-semibold text-base">
																{a.title}
															</h3>
															<Badge
																variant="outline"
																className="text-xs shrink-0"
															>
																{ASSESSMENT_TYPES.find(
																	(t) => t.value === a.assessmentType,
																)?.label ?? a.assessmentType}
															</Badge>
															<StatusBadge
																status={sub.status as EntryStatus}
																size="sm"
															/>
														</div>
														<p className="text-sm text-muted-foreground mt-1">
															{a.batch.name} •{" "}
															{format(new Date(a.createdAt), "dd MMM yyyy")}
														</p>

														{/* Marks & Grade */}
														<div className="flex flex-wrap gap-6 mt-3">
															{evaluation.marks !== null && (
																<div className="text-center">
																	<p className="text-2xl font-bold text-hospital-primary">
																		{evaluation.marks}
																		{a.maxMarks ?
																			<span className="text-sm font-normal text-muted-foreground">
																				{" "}
																				/ {a.maxMarks}
																			</span>
																		:	""}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Marks
																	</p>
																</div>
															)}
															{evaluation.grade && (
																<div className="text-center">
																	<p className="text-2xl font-bold text-hospital-secondary">
																		{evaluation.grade}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Grade
																	</p>
																</div>
															)}
															{evaluation.marks !== null && a.maxMarks && (
																<div className="text-center">
																	<p className="text-2xl font-bold text-amber-600">
																		{(
																			(evaluation.marks / a.maxMarks) *
																			100
																		).toFixed(1)}
																		%
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Percentage
																	</p>
																</div>
															)}
														</div>

														{/* Feedback */}
														{evaluation.feedback && (
															<div className="mt-3 p-3 bg-blue-50/50 rounded-md border border-blue-100">
																<p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
																	<CheckCircle2 className="h-3 w-3" />
																	Faculty Feedback
																</p>
																<div
																	className="prose prose-sm max-w-none text-sm"
																	dangerouslySetInnerHTML={{
																		__html: renderMarkdown(evaluation.feedback),
																	}}
																/>
															</div>
														)}

														{/* Rejection Reason */}
														{evaluation.rejectionReason && (
															<div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
																<p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
																	<AlertCircle className="h-3 w-3" />
																	Reason
																</p>
																<p className="text-sm text-red-700">
																	{evaluation.rejectionReason}
																</p>
															</div>
														)}

														{evaluation.evaluatedAt && (
															<p className="text-xs text-muted-foreground mt-2">
																Evaluated{" "}
																{format(
																	new Date(evaluation.evaluatedAt),
																	"dd MMM yyyy",
																)}
																{evaluation.evaluatedBy &&
																	` by ${evaluation.evaluatedBy.firstName} ${evaluation.evaluatedBy.lastName}`}
															</p>
														)}
													</div>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>

							{totalPagesGrades > 1 && (
								<div className="flex items-center justify-between mt-4">
									<p className="text-sm text-muted-foreground">
										Showing {(gradesPage - 1) * PAGE_SIZE + 1}–
										{Math.min(
											gradesPage * PAGE_SIZE,
											assessmentsWithGrades.length,
										)}{" "}
										of {assessmentsWithGrades.length}
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setGradesPage((p) => Math.max(1, p - 1))}
											disabled={gradesPage === 1}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="flex items-center px-3 text-sm">
											{gradesPage} / {totalPagesGrades}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setGradesPage((p) => Math.min(totalPagesGrades, p + 1))
											}
											disabled={gradesPage === totalPagesGrades}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					}
				</TabsContent>
			</Tabs>

			{/* ======================== VIEW DETAIL DIALOG ======================== */}
			<Dialog
				open={!!viewingAssessment}
				onOpenChange={(v) => {
					if (!v) setViewingAssessment(null);
				}}
			>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					{viewingAssessment && (
						<>
							<DialogHeader>
								<DialogTitle className="text-xl">
									{viewingAssessment.title}
								</DialogTitle>
								<DialogDescription>
									{
										ASSESSMENT_TYPES.find(
											(t) => t.value === viewingAssessment.assessmentType,
										)?.label
									}{" "}
									• {viewingAssessment.batch.name} • By{" "}
									{viewingAssessment.createdBy.firstName}{" "}
									{viewingAssessment.createdBy.lastName}
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4 text-sm">
									{viewingAssessment.deadline && (
										<div>
											<p className="text-muted-foreground flex items-center gap-1">
												<Calendar className="h-3 w-3" /> Deadline
											</p>
											<p className="font-medium">
												{format(
													new Date(viewingAssessment.deadline),
													"dd MMM yyyy, hh:mm a",
												)}
											</p>
										</div>
									)}
									{viewingAssessment.maxMarks && (
										<div>
											<p className="text-muted-foreground">Max Marks</p>
											<p className="font-medium">
												{viewingAssessment.maxMarks}
											</p>
										</div>
									)}
								</div>

								{viewingAssessment.description && (
									<div>
										<p className="text-sm font-medium mb-2">Instructions</p>
										<div
											className="prose prose-sm max-w-none rounded-md border p-4 bg-muted/30"
											dangerouslySetInnerHTML={{
												__html: renderMarkdown(viewingAssessment.description),
											}}
										/>
									</div>
								)}

								{viewingAssessment.resourceLinks.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">Resource Links</p>
										<div className="space-y-1">
											{viewingAssessment.resourceLinks.map((link, i) => (
												<a
													key={i}
													href={getExternalUrl(link)}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-2 text-sm text-hospital-primary hover:underline"
												>
													<ExternalLink className="h-3 w-3" />
													{link}
												</a>
											))}
										</div>
									</div>
								)}

								{viewingAssessment.attachments && viewingAssessment.attachments.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">Assessment Files / Resources</p>
										<div className="space-y-1">
											{viewingAssessment.attachments.map((link, i) => (
												<a
													key={i}
													href={getExternalUrl(link)}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-2 text-sm text-hospital-primary hover:underline"
												>
													<ExternalLink className="h-3 w-3" />
													Attachment {i + 1}
												</a>
											))}
										</div>
									</div>
								)}

								{viewingAssessment.submissions[0] && viewingAssessment.submissions[0].attachments && viewingAssessment.submissions[0].attachments.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">My Submitted Attachments</p>
										<div className="space-y-1">
											{viewingAssessment.submissions[0].attachments.map((link, i) => (
												<a
													key={i}
													href={getExternalUrl(link)}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-2 text-sm text-hospital-primary hover:underline"
												>
													<ExternalLink className="h-3 w-3" />
													My Attachment {i + 1}
												</a>
											))}
										</div>
									</div>
								)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* ======================== SUBMIT DIALOG ======================== */}
			<Dialog
				open={!!submitAssessmentData}
				onOpenChange={(v) => {
					if (!v) setSubmitAssessmentData(null);
				}}
			>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					{submitAssessmentData && (
						<>
							<DialogHeader>
								<DialogTitle>Submit: {submitAssessmentData.title}</DialogTitle>
								<DialogDescription>
									{submitAssessmentData.deadline && (
										<span
											className={
												isPast(new Date(submitAssessmentData.deadline)) ?
													"text-red-600"
												:	""
											}
										>
											Deadline:{" "}
											{format(
												new Date(submitAssessmentData.deadline),
												"dd MMM yyyy, hh:mm a",
											)}
										</span>
									)}
								</DialogDescription>
							</DialogHeader>

							{submitAssessmentData.description && (
								<div className="rounded-md border p-3 bg-muted/30">
									<p className="text-xs font-medium text-muted-foreground mb-1">
										Instructions
									</p>
									<div
										className="prose prose-sm max-w-none text-sm"
										dangerouslySetInnerHTML={{
											__html: renderMarkdown(submitAssessmentData.description),
										}}
									/>
								</div>
							)}

							<div className="space-y-2">
								<Label>Your Submission (Markdown)</Label>
								<MarkdownEditor
									value={submissionContent}
									onChange={setSubmissionContent}
									placeholder="Write your submission here... Use Markdown for formatting."
									minRows={10}
								/>
							</div>

							<div className="space-y-2 border-t pt-4">
								<Label>Attachments (PDFs, Images, Docs)</Label>
								<CloudinaryUpload
									maxFiles={5}
									accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"
									value={submissionAttachments}
									onChange={setSubmissionAttachments}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Upload required resources/submissions for grading.
								</p>
							</div>

							<DialogFooter className="gap-2 sm:gap-0">
								<Button
									variant="outline"
									onClick={handleSaveDraft}
									disabled={isPending}
								>
									<Save className="mr-2 h-4 w-4" />
									Save Draft
								</Button>
								<Button
									onClick={handleSubmit}
									disabled={isPending || !submissionContent.trim()}
								>
									{isPending ?
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									:	<Send className="mr-2 h-4 w-4" />}
									Submit
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
