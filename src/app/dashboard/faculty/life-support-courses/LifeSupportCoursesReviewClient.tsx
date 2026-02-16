/**
 * @module LifeSupportCoursesReviewClient
 * @description Faculty/HOD review page for student life-support course submissions.
 * Features: search, status/batch filters, bulk select, detail sheet, sign/reject
 * dialogs, pagination, auto-review toggle, student filter, PDF/Excel export.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 * @see actions/life-support-courses.ts — signCourseEntry, rejectCourseEntry, bulkSignCourseEntries
 */

"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	MarkdownEditor,
	renderMarkdown,
} from "@/components/shared/MarkdownEditor";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	Search,
	CheckCircle2,
	XCircle,
	Loader2,
	Eye,
	Filter,
	Check,
	CheckCheck,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	User,
	CalendarDays,
	Tag,
	MessageSquare,
	MapPin,
	Activity,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	signCourseEntry,
	rejectCourseEntry,
	bulkSignCourseEntries,
} from "@/actions/life-support-courses";
import { toggleAutoReview } from "@/actions/auto-review";
import type { EntryStatus } from "@/types";

// ======================== CONSTANTS ========================

const CONFIDENCE_LABELS: Record<string, string> = {
	VC: "Very Confident",
	FC: "Fairly Confident",
	SC: "Slightly Confident",
	NC: "Not Confident",
};

// ======================== TYPES ========================

export interface CourseSubmission {
	id: string;
	slNo: number;
	date: string | null;
	courseName: string | null;
	conductedAt: string | null;
	confidenceLevel: string | null;
	facultyRemark: string | null;
	facultyId: string | null;
	status: string;
	createdAt: string;
	user: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		currentSemester: number | null;
		batchRelation: { name: string } | null;
	};
}

