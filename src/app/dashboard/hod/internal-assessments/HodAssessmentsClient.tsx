/**
 * @module HodAssessmentsClient
 * @description Client component for HOD to manage internal assessments.
 * Features: inline create/edit (no popup dialogs), batch & semester selection
 * with "All" options, publishAt date, submissions detail, evaluate/reject.
 */

"use client";

import { useState, useMemo, useTransition, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	MarkdownEditor,
	renderMarkdown,
} from "@/components/shared/MarkdownEditor";
import {
	createAssessment,
	updateAssessment,
	deleteAssessment,
	togglePublishAssessment,
	evaluateSubmission,
	rejectSubmission,
	type CreateAssessmentInput,
} from "@/actions/assessments";
import {
	Plus,
	Search,
	Loader2,
	FileText,
	Trash2,
	Edit,
	Eye,
	CheckCircle2,
	XCircle,
	X,
	Users,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Calendar,
	Award,
	ClipboardList,
	Globe,
	Save,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface BatchInfo {
	id: string;
	name: string;
	currentSemester?: number;
}

interface SubmissionInfo {
	id: string;
	status: string;
	student: { id: string; firstName: string; lastName: string };
	evaluation?: { marks: number | null; grade: string | null } | null;
}

interface AssessmentRow {
	id: string;
	title: string;
	description: string | null;
	assessmentType: string;
	batchId: string;
	batch: { id: string; name: string };
	createdBy: { id: string; firstName: string; lastName: string };
	deadline: string | null;
	publishAt: string | null;
	semester: number | null;
	resourceLinks: string[];
	maxMarks: number | null;
	totalMarks: number | null;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
	assignedFacultyId?: string | null;
	assignedFaculty?: { id: string; firstName: string; lastName: string } | null;
	submissions: SubmissionInfo[];
}

interface StatsData {
	total: number;
	published: number;
	batches: {
		id: string;
		name: string;
		_count: { students: number; assessments: number };
	}[];
	statusCounts: {
		draft: number;
		submitted: number;
		signed: number;
		needsRevision: number;
	};
}

interface HodAssessmentsClientProps {
	assessments: AssessmentRow[];
	batches: BatchInfo[];
	stats: StatsData;
	facultyList: { id: string; firstName: string; lastName: string }[];
}

interface InlineForm {
	title: string;
	description: string;
	assessmentType: string;
	batchId: string;
	deadline: string;
	publishAt: string;
	semester: string; // "all" means all semesters
	maxMarks: string;
	totalMarks: string;
	resourceLinks: string;
	isPublished: boolean;
	assignedFacultyId: string; // "none" means all assigned faculty can evaluate
}

const EMPTY_FORM: InlineForm = {
	title: "",
	description: "",
	assessmentType: "OTHER",
	batchId: "",
	deadline: "",
	publishAt: "",
	semester: "all",
	maxMarks: "",
	totalMarks: "",
	resourceLinks: "",
	isPublished: false,
	assignedFacultyId: "none",
};

const ASSESSMENT_TYPES = [
	{ value: "THEORY", label: "Theory" },
	{ value: "PRACTICAL", label: "Practical" },
	{ value: "VIVA", label: "Viva" },
	{ value: "ASSIGNMENT", label: "Assignment" },
	{ value: "PROJECT", label: "Project" },
	{ value: "OTHER", label: "Other" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];
const PAGE_SIZE = 10;

type StatusFilter = "all" | "published" | "draft";
type SubmissionStatusFilter =
	| "all"
	| "SUBMITTED"
	| "SIGNED"
	| "NEEDS_REVISION"
	| "DRAFT";

// ======================== COMPONENT ========================

export function HodAssessmentsClient({
	assessments,
	batches,
	stats,
	facultyList,
}: HodAssessmentsClientProps) {
	const [isPending, startTransition] = useTransition();
	const [searchQuery, setSearchQuery] = useState("");
	const [batchFilter, setBatchFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);

	// Inline create/edit state
	const [showInlineForm, setShowInlineForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<InlineForm>(EMPTY_FORM);
	const formRef = useRef<HTMLDivElement>(null);

	// Detail sheet state
	const [detailAssessment, setDetailAssessment] =
		useState<AssessmentRow | null>(null);
	const [subStatusFilter, setSubStatusFilter] =
		useState<SubmissionStatusFilter>("all");

	// Evaluate dialog (keep as dialog — small focused form)
	const [evaluatingSubmission, setEvaluatingSubmission] =
		useState<SubmissionInfo | null>(null);
	const [evalMarks, setEvalMarks] = useState("");
	const [evalGrade, setEvalGrade] = useState("");
	const [evalFeedback, setEvalFeedback] = useState("");

	// Reject dialog
	const [rejectingSubmission, setRejectingSubmission] =
		useState<SubmissionInfo | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	// ======================== FILTERS ========================

	const filtered = useMemo(() => {
		let result = [...assessments];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(a) =>
					a.title.toLowerCase().includes(q) ||
					a.createdBy.firstName.toLowerCase().includes(q) ||
					a.createdBy.lastName.toLowerCase().includes(q) ||
					a.batch.name.toLowerCase().includes(q),
			);
		}
		if (batchFilter !== "all")
			result = result.filter((a) => a.batchId === batchFilter);
		if (typeFilter !== "all")
			result = result.filter((a) => a.assessmentType === typeFilter);
		if (statusFilter === "published")
			result = result.filter((a) => a.isPublished);
		else if (statusFilter === "draft")
			result = result.filter((a) => !a.isPublished);
		return result;
	}, [assessments, searchQuery, batchFilter, typeFilter, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// ======================== FORM HELPERS ========================

	const updateForm = useCallback((updates: Partial<InlineForm>) => {
		setForm((prev) => ({ ...prev, ...updates }));
	}, []);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setShowInlineForm(true);
		setTimeout(
			() =>
				formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
			100,
		);
	}, []);

	const openEdit = useCallback((a: AssessmentRow) => {
		setEditingId(a.id);
		setForm({
			title: a.title,
			description: a.description ?? "",
			assessmentType: a.assessmentType,
			batchId: a.batchId,
			deadline: a.deadline ? a.deadline.slice(0, 16) : "",
			publishAt: a.publishAt ? a.publishAt.slice(0, 16) : "",
			semester: a.semester?.toString() ?? "all",
			maxMarks: a.maxMarks?.toString() ?? "",
			totalMarks: a.totalMarks?.toString() ?? "",
			resourceLinks: a.resourceLinks.join("\n"),
			isPublished: a.isPublished,
			assignedFacultyId: a.assignedFacultyId ?? "none",
		});
		setShowInlineForm(true);
		setTimeout(
			() =>
				formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
			100,
		);
	}, []);

	const cancelForm = useCallback(() => {
		setShowInlineForm(false);
		setEditingId(null);
		setForm(EMPTY_FORM);
	}, []);

	const handleSave = useCallback(() => {
		if (!form.title.trim()) {
			toast.error("Title is required");
			return;
		}
		if (!form.batchId) {
			toast.error("Please select a batch");
			return;
		}

		const input: CreateAssessmentInput = {
			title: form.title.trim(),
			description: form.description.trim() || undefined,
			assessmentType:
				form.assessmentType as CreateAssessmentInput["assessmentType"],
			batchId: form.batchId,
			deadline: form.deadline || undefined,
			publishAt: form.publishAt || undefined,
			semester:
				form.semester && form.semester !== "all" ?
					parseInt(form.semester)
				:	null,
			resourceLinks: form.resourceLinks
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean),
			maxMarks: form.maxMarks ? parseInt(form.maxMarks) : undefined,
			totalMarks: form.totalMarks ? parseFloat(form.totalMarks) : undefined,
			isPublished: form.isPublished,
			assignedFacultyId: form.assignedFacultyId !== "none" ? form.assignedFacultyId : undefined,
		};

		startTransition(async () => {
			try {
				if (editingId) {
					await updateAssessment(editingId, input);
					toast.success("Assessment updated");
				} else {
					await createAssessment(input);
					toast.success("Assessment created");
				}
				cancelForm();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to save");
			}
		});
	}, [form, editingId, cancelForm]);

	const handleDelete = useCallback(
		(id: string) => {
			startTransition(async () => {
				try {
					await deleteAssessment(id);
					toast.success("Assessment deleted");
					if (editingId === id) cancelForm();
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Failed to delete");
				}
			});
		},
		[editingId, cancelForm],
	);

	const handleTogglePublish = useCallback((id: string) => {
		startTransition(async () => {
			try {
				await togglePublishAssessment(id);
				toast.success("Publish status updated");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to toggle");
			}
		});
	}, []);

	const handleEvaluate = useCallback(() => {
		if (!evaluatingSubmission) return;
		startTransition(async () => {
			try {
				await evaluateSubmission({
					submissionId: evaluatingSubmission.id,
					marks: evalMarks ? parseFloat(evalMarks) : undefined,
					grade: evalGrade.trim() || undefined,
					feedback: evalFeedback.trim() || undefined,
				});
				toast.success("Submission evaluated");
				setEvaluatingSubmission(null);
				setEvalMarks("");
				setEvalGrade("");
				setEvalFeedback("");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to evaluate");
			}
		});
	}, [evaluatingSubmission, evalMarks, evalGrade, evalFeedback]);

	const handleReject = useCallback(() => {
		if (!rejectingSubmission || !rejectReason.trim()) {
			toast.error("Please provide a reason");
			return;
		}
		startTransition(async () => {
			try {
				await rejectSubmission({
					submissionId: rejectingSubmission.id,
					rejectionReason: rejectReason.trim(),
				});
				toast.success("Submission rejected");
				setRejectingSubmission(null);
				setRejectReason("");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to reject");
			}
		});
	}, [rejectingSubmission, rejectReason]);

	// ======================== RENDER ========================

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-hospital-text-primary flex items-center gap-2">
						<ClipboardList className="h-7 w-7 text-hospital-primary" />
						Internal Assessments
					</h1>
					<p className="text-sm text-hospital-text-secondary mt-1">
						Create, manage, and evaluate internal assessments across all batches
					</p>
				</div>
				{!showInlineForm && (
					<Button onClick={openCreate} disabled={isPending}>
						<Plus className="mr-2 h-4 w-4" />
						Create Assessment
					</Button>
				)}
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-hospital-primary/10 p-2">
								<FileText className="h-5 w-5 text-hospital-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.total}</p>
								<p className="text-xs text-muted-foreground">Total</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-green-100 p-2">
								<Globe className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.published}</p>
								<p className="text-xs text-muted-foreground">Published</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-amber-100 p-2">
								<Users className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{stats.statusCounts.submitted}
								</p>
								<p className="text-xs text-muted-foreground">Pending Review</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2">
								<Award className="h-5 w-5 text-blue-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{stats.statusCounts.signed}
								</p>
								<p className="text-xs text-muted-foreground">Evaluated</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ======================== INLINE CREATE/EDIT FORM ======================== */}
			{showInlineForm && (
				<Card
					ref={formRef}
					className="border-2 border-hospital-primary/30 shadow-md"
				>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg flex items-center gap-2">
								{editingId ?
									<Edit className="h-5 w-5" />
								:	<Plus className="h-5 w-5" />}
								{editingId ? "Edit Assessment" : "Create New Assessment"}
							</CardTitle>
							<Button variant="ghost" size="icon" onClick={cancelForm}>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Row 1: Title */}
						<div className="space-y-2">
							<Label htmlFor="form-title">
								Title <span className="text-red-500">*</span>
							</Label>
							<Input
								id="form-title"
								value={form.title}
								onChange={(e) => updateForm({ title: e.target.value })}
								placeholder="e.g., Theory Assessment - Emergency Medicine Module 3"
							/>
						</div>

						{/* Row 2: Batch, Semester, Type, Assigned Faculty */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label>
									Batch <span className="text-red-500">*</span>
								</Label>
								<Select
									value={form.batchId}
									onValueChange={(v) => updateForm({ batchId: v })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select batch" />
									</SelectTrigger>
									<SelectContent>
										{batches.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}{" "}
												{b.currentSemester ? `(Sem ${b.currentSemester})` : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Semester</Label>
								<Select
									value={form.semester}
									onValueChange={(v) => updateForm({ semester: v })}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Semesters" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Semesters</SelectItem>
										{SEMESTERS.map((s) => (
											<SelectItem key={s} value={s.toString()}>
												Semester {s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Assessment Type</Label>
								<Select
									value={form.assessmentType}
									onValueChange={(v) => updateForm({ assessmentType: v })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ASSESSMENT_TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Assigned Evaluator</Label>
								<Select
									value={form.assignedFacultyId}
									onValueChange={(v) => updateForm({ assignedFacultyId: v })}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Available Faculty" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">All Available Faculty</SelectItem>
										{facultyList.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.firstName} {f.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Row 3: Deadline, Publish At, Max Marks, Total Marks */}
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label htmlFor="form-deadline">Deadline</Label>
								<Input
									id="form-deadline"
									type="datetime-local"
									value={form.deadline}
									onChange={(e) => updateForm({ deadline: e.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="form-publishAt">Publish Date</Label>
								<Input
									id="form-publishAt"
									type="datetime-local"
									value={form.publishAt}
									onChange={(e) => updateForm({ publishAt: e.target.value })}
								/>
								<p className="text-xs text-muted-foreground">
									Schedule when to publish
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="form-maxMarks">Max Marks</Label>
								<Input
									id="form-maxMarks"
									type="number"
									min={0}
									value={form.maxMarks}
									onChange={(e) => updateForm({ maxMarks: e.target.value })}
									placeholder="100"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="form-totalMarks">Total Marks</Label>
								<Input
									id="form-totalMarks"
									type="number"
									min={0}
									step="0.1"
									value={form.totalMarks}
									onChange={(e) => updateForm({ totalMarks: e.target.value })}
									placeholder="200"
								/>
							</div>
						</div>

						{/* Row 4: Description (Markdown) */}
						<div className="space-y-2">
							<Label>Instructions / Description (Markdown)</Label>
							<MarkdownEditor
								value={form.description}
								onChange={(v) => updateForm({ description: v })}
								placeholder="Write instructions, topics, format, grading criteria..."
								minRows={6}
							/>
						</div>

						{/* Row 5: Resource Links */}
						<div className="space-y-2">
							<Label htmlFor="form-links">
								Resource Links{" "}
								<span className="text-xs text-muted-foreground">
									(one per line)
								</span>
							</Label>
							<Textarea
								id="form-links"
								value={form.resourceLinks}
								onChange={(e) => updateForm({ resourceLinks: e.target.value })}
								placeholder={
									"https://example.com/study-material\nhttps://example.com/reference"
								}
								rows={3}
							/>
						</div>

						{/* Row 6: Publish toggle + Save */}
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 border-t">
							<div className="flex items-center gap-3">
								<Switch
									id="form-published"
									checked={form.isPublished}
									onCheckedChange={(v) => updateForm({ isPublished: v })}
								/>
								<Label htmlFor="form-published" className="cursor-pointer">
									{form.isPublished ?
										"Published — visible to students"
									:	"Draft — not visible to students"}
								</Label>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={cancelForm}
									disabled={isPending}
								>
									Cancel
								</Button>
								<Button onClick={handleSave} disabled={isPending}>
									{isPending ?
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									:	<Save className="mr-2 h-4 w-4" />}
									{editingId ? "Update Assessment" : "Create Assessment"}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Filters */}
			<Card>
				<CardContent className="pt-4 pb-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search assessments..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setPage(1);
								}}
								className="pl-10"
							/>
						</div>
						<Select
							value={batchFilter}
							onValueChange={(v) => {
								setBatchFilter(v);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-45">
								<SelectValue placeholder="Batch" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Batches</SelectItem>
								{batches.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
						<Select
							value={statusFilter}
							onValueChange={(v) => {
								setStatusFilter(v as StatusFilter);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="published">Published</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* ======================== TABLE ======================== */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						Assessments ({filtered.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{filtered.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
							<p className="text-lg font-medium">No assessments found</p>
							<p className="text-sm mt-1">
								Create your first assessment to get started
							</p>
						</div>
					:	<>
							<div className="rounded-md border overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-50">Title</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Batch</TableHead>
											<TableHead>Semester</TableHead>
											<TableHead>Deadline</TableHead>
											<TableHead className="text-center">Submissions</TableHead>
											<TableHead className="text-center">Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginated.map((a) => {
											const submittedCount = a.submissions.filter(
												(s) => s.status !== "DRAFT",
											).length;
											const evaluatedCount = a.submissions.filter(
												(s) => s.status === "SIGNED",
											).length;
											const isBeingEdited = editingId === a.id;

											return (
												<TableRow
													key={a.id}
													className={
														isBeingEdited ?
															"bg-blue-50/50 ring-1 ring-blue-200"
														:	""
													}
												>
													<TableCell>
														<button
															onClick={() => setDetailAssessment(a)}
															className="text-left hover:text-hospital-primary font-medium transition-colors"
														>
															{a.title}
														</button>
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="text-xs">
															{ASSESSMENT_TYPES.find(
																(t) => t.value === a.assessmentType,
															)?.label ?? a.assessmentType}
														</Badge>
													</TableCell>
													<TableCell className="text-sm">
														{a.batch.name}
													</TableCell>
													<TableCell className="text-sm">
														{a.semester ? `Sem ${a.semester}` : "All"}
													</TableCell>
													<TableCell className="text-sm">
														{a.deadline ?
															format(new Date(a.deadline), "dd MMM yyyy")
														:	"—"}
													</TableCell>
													<TableCell className="text-center">
														<span className="text-sm font-medium">
															{submittedCount}
														</span>
														{evaluatedCount > 0 && (
															<span className="text-xs text-green-600 ml-1">
																({evaluatedCount} graded)
															</span>
														)}
													</TableCell>
													<TableCell className="text-center">
														{a.isPublished ?
															<Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
																Published
															</Badge>
														:	<Badge variant="secondary" className="text-xs">
																Draft
															</Badge>
														}
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-1">
															<Button
																variant="ghost"
																size="icon"
																onClick={() => setDetailAssessment(a)}
																title="View Details"
															>
																<Eye className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => openEdit(a)}
																title="Edit"
															>
																<Edit className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleTogglePublish(a.id)}
																disabled={isPending}
																title={a.isPublished ? "Unpublish" : "Publish"}
															>
																<Globe className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleDelete(a.id)}
																disabled={isPending}
																title="Delete"
																className="text-red-500 hover:text-red-700"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{totalPages > 1 && (
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
											{page} / {totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page === totalPages}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					}
				</CardContent>
			</Card>

			{/* ======================== DETAIL SHEET ======================== */}
			<Sheet
				open={!!detailAssessment}
				onOpenChange={(v) => {
					if (!v) setDetailAssessment(null);
				}}
			>
				<SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
					{detailAssessment && (
						<>
							<SheetHeader>
								<SheetTitle className="text-xl">
									{detailAssessment.title}
								</SheetTitle>
								<SheetDescription>
									{detailAssessment.batch.name}
									{detailAssessment.semester &&
										` • Semester ${detailAssessment.semester}`}
									{" • "}
									{
										ASSESSMENT_TYPES.find(
											(t) => t.value === detailAssessment.assessmentType,
										)?.label
									}
									{" • Created by "}
									{detailAssessment.createdBy.firstName}{" "}
									{detailAssessment.createdBy.lastName}
									{detailAssessment.isPublished ?
										<Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 text-xs">
											Published
										</Badge>
									:	<Badge variant="secondary" className="ml-2 text-xs">
											Draft
										</Badge>
									}
								</SheetDescription>
							</SheetHeader>

							<div className="space-y-6 mt-6">
								{/* Meta info */}
								<div className="grid grid-cols-2 gap-4 text-sm">
									{detailAssessment.deadline && (
										<div>
											<p className="text-muted-foreground flex items-center gap-1">
												<Calendar className="h-3 w-3" /> Deadline
											</p>
											<p className="font-medium">
												{format(
													new Date(detailAssessment.deadline),
													"dd MMM yyyy, hh:mm a",
												)}
											</p>
										</div>
									)}
									{detailAssessment.publishAt && (
										<div>
											<p className="text-muted-foreground">Scheduled Publish</p>
											<p className="font-medium">
												{format(
													new Date(detailAssessment.publishAt),
													"dd MMM yyyy, hh:mm a",
												)}
											</p>
										</div>
									)}
									{detailAssessment.maxMarks && (
										<div>
											<p className="text-muted-foreground">Max Marks</p>
											<p className="font-medium">{detailAssessment.maxMarks}</p>
										</div>
									)}
									{detailAssessment.totalMarks && (
										<div>
											<p className="text-muted-foreground">Total Marks</p>
											<p className="font-medium">
												{detailAssessment.totalMarks}
											</p>
										</div>
									)}
								</div>

								{/* Description / Instructions */}
								{detailAssessment.description && (
									<div>
										<p className="text-sm font-medium mb-2">Instructions</p>
										<div
											className="prose prose-sm max-w-none rounded-md border p-3 bg-muted/30"
											dangerouslySetInnerHTML={{
												__html: renderMarkdown(detailAssessment.description),
											}}
										/>
									</div>
								)}

								{/* Resource Links */}
								{detailAssessment.resourceLinks.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">Resource Links</p>
										<div className="space-y-1">
											{detailAssessment.resourceLinks.map((link, i) => (
												<a
													key={i}
													href={link}
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

								{/* Submissions */}
								<div>
									<div className="flex items-center justify-between mb-3">
										<p className="text-sm font-medium">
											Student Submissions ({detailAssessment.submissions.length}
											)
										</p>
										<Select
											value={subStatusFilter}
											onValueChange={(v) =>
												setSubStatusFilter(v as SubmissionStatusFilter)
											}
										>
											<SelectTrigger className="w-40 h-8 text-xs">
												<SelectValue placeholder="Filter" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All</SelectItem>
												<SelectItem value="SUBMITTED">Submitted</SelectItem>
												<SelectItem value="SIGNED">Evaluated</SelectItem>
												<SelectItem value="NEEDS_REVISION">
													Needs Revision
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{(() => {
										const subs =
											subStatusFilter === "all" ?
												detailAssessment.submissions
											:	detailAssessment.submissions.filter(
													(s) => s.status === subStatusFilter,
												);

										if (subs.length === 0) {
											return (
												<p className="text-sm text-muted-foreground text-center py-6">
													No submissions found
												</p>
											);
										}

										return (
											<div className="rounded-md border overflow-x-auto">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Student</TableHead>
															<TableHead>Status</TableHead>
															<TableHead className="text-center">
																Marks
															</TableHead>
															<TableHead className="text-center">
																Grade
															</TableHead>
															<TableHead className="text-right">
																Actions
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{subs.map((sub) => (
															<TableRow key={sub.id}>
																<TableCell className="font-medium">
																	{sub.student.firstName} {sub.student.lastName}
																</TableCell>
																<TableCell>
																	<StatusBadge
																		status={sub.status as EntryStatus}
																		size="sm"
																	/>
																</TableCell>
																<TableCell className="text-center">
																	{sub.evaluation?.marks ?? "—"}
																	{detailAssessment.maxMarks ?
																		` / ${detailAssessment.maxMarks}`
																	:	""}
																</TableCell>
																<TableCell className="text-center">
																	{sub.evaluation?.grade ?? "—"}
																</TableCell>
																<TableCell className="text-right">
																	<div className="flex justify-end gap-1">
																		{sub.status === "SUBMITTED" && (
																			<>
																				<Button
																					size="sm"
																					variant="outline"
																					onClick={() => {
																						setEvaluatingSubmission(sub);
																						setEvalMarks(
																							sub.evaluation?.marks?.toString() ??
																								"",
																						);
																						setEvalGrade(
																							sub.evaluation?.grade ?? "",
																						);
																						setEvalFeedback("");
																					}}
																				>
																					<CheckCircle2 className="mr-1 h-3 w-3" />
																					Evaluate
																				</Button>
																				<Button
																					size="sm"
																					variant="outline"
																					className="text-red-500 border-red-200"
																					onClick={() => {
																						setRejectingSubmission(sub);
																						setRejectReason("");
																					}}
																				>
																					<XCircle className="mr-1 h-3 w-3" />
																					Reject
																				</Button>
																			</>
																		)}
																		{sub.status === "SIGNED" && (
																			<Button
																				size="sm"
																				variant="ghost"
																				onClick={() => {
																					setEvaluatingSubmission(sub);
																					setEvalMarks(
																						sub.evaluation?.marks?.toString() ??
																							"",
																					);
																					setEvalGrade(
																						sub.evaluation?.grade ?? "",
																					);
																					setEvalFeedback("");
																				}}
																			>
																				<Edit className="mr-1 h-3 w-3" />
																				Edit
																			</Button>
																		)}
																	</div>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										);
									})()}
								</div>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* ======================== EVALUATE DIALOG ======================== */}
			<Dialog
				open={!!evaluatingSubmission}
				onOpenChange={(v) => {
					if (!v) setEvaluatingSubmission(null);
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Evaluate Submission</DialogTitle>
						<DialogDescription>
							{evaluatingSubmission && (
								<>
									Student: {evaluatingSubmission.student.firstName}{" "}
									{evaluatingSubmission.student.lastName}
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="evalMarks">
									Marks{" "}
									{detailAssessment?.maxMarks && (
										<span className="text-xs text-muted-foreground">
											(out of {detailAssessment.maxMarks})
										</span>
									)}
								</Label>
								<Input
									id="evalMarks"
									type="number"
									min={0}
									max={detailAssessment?.maxMarks ?? undefined}
									step="0.5"
									value={evalMarks}
									onChange={(e) => setEvalMarks(e.target.value)}
									placeholder="85"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="evalGrade">Grade</Label>
								<Input
									id="evalGrade"
									value={evalGrade}
									onChange={(e) => setEvalGrade(e.target.value)}
									placeholder="A+, Pass, Distinction"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Feedback (Markdown)</Label>
							<MarkdownEditor
								value={evalFeedback}
								onChange={setEvalFeedback}
								placeholder="Write feedback for the student..."
								minRows={4}
								compact
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEvaluatingSubmission(null)}
						>
							Cancel
						</Button>
						<Button onClick={handleEvaluate} disabled={isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save Evaluation
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ======================== REJECT DIALOG ======================== */}
			<Dialog
				open={!!rejectingSubmission}
				onOpenChange={(v) => {
					if (!v) setRejectingSubmission(null);
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-red-600">
							Reject Submission
						</DialogTitle>
						<DialogDescription>
							{rejectingSubmission && (
								<>
									Student: {rejectingSubmission.student.firstName}{" "}
									{rejectingSubmission.student.lastName}
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="rejectReason">
								Reason for Rejection <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="rejectReason"
								value={rejectReason}
								onChange={(e) => setRejectReason(e.target.value)}
								placeholder="Explain why this submission is being rejected..."
								rows={4}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectingSubmission(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={isPending || !rejectReason.trim()}
						>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Reject
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
