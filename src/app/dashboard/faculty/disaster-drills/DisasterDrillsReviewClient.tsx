/**
 * @module DisasterDrillsReviewClient
 * @description Faculty/HOD review page for student disaster drill submissions.
 * Features: search, status/batch filters, bulk select, detail sheet, sign/reject
 * dialogs, pagination, auto-review toggle, student filter, PDF/Excel export.
 *
 * @see PG Logbook .md — "MAJOR INCIDENT PLANNING/ DISASTER MANAGEMENT DRILL/ MASS CASUALTY MANAGEMENT/PREHOSPITAL EM"
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
	Siren,
	User,
	CalendarDays,
	MessageSquare,
	Activity,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	signDisasterDrillEntry,
	rejectDisasterDrillEntry,
	bulkSignDisasterDrillEntries,
} from "@/actions/disaster-drills";
import { toggleAutoReview } from "@/actions/auto-review";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface DisasterDrillSubmission {
	id: string;
	slNo: number;
	date: string | null;
	description: string | null;
	roleInActivity: string | null;
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

interface DisasterDrillsReviewClientProps {
	submissions: DisasterDrillSubmission[];
	role: "faculty" | "hod";
	autoReviewEnabled?: boolean;
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const PAGE_SIZE = 10;

// ======================== MAIN COMPONENT ========================

export function DisasterDrillsReviewClient({
	submissions,
	role,
	autoReviewEnabled,
}: DisasterDrillsReviewClientProps) {
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
	const [detailEntry, setDetailEntry] =
		useState<DisasterDrillSubmission | null>(null);

	// Reject dialog
	const [rejectEntry, setRejectEntry] =
		useState<DisasterDrillSubmission | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Sign dialog
	const [signEntry, setSignEntry] = useState<DisasterDrillSubmission | null>(
		null,
	);
	const [signRemark, setSignRemark] = useState("");

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);

	// Auto-review
	const [autoReview, setAutoReview] = useState(autoReviewEnabled ?? false);

	// Student filter for export
	const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
	const [studentPickerOpen, setStudentPickerOpen] = useState(false);

	// Export status filter
	const [exportStatusFilter, setExportStatusFilter] = useState("ALL");

	// Unique students list
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
					(s.description ?? "").toLowerCase().includes(q) ||
					(s.roleInActivity ?? "").toLowerCase().includes(q) ||
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
	const handleSign = useCallback((entry: DisasterDrillSubmission) => {
		setSignEntry(entry);
		setSignRemark("");
	}, []);

	function confirmSign() {
		if (!signEntry) return;
		startTransition(async () => {
			try {
				await signDisasterDrillEntry(signEntry.id, signRemark || undefined);
				toast.success(
					`Signed: Entry #${signEntry.slNo} (${signEntry.user.firstName})`,
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

	function openReject(entry: DisasterDrillSubmission) {
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
				await rejectDisasterDrillEntry(rejectEntry.id, rejectRemark);
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
				await bulkSignDisasterDrillEntries(ids);
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
				await toggleAutoReview("disasterDrills", enabled);
				toast.success(
					`Auto review ${enabled ? "enabled" : "disabled"} for Disaster Drills`,
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
			description: e.description,
			roleInActivity: e.roleInActivity,
			facultyRemark: e.facultyRemark,
			status: e.status,
			studentName: `${e.user.firstName} ${e.user.lastName}`.trim(),
			batch: e.user.batchRelation?.name ?? "—",
			semester: e.user.currentSemester ?? 0,
		}));
	}, [submissions, selectedStudentId, batchFilter, exportStatusFilter]);

	const handleExportPdf = useCallback(async () => {
		const { exportSimpleLogToPdf } = await import("@/lib/export/export-pdf");
		const data = buildExportData();
		await exportSimpleLogToPdf(
			data,
			["Sl.", "Student", "Date", "Description", "Role", "Status"],
			data.map((d) => [
				d.slNo.toString(),
				d.studentName,
				d.date ?? "—",
				d.description ?? "—",
				d.roleInActivity ?? "—",
				d.status,
			]),
			`Disaster Drills Review - ${role.toUpperCase()}`,
			role.toUpperCase(),
		);
	}, [buildExportData, role]);

	const handleExportExcel = useCallback(async () => {
		const { exportSimpleLogToExcel } =
			await import("@/lib/export/export-excel");
		const data = buildExportData();
		exportSimpleLogToExcel(
			data.map((d) => ({
				"Sl. No.": d.slNo,
				"Student Name": d.studentName,
				Batch: d.batch,
				Semester: d.semester,
				Date: d.date ?? "—",
				"Description of Work Done": d.description ?? "—",
				"Role in Activity": d.roleInActivity ?? "—",
				"Faculty Remark": d.facultyRemark ?? "—",
				Status: d.status,
			})),
			role.toUpperCase(),
			"Disaster Drills Review",
		);
	}, [buildExportData, role]);

	// ======================== RENDER ========================

	return (
		<div className="space-y-6">
			{/* Top-Level Filter Bar */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
				{/* HOD Auto-Review Toggle */}
				{role === "hod" && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
						{isPending && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						<label
							htmlFor="dd-auto-review"
							className="text-xs font-medium text-muted-foreground cursor-pointer"
						>
							Auto Review (Disaster Drills)
						</label>
						<Switch
							id="dd-auto-review"
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

					{/* Student Selector */}
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
										?.name ?? "Select...")
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
							:	"Download"
						}
					/>
				</div>
			</div>

			{/* Stat Chips */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
				{(
					[
						{ key: "ALL", label: "Total", color: "bg-gray-100 text-gray-700" },
						{
							key: "SUBMITTED",
							label: "Pending",
							color: "bg-amber-100 text-amber-700",
						},
						{
							key: "SIGNED",
							label: "Signed",
							color: "bg-green-100 text-green-700",
						},
						{
							key: "NEEDS_REVISION",
							label: "Revision",
							color: "bg-orange-100 text-orange-700",
						},
						{
							key: "DRAFT",
							label: "Draft",
							color: "bg-gray-100 text-gray-500",
						},
					] as const
				).map((s) => (
					<button
						key={s.key}
						type="button"
						onClick={() => handleStatusChange(s.key)}
						className={cn(
							"px-3 py-2 rounded-lg text-xs font-medium transition-all border",
							statusFilter === s.key ?
								`${s.color} border-current ring-1 ring-current`
							:	"bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
						)}
					>
						{s.label}: {counts[s.key]}
					</button>
				))}
			</div>

			{/* Search + Bulk */}
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div className="relative flex-1 w-full sm:max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search student, description, role..."
						className="pl-8 text-sm"
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
				</div>
				{selectedIds.size > 0 && (
					<Button
						size="sm"
						variant="default"
						onClick={handleBulkSign}
						disabled={isPending}
						className="flex items-center gap-1.5"
					>
						{isPending ?
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						:	<CheckCheck className="h-3.5 w-3.5" />}
						Sign Selected ({selectedIds.size})
					</Button>
				)}
			</div>

			{/* Table */}
			<Card>
				<CardContent className="p-0">
					{paginated.length === 0 ?
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Siren className="h-10 w-10 mb-2 opacity-50" />
							<p className="text-sm">No entries found</p>
						</div>
					:	<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">
										<Checkbox
											checked={allSubmittedSelected}
											onCheckedChange={toggleSelectAll}
											aria-label="Select all submitted"
											disabled={submittedInView.length === 0}
										/>
									</TableHead>
									<TableHead className="w-12">Sl.</TableHead>
									<TableHead>Student</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Role</TableHead>
									<TableHead className="w-24">Date</TableHead>
									<TableHead className="w-28">Status</TableHead>
									<TableHead className="w-32 text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginated.map((entry) => (
									<TableRow
										key={entry.id}
										className={cn(
											selectedIds.has(entry.id) && "bg-hospital-primary/5",
										)}
									>
										<TableCell>
											{entry.status === "SUBMITTED" && (
												<Checkbox
													checked={selectedIds.has(entry.id)}
													onCheckedChange={() => toggleSelect(entry.id)}
													aria-label={`Select entry ${entry.slNo}`}
												/>
											)}
										</TableCell>
										<TableCell className="font-medium">{entry.slNo}</TableCell>
										<TableCell>
											<div className="flex flex-col">
												<span className="font-medium text-sm">
													{entry.user.firstName} {entry.user.lastName}
												</span>
												<span className="text-xs text-muted-foreground">
													{entry.user.batchRelation?.name ?? "—"}
												</span>
											</div>
										</TableCell>
										<TableCell className="max-w-xs truncate text-sm">
											{entry.description ?? "—"}
										</TableCell>
										<TableCell className="max-w-xs truncate text-sm">
											{entry.roleInActivity ?? "—"}
										</TableCell>
										<TableCell className="text-xs">
											{entry.date ?
												format(new Date(entry.date), "dd MMM yyyy")
											:	"—"}
										</TableCell>
										<TableCell>
											<StatusBadge status={entry.status as EntryStatus} />
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center gap-1 justify-end">
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
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
															onClick={() => handleSign(entry)}
															disabled={isPending}
														>
															<CheckCircle2 className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
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
							</TableBody>
						</Table>
					}
				</CardContent>
			</Card>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm text-muted-foreground">
						Page {currentPage} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === totalPages}
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Detail Sheet */}
			<Sheet open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
				<SheetContent className="sm:max-w-md overflow-y-auto">
					{detailEntry && (
						<>
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<Siren className="h-5 w-5 text-hospital-accent" />
									Entry #{detailEntry.slNo}
								</SheetTitle>
								<SheetDescription>Disaster Drill Submission</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-4">
								<div className="flex items-center gap-3">
									<User className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="font-medium text-sm">
											{detailEntry.user.firstName} {detailEntry.user.lastName}
										</p>
										<p className="text-xs text-muted-foreground">
											{detailEntry.user.batchRelation?.name ?? "—"} · Sem{" "}
											{detailEntry.user.currentSemester ?? "—"}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<CalendarDays className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">
										{detailEntry.date ?
											format(new Date(detailEntry.date), "dd MMM yyyy")
										:	"—"}
									</span>
								</div>

								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Activity className="h-4 w-4 text-muted-foreground" />
										<span className="text-xs font-medium text-muted-foreground">
											Description
										</span>
									</div>
									<p className="text-sm pl-6">
										{detailEntry.description ?? "—"}
									</p>
								</div>

								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<User className="h-4 w-4 text-muted-foreground" />
										<span className="text-xs font-medium text-muted-foreground">
											Role in Activity
										</span>
									</div>
									<p className="text-sm pl-6">
										{detailEntry.roleInActivity ?? "—"}
									</p>
								</div>

								{detailEntry.facultyRemark && (
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<MessageSquare className="h-4 w-4 text-muted-foreground" />
											<span className="text-xs font-medium text-muted-foreground">
												Faculty Remark
											</span>
										</div>
										<div
											className="text-sm pl-6 prose prose-sm max-w-none"
											dangerouslySetInnerHTML={{
												__html: renderMarkdown(detailEntry.facultyRemark),
											}}
										/>
									</div>
								)}

								<div className="flex items-center gap-2 pt-2">
									<StatusBadge status={detailEntry.status as EntryStatus} />
								</div>

								{detailEntry.status === "SUBMITTED" && (
									<div className="flex gap-2 pt-4 border-t">
										<Button
											className="flex-1"
											variant="default"
											onClick={() => handleSign(detailEntry)}
											disabled={isPending}
										>
											{isPending ?
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											:	<CheckCircle2 className="h-4 w-4 mr-2" />}
											Sign
										</Button>
										<Button
											className="flex-1"
											variant="outline"
											onClick={() => openReject(detailEntry)}
											disabled={isPending}
										>
											<XCircle className="h-4 w-4 mr-2" />
											Reject
										</Button>
									</div>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* Sign Dialog */}
			<Dialog open={!!signEntry} onOpenChange={() => setSignEntry(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Entry</DialogTitle>
						<DialogDescription>
							Confirm signing entry #{signEntry?.slNo} by{" "}
							{signEntry?.user.firstName} {signEntry?.user.lastName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<label className="text-sm font-medium">Remark (optional)</label>
						<MarkdownEditor
							value={signRemark}
							onChange={setSignRemark}
							placeholder="Add an optional remark..."
							minRows={3}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSignEntry(null)}>
							Cancel
						</Button>
						<Button onClick={confirmSign} disabled={isPending}>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							:	<CheckCircle2 className="h-4 w-4 mr-2" />}
							Sign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog open={!!rejectEntry} onOpenChange={() => setRejectEntry(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Send entry #{rejectEntry?.slNo} back to{" "}
							{rejectEntry?.user.firstName} for revision
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<label className="text-sm font-medium">
							Remark <span className="text-red-500">*</span>
						</label>
						<MarkdownEditor
							value={rejectRemark}
							onChange={setRejectRemark}
							placeholder="Explain what needs to be revised..."
							minRows={4}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejectEntry(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmReject}
							disabled={isPending || !rejectRemark.trim()}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							:	<XCircle className="h-4 w-4 mr-2" />}
							Send for Revision
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