interface LifeSupportCoursesReviewClientProps {
	submissions: CourseSubmission[];
	role: "faculty" | "hod";
	autoReviewEnabled?: boolean;
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const PAGE_SIZE = 10;

// ======================== MAIN COMPONENT ========================

export function LifeSupportCoursesReviewClient({
	submissions,
	role,
	autoReviewEnabled,
}: LifeSupportCoursesReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Search & filter
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [batchFilter, setBatchFilter] = useState("ALL");

	// Available batches
	const batches = useMemo(() => {
		const set = new Set<string>();
		submissions.forEach((s) => {
			if (s.user.batchRelation?.name) set.add(s.user.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [submissions]);

	// Bulk selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Detail sheet
	const [detailEntry, setDetailEntry] = useState<CourseSubmission | null>(null);

	// Reject dialog
	const [rejectEntry, setRejectEntry] = useState<CourseSubmission | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Sign dialog
	const [signEntry, setSignEntry] = useState<CourseSubmission | null>(null);
	const [signRemark, setSignRemark] = useState("");

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);

	// Auto-review
	const [autoReview, setAutoReview] = useState(autoReviewEnabled ?? false);

	// Student filter for export
	const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
	const [studentPickerOpen, setStudentPickerOpen] = useState(false);

	// Export status filter (separate from table display filter)
	const [exportStatusFilter, setExportStatusFilter] = useState("ALL");

	// Unique students list (filtered by batch)
	const studentOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of submissions) {
			if (batchFilter !== "ALL" && s.user.batchRelation?.name !== batchFilter)
				continue;
			map.set(s.user.id, `${s.user.firstName} ${s.user.lastName}`.trim());
		}
		return Array.from(map.entries())
			.map(([id, name]) => ({ id, name: name || "Unknown" }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [submissions, batchFilter]);

	// ---- Filtering ----
	const filtered = useMemo(() => {
		let result = submissions;

		if (statusFilter !== "ALL") {
			result = result.filter((s) => s.status === statusFilter);
		}

		if (batchFilter !== "ALL") {
			result = result.filter((s) => s.user.batchRelation?.name === batchFilter);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(s) =>
					`${s.user.firstName} ${s.user.lastName}`.toLowerCase().includes(q) ||
					(s.courseName ?? "").toLowerCase().includes(q) ||
					(s.conductedAt ?? "").toLowerCase().includes(q) ||
					(s.user.batchRelation?.name ?? "").toLowerCase().includes(q),
			);
		}

		return result;
	}, [submissions, statusFilter, batchFilter, searchQuery]);

	// Pagination
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	const handleSearchChange = useCallback((val: string) => {
		setSearchQuery(val);
		setCurrentPage(1);
	}, []);
	const handleStatusChange = useCallback((val: StatusFilter) => {
		setStatusFilter(val);
		setCurrentPage(1);
	}, []);
	const handleBatchChange = useCallback((val: string) => {
		setBatchFilter(val);
		setCurrentPage(1);
	}, []);

	// ---- Counts ----
	const counts = useMemo(() => {
		const c = { ALL: 0, SUBMITTED: 0, SIGNED: 0, NEEDS_REVISION: 0, DRAFT: 0 };
		for (const s of submissions) {
			c.ALL++;
			if (s.status in c) c[s.status as keyof typeof c]++;
		}
		return c;
	}, [submissions]);

	// ---- Bulk Select ----
	const submittedInView = paginated.filter((s) => s.status === "SUBMITTED");
	const allSubmittedSelected =
		submittedInView.length > 0 &&
		submittedInView.every((s) => selectedIds.has(s.id));

	function toggleSelect(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleSelectAll() {
		if (allSubmittedSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(submittedInView.map((s) => s.id)));
		}
	}

	// ---- Actions ----
	const handleSign = useCallback((entry: CourseSubmission) => {
		setSignEntry(entry);
		setSignRemark("");
	}, []);

	function confirmSign() {
		if (!signEntry) return;
		startTransition(async () => {
			try {
				await signCourseEntry(signEntry.id, signRemark || undefined);
				toast.success(
					`Signed: ${signEntry.courseName ?? "Entry"} (${signEntry.user.firstName})`,
				);
				setSignEntry(null);
				setDetailEntry(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(signEntry.id);
					return next;
				});
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to sign");
			}
		});
	}

	function openReject(entry: CourseSubmission) {
		setRejectEntry(entry);
		setRejectRemark("");
	}

	function confirmReject() {
		if (!rejectEntry) return;
		if (!rejectRemark.trim()) {
			toast.error("Please provide a remark for revision");
			return;
		}
		startTransition(async () => {
			try {
				await rejectCourseEntry(rejectEntry.id, rejectRemark);
				toast.success("Sent back for revision");
				setRejectEntry(null);
				setDetailEntry(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(rejectEntry.id);
					return next;
				});
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to reject",
				);
			}
		});
	}

	function handleBulkSign() {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		startTransition(async () => {
			try {
				await bulkSignCourseEntries(ids);
				setSelectedIds(new Set());
				toast.success(`Signed ${ids.length} entries`);
				router.refresh();
			} catch {
				toast.error("Bulk sign failed");
			}
		});
	}

	// ======================== AUTO-REVIEW ========================

	function handleAutoReviewToggle(enabled: boolean) {
		setAutoReview(enabled);
		startTransition(async () => {
			try {
				await toggleAutoReview("lifeSupportCourses", enabled);
				toast.success(
					`Auto review ${enabled ? "enabled" : "disabled"} for Life-Support Courses`,
				);
				router.refresh();
			} catch {
				setAutoReview(!enabled);
				toast.error("Failed to update auto review setting");
			}
		});
	}

	// ======================== EXPORT ========================

