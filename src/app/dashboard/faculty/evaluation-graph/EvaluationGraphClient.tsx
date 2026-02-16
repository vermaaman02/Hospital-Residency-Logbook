/**
 * @module EvaluationGraphClient
 * @description Client component for Resident Evaluation Graph.
 * Used by faculty and HOD to fill 5-domain evaluations + Theory/Practical marks.
 * Supports inline cell editing, batch filter, search, pagination.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
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
import { toast } from "sonner";
import {
	Loader2,
	Check,
	X,
	Target,
	Pencil,
	Search,
	ChevronLeft,
	ChevronRight,
	Users,
	FileCheck,
	Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	upsertEvaluationGraphEntry,
	signEvaluationGraphEntry,
	bulkSignEvaluationGraphEntries,
	deleteEvaluationGraphEntry,
	type EvaluationGraphEntry,
} from "@/actions/evaluation-graph";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
	exportEvaluationGraphReviewToExcel,
	type EvaluationGraphReviewRow,
} from "@/lib/export/export-excel";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Student {
	id: string;
	clerkId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	batchRelation?: { name: string } | null;
	currentSemester?: number | null;
}

export interface Batch {
	id: string;
	name: string;
}

interface EvaluationGraphClientProps {
	students: Student[];
	batches: Batch[];
	existingRecords: EvaluationGraphEntry[];
	role: "faculty" | "hod";
}

const DOMAINS = [
	{
		key: "knowledgeScore",
		label: "Knowledge",
		shortLabel: "Know.",
		color: "#0066CC",
	},
	{
		key: "clinicalSkillScore",
		label: "Clinical Skills",
		shortLabel: "Clinical",
		color: "#00897B",
	},
	{
		key: "proceduralSkillScore",
		label: "Procedural Skills",
		shortLabel: "Proc.",
		color: "#D32F2F",
	},
	{
		key: "softSkillScore",
		label: "Soft Skills",
		shortLabel: "Soft",
		color: "#F59E0B",
	},
	{
		key: "researchScore",
		label: "Research",
		shortLabel: "Research",
		color: "#7C3AED",
	},
] as const;

const SCORE_OPTIONS = [
	{ value: "5", label: "5 — Exceptional" },
	{ value: "4", label: "4 — Exceeds" },
	{ value: "3", label: "3 — Meets" },
	{ value: "2", label: "2 — Inconsistent" },
	{ value: "1", label: "1 — Remedial" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];

const STUDENTS_PER_PAGE = 10;

export function EvaluationGraphClient({
	students,
	batches,
	existingRecords,
	role,
}: EvaluationGraphClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedStudent, setSelectedStudent] = useState<string>("");

	// Search & filter state
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [page, setPage] = useState(1);

	// Inline editing state
	const [editingSemester, setEditingSemester] = useState<number | null>(null);
	const [scores, setScores] = useState<Record<string, string>>({
		knowledgeScore: "",
		clinicalSkillScore: "",
		proceduralSkillScore: "",
		softSkillScore: "",
		researchScore: "",
	});
	const [theoryMarks, setTheoryMarks] = useState("");
	const [practicalMarks, setPracticalMarks] = useState("");
	const [remarks, setRemarks] = useState("");

	// Bulk sign state (HOD only)
	const [selectedForSign, setSelectedForSign] = useState<Set<string>>(
		new Set(),
	);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	// Export handler
	const handleExport = useCallback(() => {
		const recordsToExport =
			selectedStudent ?
				existingRecords.filter((r) => r.userId === selectedStudent)
			:	existingRecords;

		const exportRows: EvaluationGraphReviewRow[] = recordsToExport.map((r) => {
			const student = students.find((s) => s.id === r.userId);
			return {
				studentName:
					`${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim(),
				batch: student?.batchRelation?.name ?? "—",
				semester: r.semester,
				knowledgeScore: r.knowledgeScore,
				clinicalSkillScore: r.clinicalSkillScore,
				proceduralSkillScore: r.proceduralSkillScore,
				softSkillScore: r.softSkillScore,
				researchScore: r.researchScore,
				overallScore: r.overallScore,
				theoryMarks: r.theoryMarks ?? null,
				practicalMarks: r.practicalMarks ?? null,
				remarks: r.remarks ?? null,
				status: r.status,
			};
		});

		exportEvaluationGraphReviewToExcel(exportRows, role);
		toast.success("Exported evaluation graph data to Excel");
	}, [existingRecords, students, selectedStudent, role]);

	// Filtered & paginated student list
	const filteredStudents = useMemo(() => {
		return students.filter((s) => {
			const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
			const q = search.toLowerCase();
			const matchesSearch =
				!q || name.includes(q) || (s.email ?? "").toLowerCase().includes(q);
			const matchesBatch =
				batchFilter === "ALL" || s.batchRelation?.name === batchFilter;
			return matchesSearch && matchesBatch;
		});
	}, [students, search, batchFilter]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE),
	);
	const paginatedStudents = filteredStudents.slice(
		(page - 1) * STUDENTS_PER_PAGE,
		page * STUDENTS_PER_PAGE,
	);

	const handleSearch = useCallback((val: string) => {
		setSearch(val);
		setPage(1);
	}, []);
	const handleBatchFilter = useCallback((val: string) => {
		setBatchFilter(val);
		setPage(1);
	}, []);

	const studentRecords = useMemo(
		() =>
			existingRecords
				.filter((r) => r.userId === selectedStudent)
				.sort((a, b) => a.semester - b.semester),
		[existingRecords, selectedStudent],
	);

	const getRecord = useCallback(
		(sem: number): EvaluationGraphEntry | undefined => {
			return studentRecords.find((r) => r.semester === sem);
		},
		[studentRecords],
	);

	const overallScore = useMemo(() => {
		const vals = Object.values(scores)
			.map((v) => parseInt(v))
			.filter((v) => !isNaN(v));
		if (vals.length === 0) return null;
		return (
			Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
		);
	}, [scores]);

	// Get pending records for bulk sign (HOD only)
	const pendingRecords = useMemo(() => {
		if (role !== "hod") return [];
		return existingRecords.filter((r) => r.status === "SUBMITTED");
	}, [existingRecords, role]);

	function handleStudentChange(studentId: string) {
		setSelectedStudent(studentId);
		setEditingSemester(null);
	}

	function startEditing(sem: number) {
		const record = getRecord(sem);
		setEditingSemester(sem);
		setScores({
			knowledgeScore: record?.knowledgeScore?.toString() ?? "",
			clinicalSkillScore: record?.clinicalSkillScore?.toString() ?? "",
			proceduralSkillScore: record?.proceduralSkillScore?.toString() ?? "",
			softSkillScore: record?.softSkillScore?.toString() ?? "",
			researchScore: record?.researchScore?.toString() ?? "",
		});
		setTheoryMarks(record?.theoryMarks ?? "");
		setPracticalMarks(record?.practicalMarks ?? "");
		setRemarks(record?.remarks ?? "");
	}

	function cancelEditing() {
		setEditingSemester(null);
	}

	function handleSave() {
		if (!selectedStudent || editingSemester === null) return;
		const hasAnyScore = Object.values(scores).some((v) => v !== "");
		if (!hasAnyScore) {
			toast.error("Please assign at least one domain score");
			return;
		}

		const payload: Record<string, number | string | undefined> = {
			remarks: remarks || undefined,
			theoryMarks: theoryMarks || undefined,
			practicalMarks: practicalMarks || undefined,
		};
		for (const domain of DOMAINS) {
			const val = scores[domain.key];
			if (val) payload[domain.key] = parseInt(val);
		}

		startTransition(async () => {
			try {
				await upsertEvaluationGraphEntry(
					selectedStudent,
					editingSemester,
					payload as Parameters<typeof upsertEvaluationGraphEntry>[2],
				);
				toast.success(`Semester ${editingSemester} evaluation saved`);
				setEditingSemester(null);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to save evaluation",
				);
			}
		});
	}

	function handleSign(recordId: string) {
		startTransition(async () => {
			try {
				await signEvaluationGraphEntry(recordId);
				toast.success("Evaluation signed");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to sign evaluation",
				);
			}
		});
	}

	function handleBulkSign() {
		if (selectedForSign.size === 0) return;
		startTransition(async () => {
			try {
				await bulkSignEvaluationGraphEntries(Array.from(selectedForSign));
				toast.success(`${selectedForSign.size} evaluation(s) signed`);
				setSelectedForSign(new Set());
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to bulk sign",
				);
			}
		});
	}

	function confirmDelete(recordId: string) {
		setDeleteId(recordId);
		setShowDeleteDialog(true);
	}

	function handleDelete() {
		if (!deleteId) return;
		startTransition(async () => {
			try {
				await deleteEvaluationGraphEntry(deleteId);
				toast.success("Evaluation deleted");
				setShowDeleteDialog(false);
				setDeleteId(null);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ?
						error.message
					:	"Failed to delete evaluation",
				);
			}
		});
	}

	function toggleSelectForSign(recordId: string) {
		setSelectedForSign((prev) => {
			const next = new Set(prev);
			if (next.has(recordId)) {
				next.delete(recordId);
			} else {
				next.add(recordId);
			}
			return next;
		});
	}

	function toggleSelectAll() {
		if (selectedForSign.size === pendingRecords.length) {
			setSelectedForSign(new Set());
		} else {
			setSelectedForSign(new Set(pendingRecords.map((r) => r.id)));
		}
	}

	if (students.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
				<p className="text-lg font-medium">No assigned students</p>
				<p className="text-sm mt-1">
					{role === "faculty" ?
						"Ask the HOD to assign students to you from the Manage Users page."
					:	"No students are registered in the system yet."}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Bulk Sign Bar (HOD only) */}
			{role === "hod" && pendingRecords.length > 0 && (
				<Card className="border-amber-200 bg-amber-50/50">
					<CardContent className="p-4">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<Checkbox
									checked={
										selectedForSign.size === pendingRecords.length &&
										pendingRecords.length > 0
									}
									onCheckedChange={toggleSelectAll}
								/>
								<span className="text-sm font-medium">
									{selectedForSign.size} of {pendingRecords.length} pending
									evaluation(s) selected
								</span>
							</div>
							<Button
								size="sm"
								onClick={handleBulkSign}
								disabled={selectedForSign.size === 0 || isPending}
							>
								{isPending ?
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								:	<FileCheck className="h-4 w-4 mr-2" />}
								Sign Selected ({selectedForSign.size})
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Student Selection with Search & Filter */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Target className="h-5 w-5 text-hospital-primary" />
						<CardTitle>5-Domain Evaluation Graph</CardTitle>
					</div>
					<CardDescription>
						Search and select a student, then click a semester row to evaluate
						inline
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Search & Filter Bar */}
					<div className="flex flex-col sm:flex-row gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={existingRecords.length === 0}
							className="shrink-0"
						>
							<Download className="h-4 w-4 mr-1" />
							Export
						</Button>
					</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="Search by student name or email..."
								value={search}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						{batches.length > 0 && (
							<Select value={batchFilter} onValueChange={handleBatchFilter}>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Batch" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Batches</SelectItem>
									{batches.map((b) => (
										<SelectItem key={b.id} value={b.name}>
											{b.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Student List */}
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="font-bold">Student</TableHead>
									<TableHead className="font-bold hidden sm:table-cell">
										Batch
									</TableHead>
									<TableHead className="font-bold hidden sm:table-cell text-center">
										Semesters Evaluated
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Select
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedStudents.length === 0 ?
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-6 text-muted-foreground"
										>
											{search || batchFilter !== "ALL" ?
												"No matching students"
											:	"No students available"}
										</TableCell>
									</TableRow>
								:	paginatedStudents.map((s) => {
										const recordCount = existingRecords.filter(
											(r) =>
												r.userId === s.id &&
												DOMAINS.some(
													(d) =>
														(r as unknown as Record<string, unknown>)[d.key] !==
														null,
												),
										).length;
										const isSelected = selectedStudent === s.id;
										return (
											<TableRow
												key={s.id}
												className={cn(
													"cursor-pointer transition-colors",
													isSelected ?
														"bg-hospital-primary/10 border-l-2 border-hospital-primary"
													:	"hover:bg-muted/40",
												)}
												onClick={() => handleStudentChange(s.id)}
											>
												<TableCell className="font-medium">
													<Link
														href={`/dashboard/${role}/evaluation-graph/student/${s.id}`}
														className="group"
														onClick={(e) => e.stopPropagation()}
													>
														<div className="text-hospital-primary group-hover:underline">
															{s.firstName} {s.lastName}
														</div>
														<span className="block text-xs text-muted-foreground">
															{s.email}
														</span>
													</Link>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
													{s.batchRelation?.name ?? "—"}
												</TableCell>
												<TableCell className="text-center hidden sm:table-cell">
													<Badge
														variant={recordCount > 0 ? "default" : "outline"}
														className={cn(
															"text-xs",
															recordCount > 0 &&
																"bg-green-100 text-green-700 hover:bg-green-100",
														)}
													>
														{recordCount}/6
													</Badge>
												</TableCell>
												<TableCell className="text-center">
													{isSelected ?
														<Badge className="bg-hospital-primary text-white text-xs">
															Selected
														</Badge>
													:	<Button
															variant="ghost"
															size="sm"
															className="text-xs h-7"
														>
															<Users className="h-3.5 w-3.5 mr-1" /> Evaluate
														</Button>
													}
												</TableCell>
											</TableRow>
										);
									})
								}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-1">
							<p className="text-sm text-muted-foreground">
								{filteredStudents.length} student
								{filteredStudents.length !== 1 ? "s" : ""}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="text-sm font-medium">
									{page} / {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Inline Scoring Table */}
			{selectedStudent && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">
							Semester-wise Evaluation —{" "}
							{students.find((s) => s.id === selectedStudent)?.firstName}{" "}
							{students.find((s) => s.id === selectedStudent)?.lastName}
						</CardTitle>
						<CardDescription>
							Click on any semester row to edit scores inline (1-5 per domain)
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 sm:p-6 overflow-x-auto">
						<div className="border rounded-lg min-w-225">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										{role === "hod" && (
											<TableHead className="w-10 text-center">
												<span className="sr-only">Select</span>
											</TableHead>
										)}
										<TableHead className="w-16 text-center font-bold">
											Sem
										</TableHead>
										{DOMAINS.map((d) => (
											<TableHead key={d.key} className="font-bold text-center">
												<div className="flex items-center justify-center gap-1">
													<span
														className="h-2 w-2 rounded-full shrink-0"
														style={{ backgroundColor: d.color }}
													/>
													<span className="hidden lg:inline">{d.label}</span>
													<span className="lg:hidden">{d.shortLabel}</span>
												</div>
											</TableHead>
										))}
										<TableHead className="w-16 text-center font-bold">
											Theory
										</TableHead>
										<TableHead className="w-16 text-center font-bold">
											Prac.
										</TableHead>
										<TableHead className="w-16 text-center font-bold">
											Overall
										</TableHead>
										<TableHead className="w-24 text-center font-bold">
											Status
										</TableHead>
										<TableHead className="w-28 text-center font-bold">
											Action
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{SEMESTERS.map((sem) => {
										const record = getRecord(sem);
										const isEditing = editingSemester === sem;

										if (isEditing) {
											return (
												<InlineEditRow
													key={sem}
													semester={sem}
													scores={scores}
													theoryMarks={theoryMarks}
													practicalMarks={practicalMarks}
													remarks={remarks}
													overallScore={overallScore}
													isPending={isPending}
													showCheckbox={role === "hod"}
													onScoreChange={(key, val) =>
														setScores((prev) => ({
															...prev,
															[key]: val === "none" ? "" : val,
														}))
													}
													onTheoryMarksChange={setTheoryMarks}
													onPracticalMarksChange={setPracticalMarks}
													onRemarksChange={setRemarks}
													onSave={handleSave}
													onCancel={cancelEditing}
												/>
											);
										}

										return (
											<ReadOnlyRow
												key={sem}
												semester={sem}
												record={record}
												role={role}
												isSelected={
													record ? selectedForSign.has(record.id) : false
												}
												onSelect={() =>
													record && toggleSelectForSign(record.id)
												}
												onClick={() => startEditing(sem)}
												onSign={() => record && handleSign(record.id)}
												onDelete={() => record && confirmDelete(record.id)}
												isPending={isPending}
											/>
										);
									})}
								</TableBody>
							</Table>
						</div>

						{/* Score Legend */}
						<div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground px-2 sm:px-0">
							<span className="font-medium">Scale:</span>
							<span>1 = Remedial</span>
							<span>2 = Inconsistent</span>
							<span>3 = Meets</span>
							<span>4 = Exceeds</span>
							<span>5 = Exceptional</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Evaluation?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. The evaluation record will be
							permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isPending}
							className="bg-red-600 hover:bg-red-700"
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

// ======================== INLINE EDIT ROW ========================

interface InlineEditRowProps {
	semester: number;
	scores: Record<string, string>;
	theoryMarks: string;
	practicalMarks: string;
	remarks: string;
	overallScore: number | null;
	isPending: boolean;
	showCheckbox: boolean;
	onScoreChange: (key: string, value: string) => void;
	onTheoryMarksChange: (value: string) => void;
	onPracticalMarksChange: (value: string) => void;
	onRemarksChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
}

function InlineEditRow({
	semester,
	scores,
	theoryMarks,
	practicalMarks,
	remarks,
	overallScore,
	isPending,
	showCheckbox,
	onScoreChange,
	onTheoryMarksChange,
	onPracticalMarksChange,
	onRemarksChange,
	onSave,
	onCancel,
}: InlineEditRowProps) {
	return (
		<>
			<TableRow className="bg-blue-50/60">
				{showCheckbox && <TableCell />}
				<TableCell className="text-center font-bold text-hospital-primary">
					{semester}
				</TableCell>
				{DOMAINS.map((domain) => (
					<TableCell key={domain.key} className="text-center">
						<Select
							value={scores[domain.key] || "none"}
							onValueChange={(v) => onScoreChange(domain.key, v)}
						>
							<SelectTrigger className="h-8 text-sm w-full min-w-16">
								<SelectValue placeholder="—" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">—</SelectItem>
								{SCORE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</TableCell>
				))}
				<TableCell className="text-center">
					<Input
						className="h-8 text-sm w-16 text-center"
						placeholder="—"
						value={theoryMarks}
						onChange={(e) => onTheoryMarksChange(e.target.value)}
						maxLength={10}
					/>
				</TableCell>
				<TableCell className="text-center">
					<Input
						className="h-8 text-sm w-16 text-center"
						placeholder="—"
						value={practicalMarks}
						onChange={(e) => onPracticalMarksChange(e.target.value)}
						maxLength={10}
					/>
				</TableCell>
				<TableCell className="text-center font-bold">
					{overallScore !== null ?
						<Badge variant="default" className="bg-hospital-primary text-white">
							{overallScore.toFixed(1)}
						</Badge>
					:	"—"}
				</TableCell>
				<TableCell className="text-center">
					<Badge variant="outline" className="text-amber-600 border-amber-300">
						Editing
					</Badge>
				</TableCell>
				<TableCell>
					<div className="flex items-center justify-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
							onClick={onSave}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							:	<Check className="h-3.5 w-3.5" />}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
							onClick={onCancel}
							disabled={isPending}
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
				</TableCell>
			</TableRow>
			{/* Remarks row (part of editing) */}
			<TableRow className="bg-blue-50/40 border-b-2 border-blue-200">
				{showCheckbox && <TableCell />}
				<TableCell className="text-right text-xs text-muted-foreground">
					Remarks:
				</TableCell>
				<TableCell colSpan={9}>
					<Textarea
						className="h-9 min-h-9 text-sm resize-none"
						placeholder="Optional remarks about performance..."
						value={remarks}
						onChange={(e) => onRemarksChange(e.target.value)}
						rows={1}
						maxLength={1000}
					/>
				</TableCell>
			</TableRow>
		</>
	);
}

// ======================== READ-ONLY ROW ========================

interface ReadOnlyRowProps {
	semester: number;
	record: EvaluationGraphEntry | undefined;
	role: "faculty" | "hod";
	isSelected: boolean;
	onSelect: () => void;
	onClick: () => void;
	onSign: () => void;
	onDelete: () => void;
	isPending: boolean;
}

function ReadOnlyRow({
	semester,
	record,
	role,
	isSelected,
	onSelect,
	onClick,
	onSign,
	onDelete,
	isPending,
}: ReadOnlyRowProps) {
	const hasData =
		record &&
		DOMAINS.some(
			(d) =>
				(record[d.key as keyof EvaluationGraphEntry] as number | null) !== null,
		);
	const canSign = role === "hod" && record && record.status === "SUBMITTED";
	const canDelete = role === "hod" && record;

	return (
		<TableRow
			className={cn(
				"cursor-pointer transition-colors hover:bg-muted/40",
				hasData ? "" : "text-muted-foreground/60",
			)}
		>
			{role === "hod" && (
				<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
					{record && record.status === "SUBMITTED" && (
						<Checkbox checked={isSelected} onCheckedChange={onSelect} />
					)}
				</TableCell>
			)}
			<TableCell className="text-center font-medium" onClick={onClick}>
				{semester}
			</TableCell>
			{DOMAINS.map((domain) => {
				const score = record?.[domain.key as keyof EvaluationGraphEntry] as
					| number
					| null;
				return (
					<TableCell key={domain.key} className="text-center" onClick={onClick}>
						{score ?
							<div className="flex items-center justify-center gap-1">
								<div className="flex gap-0.5">
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className="h-1.5 w-3 rounded-full"
											style={{
												backgroundColor: i <= score ? domain.color : "#E5E7EB",
											}}
										/>
									))}
								</div>
								<span className="text-xs font-medium">{score}</span>
							</div>
						:	<span
								className="text-muted-foreground/40 italic text-xs"
								onClick={onClick}
							>
								—
							</span>
						}
					</TableCell>
				);
			})}
			<TableCell className="text-center text-sm" onClick={onClick}>
				{record?.theoryMarks ?? "—"}
			</TableCell>
			<TableCell className="text-center text-sm" onClick={onClick}>
				{record?.practicalMarks ?? "—"}
			</TableCell>
			<TableCell className="text-center font-medium" onClick={onClick}>
				{record?.overallScore ?
					<span className="font-bold">{record.overallScore.toFixed(1)}</span>
				:	"—"}
			</TableCell>
			<TableCell className="text-center" onClick={onClick}>
				{record ?
					<Badge
						variant={record.status === "SIGNED" ? "default" : "outline"}
						className={cn(
							"text-xs",
							record.status === "SIGNED" &&
								"bg-green-100 text-green-700 hover:bg-green-100",
							record.status === "SUBMITTED" &&
								"text-amber-600 border-amber-300",
						)}
					>
						{record.status === "SIGNED" ?
							"Signed"
						: record.status === "SUBMITTED" ?
							"Pending"
						:	record.status}
					</Badge>
				:	<span className="text-xs text-muted-foreground/40">—</span>}
			</TableCell>
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onClick}
						title="Edit"
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					{canSign && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
							onClick={(e) => {
								e.stopPropagation();
								onSign();
							}}
							disabled={isPending}
							title="Sign"
						>
							<FileCheck className="h-3.5 w-3.5" />
						</Button>
					)}
					{canDelete && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							disabled={isPending}
							title="Delete"
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}