	const buildExportData = useCallback(() => {
		let exportData = submissions;
		if (batchFilter !== "ALL") {
			exportData = exportData.filter(
				(s) => s.user.batchRelation?.name === batchFilter,
			);
		}
		if (exportStatusFilter !== "ALL") {
			exportData = exportData.filter((s) => s.status === exportStatusFilter);
		}
		if (selectedStudentId !== "all") {
			exportData = exportData.filter((s) => s.user.id === selectedStudentId);
		}

		return exportData.map((e) => ({
			slNo: e.slNo,
			date: e.date,
			courseName: e.courseName,
			conductedAt: e.conductedAt,
			confidenceLevel: e.confidenceLevel,
			facultyRemark: e.facultyRemark,
			status: e.status,
			studentName: `${e.user.firstName} ${e.user.lastName}`.trim(),
			batch: e.user.batchRelation?.name ?? "—",
			semester: e.user.currentSemester ?? 0,
		}));
	}, [submissions, selectedStudentId, batchFilter, exportStatusFilter]);

	const handleExportPdf = useCallback(async () => {
		const { exportProcedureLogReviewToPdf } =
			await import("@/lib/export/export-pdf");
		const data = buildExportData().map((e) => ({
			slNo: e.slNo,
			categoryLabel: "Life-Support Courses",
			date: e.date ?? null,
			patientName: e.courseName ?? "—",
			patientAge: null,
			patientSex: null,
			uhid: null,
			completeDiagnosis: e.conductedAt ?? "—",
			procedureDescription: null,
			performedAtLocation: null,
			skillLevel: e.confidenceLevel ?? "—",
			totalProcedureTally: 0,
			status: e.status,
			studentName: e.studentName,
			batch: e.batch,
			semester: e.semester,
		}));
		await exportProcedureLogReviewToPdf(data, role, "Life-Support Courses");
	}, [buildExportData, role]);

	const handleExportExcel = useCallback(async () => {
		const { exportProcedureLogReviewToExcel } =
			await import("@/lib/export/export-excel");
		const data = buildExportData().map((e) => ({
			slNo: e.slNo,
			categoryLabel: "Life-Support Courses",
			date: e.date ?? null,
			patientName: e.courseName ?? "—",
			patientAge: null,
			patientSex: null,
			uhid: null,
			completeDiagnosis: e.conductedAt ?? "—",
			procedureDescription: null,
			performedAtLocation: null,
			skillLevel: e.confidenceLevel ?? "—",
			totalProcedureTally: 0,
			status: e.status,
			studentName: e.studentName,
			batch: e.batch,
			semester: e.semester,
		}));
		exportProcedureLogReviewToExcel(data, role, "Life-Support Courses");
	}, [buildExportData, role]);

	// ======================== RENDER ========================

	return (
		<div className="space-y-6">
			{/* Top-Level Filter Bar: Auto-Review + Batch + Status + Student + Export */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
				{/* HOD Auto-Review Toggle */}
				{role === "hod" && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
						{isPending && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						<label
							htmlFor="lsc-auto-review"
							className="text-xs font-medium text-muted-foreground cursor-pointer"
						>
							Auto Review (Life-Support Courses)
						</label>
						<Switch
							id="lsc-auto-review"
							checked={autoReview}
							onCheckedChange={handleAutoReviewToggle}
							disabled={isPending}
						/>
					</div>
				)}

				<div className="flex items-center gap-2 ml-auto flex-wrap">
					{/* Batch Filter */}
					{batches.length > 0 && (
						<Select
							value={batchFilter}
							onValueChange={(val) => {
								handleBatchChange(val);
								setSelectedStudentId("all");
							}}
						>
							<SelectTrigger className="w-40 text-xs">
								<SelectValue placeholder="Batch" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Batches</SelectItem>
								{batches.map((b) => (
									<SelectItem key={b} value={b}>
										{b}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* Export Status Filter */}
					<Select
						value={exportStatusFilter}
						onValueChange={setExportStatusFilter}
					>
						<SelectTrigger className="w-40 text-xs">
							<Filter className="h-3.5 w-3.5 mr-1" />
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Status</SelectItem>
							<SelectItem value="SUBMITTED">Pending</SelectItem>
							<SelectItem value="SIGNED">Signed</SelectItem>
							<SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
						</SelectContent>
					</Select>

					{/* Searchable Student Selector */}
					<Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								role="combobox"
								aria-expanded={studentPickerOpen}
								className="w-48 justify-between text-xs"
							>
								{selectedStudentId === "all" ?
									"All Students"
								:	(studentOptions.find((s) => s.id === selectedStudentId)
										?.name ?? "Select student...")
								}
								<ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-56 p-0" align="end">
							<Command>
								<CommandInput placeholder="Search student..." />
								<CommandList>
									<CommandEmpty>No student found.</CommandEmpty>
									<CommandGroup>
										<CommandItem
											value="all"
											onSelect={() => {
												setSelectedStudentId("all");
												setStudentPickerOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													selectedStudentId === "all" ? "opacity-100" : (
														"opacity-0"
													),
												)}
											/>
											All Students
										</CommandItem>
										{studentOptions.map((s) => (
											<CommandItem
												key={s.id}
												value={s.name}
												onSelect={() => {
													setSelectedStudentId(s.id);
													setStudentPickerOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedStudentId === s.id ?
															"opacity-100"
														:	"opacity-0",
													)}
												/>
												{s.name}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					<ExportDropdown
						onExportPdf={handleExportPdf}
						onExportExcel={handleExportExcel}
						label={
							(
								selectedStudentId !== "all" ||
								batchFilter !== "ALL" ||
								exportStatusFilter !== "ALL"
							) ?
								"Download (Filtered)"
							:	"Download All"
						}
					/>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
				<StatMini label="Total" count={counts.ALL} color="default" />
				<StatMini label="Drafts" count={counts.DRAFT} color="slate" />
				<StatMini
					label="Pending Review"
					count={counts.SUBMITTED}
					color="amber"
				/>
				<StatMini label="Signed" count={counts.SIGNED} color="green" />
				<StatMini
					label="Needs Revision"
					count={counts.NEEDS_REVISION}
					color="red"
				/>
			</div>

			{/* Toolbar */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						{/* Search */}
						<div className="relative flex-1 w-full">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by student, course name, venue, or batch..."
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Status Filter */}
						<Select
							value={statusFilter}
							onValueChange={(v) => handleStatusChange(v as StatusFilter)}
						>
							<SelectTrigger className="w-44 shrink-0">
								<Filter className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All ({counts.ALL})</SelectItem>
								<SelectItem value="DRAFT">Drafts ({counts.DRAFT})</SelectItem>
								<SelectItem value="SUBMITTED">
									Pending ({counts.SUBMITTED})
								</SelectItem>
								<SelectItem value="SIGNED">Signed ({counts.SIGNED})</SelectItem>
								<SelectItem value="NEEDS_REVISION">
									Needs Revision ({counts.NEEDS_REVISION})
								</SelectItem>
							</SelectContent>
						</Select>

						{/* Bulk Sign */}
						{selectedIds.size > 0 && (
							<Button
								onClick={handleBulkSign}
								disabled={isPending}
								size="sm"
								className="gap-1.5 bg-green-600 hover:bg-green-700"
							>
								<CheckCheck className="h-4 w-4" />
								Sign Selected ({selectedIds.size})
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Table */}
			<Card>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-175">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-10 text-center">
										<Checkbox
											checked={allSubmittedSelected}
											onCheckedChange={toggleSelectAll}
										/>
									</TableHead>
									<TableHead className="w-12 text-center font-bold">
										Sl.
									</TableHead>
									<TableHead className="w-36 font-bold">Student</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="min-w-44 font-bold">
										Course Name
									</TableHead>
									<TableHead className="w-36 font-bold">Conducted At</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Confidence
									</TableHead>
									<TableHead className="w-36 font-bold">
										Faculty Remark
									</TableHead>
									<TableHead className="w-20 text-center font-bold">
										Status
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginated.map((entry) => (
									<TableRow
										key={entry.id}
										className={cn(
											"transition-colors hover:bg-muted/30 cursor-pointer",
											entry.status === "SIGNED" && "bg-green-50/50",
											entry.status === "NEEDS_REVISION" && "bg-orange-50/50",
											entry.status === "DRAFT" && "bg-gray-50/30",
											selectedIds.has(entry.id) && "bg-blue-50/60",
										)}
										onClick={() => setDetailEntry(entry)}
									>
										<TableCell
											className="text-center"
											onClick={(e) => e.stopPropagation()}
										>
											{entry.status === "SUBMITTED" && (
												<Checkbox
													checked={selectedIds.has(entry.id)}
													onCheckedChange={() => toggleSelect(entry.id)}
												/>
											)}
										</TableCell>
										<TableCell className="text-center font-medium">
											{entry.slNo}.
										</TableCell>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<Link
												href={`/dashboard/${role}/life-support-courses/student/${entry.user.id}`}
												className="group"
											>
												<div className="text-sm font-medium text-hospital-primary group-hover:underline">
													{entry.user.firstName} {entry.user.lastName}
												</div>
												<div className="text-xs text-muted-foreground">
													{entry.user.batchRelation?.name ?? "—"} · Sem{" "}
													{entry.user.currentSemester ?? "?"}
												</div>
											</Link>
										</TableCell>
										<TableCell className="text-center text-sm">
											{entry.date ?
												format(new Date(entry.date), "dd/MM/yy")
											:	"—"}
										</TableCell>
										<TableCell className="text-sm max-w-52">
											{entry.courseName ?
												<div className="line-clamp-2">{entry.courseName}</div>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-sm max-w-36">
											{entry.conductedAt ?
												<div className="line-clamp-2">{entry.conductedAt}</div>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-center text-sm">
											{entry.confidenceLevel ?
												<span
													className={cn(
														"px-2 py-0.5 rounded text-xs",
														entry.confidenceLevel === "VC" &&
															"bg-green-100 text-green-700",
														entry.confidenceLevel === "FC" &&
															"bg-blue-100 text-blue-700",
														entry.confidenceLevel === "SC" &&
															"bg-amber-100 text-amber-700",
														entry.confidenceLevel === "NC" &&
															"bg-red-100 text-red-700",
													)}
												>
													{entry.confidenceLevel}
												</span>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-sm max-w-36">
											{entry.facultyRemark ?
												<div
													className="prose prose-xs max-w-none line-clamp-2"
													dangerouslySetInnerHTML={{
														__html: renderMarkdown(entry.facultyRemark),
													}}
												/>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-center">
											<StatusBadge
												status={entry.status as EntryStatus}
												size="sm"
											/>
										</TableCell>
										<TableCell
											className="text-center"
											onClick={(e) => e.stopPropagation()}
										>
											<div className="flex items-center justify-center gap-0.5">
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													title="View details"
													onClick={() => setDetailEntry(entry)}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
												{entry.status === "SUBMITTED" && (
													<>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
															title="Sign"
															onClick={() => handleSign(entry)}
															disabled={isPending}
														>
															<CheckCircle2 className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-destructive hover:text-destructive"
															title="Reject"
															onClick={() => openReject(entry)}
															disabled={isPending}
														>
															<XCircle className="h-3.5 w-3.5" />
														</Button>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}

								{paginated.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={10}
											className="text-center py-10 text-muted-foreground"
										>
											{searchQuery || statusFilter !== "ALL" ?
												"No matching entries found."
											:	"No life-support course submissions yet."}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between px-2 sm:px-0">
							<p className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages} ({filtered.length} entries)
							</p>
							<div className="flex gap-1.5">
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8"
									disabled={currentPage <= 1}
									onClick={() => setCurrentPage((p) => p - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8"
									disabled={currentPage >= totalPages}
									onClick={() => setCurrentPage((p) => p + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* ====== Detail Sheet ====== */}
			<Sheet
				open={!!detailEntry}
				onOpenChange={(open) => !open && setDetailEntry(null)}
			>
				<SheetContent className="w-full sm:max-w-xl overflow-y-auto">
					{detailEntry && (
						<>
							<SheetHeader className="pb-4 border-b">
								<div className="flex items-start justify-between gap-3">
									<SheetTitle className="flex items-center gap-2.5">
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hospital-primary/10">
											<GraduationCap className="h-4.5 w-4.5 text-hospital-primary" />
										</div>
										Course #{detailEntry.slNo}
									</SheetTitle>
									<StatusBadge
										status={detailEntry.status as EntryStatus}
										size="md"
									/>
								</div>
								<SheetDescription className="mt-1">
									by {detailEntry.user.firstName} {detailEntry.user.lastName} ·{" "}
									{detailEntry.user.batchRelation?.name ?? "—"}
									{detailEntry.user.currentSemester ?
										` · Sem ${detailEntry.user.currentSemester}`
									:	""}
								</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								{/* Student Information */}
								<DetailSection title="Student Information" icon={User}>
									<DetailRow
										label="Name"
										value={`${detailEntry.user.firstName} ${detailEntry.user.lastName}`}
									/>
									<div className="grid grid-cols-2 gap-x-4">
										<DetailRow
											label="Batch"
											value={detailEntry.user.batchRelation?.name ?? "—"}
										/>
										<DetailRow
											label="Semester"
											value={
												detailEntry.user.currentSemester ?
													`Semester ${detailEntry.user.currentSemester}`
												:	"—"
											}
										/>
									</div>
								</DetailSection>

								{/* Course Details */}
								<DetailSection title="Course Details" icon={CalendarDays}>
									<DetailRow
										label="Date"
										value={
											detailEntry.date ?
												format(new Date(detailEntry.date), "dd MMMM yyyy")
											:	"—"
										}
									/>
								</DetailSection>

								{/* Course Name */}
								<DetailSection title="Course Name" icon={GraduationCap}>
									{detailEntry.courseName ?
										<div className="bg-muted/30 rounded-lg p-3 text-sm">
											{detailEntry.courseName}
										</div>
									:	<p className="text-sm text-muted-foreground pl-6">—</p>}
								</DetailSection>

								{/* Conducted At */}
								<DetailSection title="Conducted At" icon={MapPin}>
									{detailEntry.conductedAt ?
										<div className="bg-muted/30 rounded-lg p-3 text-sm">
											{detailEntry.conductedAt}
										</div>
									:	<p className="text-sm text-muted-foreground pl-6">—</p>}
								</DetailSection>

								{/* Confidence Level */}
								<DetailSection title="Confidence Level" icon={Activity}>
									{detailEntry.confidenceLevel ?
										<div className="flex items-center gap-2">
											<span
												className={cn(
													"px-2 py-1 rounded text-sm font-medium",
													detailEntry.confidenceLevel === "VC" &&
														"bg-green-100 text-green-700",
													detailEntry.confidenceLevel === "FC" &&
														"bg-blue-100 text-blue-700",
													detailEntry.confidenceLevel === "SC" &&
														"bg-amber-100 text-amber-700",
													detailEntry.confidenceLevel === "NC" &&
														"bg-red-100 text-red-700",
												)}
											>
												{detailEntry.confidenceLevel}
											</span>
											<span className="text-sm text-muted-foreground">
												{CONFIDENCE_LABELS[detailEntry.confidenceLevel] ?? ""}
											</span>
										</div>
									:	<p className="text-sm text-muted-foreground pl-6">—</p>}
								</DetailSection>

								{/* Faculty Remark */}
								{detailEntry.facultyRemark && (
									<DetailSection title="Faculty Remark" icon={MessageSquare}>
										<div
											className="prose prose-sm max-w-none bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 text-sm"
											dangerouslySetInnerHTML={{
												__html: renderMarkdown(detailEntry.facultyRemark),
											}}
										/>
									</DetailSection>
								)}

								{/* Status Info */}
								<DetailSection title="Status" icon={Tag}>
									<div className="flex items-center gap-2">
										<StatusBadge
											status={detailEntry.status as EntryStatus}
											size="sm"
										/>
									</div>
									<div className="text-xs text-muted-foreground">
										Created:{" "}
										{format(
											new Date(detailEntry.createdAt),
											"dd MMM yyyy, HH:mm",
										)}
									</div>
								</DetailSection>

								{/* Action Buttons */}
								{detailEntry.status === "SUBMITTED" && (
									<div className="flex gap-3 pt-4 border-t">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700 text-white"
											onClick={() => handleSign(detailEntry)}
											disabled={isPending}
										>
											<CheckCircle2 className="h-4 w-4 mr-2" />
											Sign Off
										</Button>
										<Button
											variant="outline"
											className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
											onClick={() => openReject(detailEntry)}
											disabled={isPending}
										>
											<XCircle className="h-4 w-4 mr-2" />
											Request Revision
										</Button>
									</div>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* ====== Sign Dialog ====== */}
			<Dialog
				open={!!signEntry}
				onOpenChange={(open) => !open && setSignEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Life-Support Course Entry</DialogTitle>
						<DialogDescription>
							Entry #{signEntry?.slNo} by {signEntry?.user.firstName}{" "}
							{signEntry?.user.lastName}
							{signEntry?.courseName ?
								` — ${signEntry.courseName.substring(0, 60)}${signEntry.courseName.length > 60 ? "..." : ""}`
							:	""}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<label className="text-sm font-medium">Remark (optional)</label>
						<MarkdownEditor
							value={signRemark}
							onChange={setSignRemark}
							placeholder="Add a remark..."
							minRows={2}
							compact
						/>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setSignEntry(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							className="bg-green-600 hover:bg-green-700 gap-1.5"
							onClick={confirmSign}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin" />
							:	<CheckCircle2 className="h-4 w-4" />}
							Sign Entry
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ====== Reject Dialog ====== */}
			<Dialog
				open={!!rejectEntry}
				onOpenChange={(open) => !open && setRejectEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Entry #{rejectEntry?.slNo} by {rejectEntry?.user.firstName}{" "}
							{rejectEntry?.user.lastName}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<label className="text-sm font-medium">
							Remark <span className="text-destructive">*</span>
						</label>
						<MarkdownEditor
							value={rejectRemark}
							onChange={setRejectRemark}
							placeholder="Explain what needs to be revised..."
							minRows={3}
							compact
						/>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectEntry(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="gap-1.5"
							onClick={confirmReject}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin" />
							:	<XCircle className="h-4 w-4" />}
							Send for Revision
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== HELPERS ========================

function StatMini({
	label,
	count,
	color,
}: {
	label: string;
	count: number;
	color: "default" | "amber" | "green" | "red" | "slate";
}) {
	const colors = {
		default: "bg-gray-50 border-gray-200 text-gray-700",
		amber: "bg-amber-50 border-amber-200 text-amber-700",
		green: "bg-green-50 border-green-200 text-green-700",
		red: "bg-red-50 border-red-200 text-red-700",
		slate: "bg-slate-50 border-slate-200 text-slate-700",
	};

	return (
		<div className={cn("rounded-lg border p-3", colors[color])}>
			<div className="text-2xl font-bold">{count}</div>
			<div className="text-xs">{label}</div>
		</div>
	);
}

function DetailSection({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<div>
			<h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
				<Icon className="h-4 w-4 text-hospital-primary" />
				{title}
			</h3>
			<div className="space-y-1.5 pl-6">{children}</div>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline gap-2 text-sm">
			<span className="text-muted-foreground min-w-28">{label}:</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}
