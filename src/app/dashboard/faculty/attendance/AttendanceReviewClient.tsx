/**
 * @module AttendanceReviewClient
 * @description Review UI for attendance sheets with server-side pagination.
 * Features: stat cards, search, batch/status filter, bulk select, detail sheet,
 * sign/reject dialogs with remarks, auto-review toggle, server-side pagination.
 * Used by faculty page. HOD page has its own dedicated HodAttendanceClient.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 * @see actions/attendance.ts — getAttendanceForReview (paginated)
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	Search,
	CheckCircle2,
	XCircle,
	Loader2,
	Eye,
	Filter,
	CheckCheck,
	User,
	CalendarDays,
	ClipboardList,
	ChevronLeft,
	ChevronRight,
	Building2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	signAttendanceSheet,
	rejectAttendanceSheet,
	bulkSignAttendanceSheets,
	getAttendanceForReview,
} from "@/actions/attendance";
import { toggleAutoReview } from "@/actions/auto-review";
import type { AutoReviewSettings } from "@/actions/auto-review";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface AttendanceEntryData {
	id: string;
	date: string | null;
	day: string;
	presentAbsent: string | null;
	hodName: string | null;
}

export interface AttendanceSheetForReview {
	id: string;
	userId: string;
	weekStartDate: string;
	weekEndDate: string;
	batch: string | null;
	postedDepartment: string | null;
	status: string;
	facultyRemark: string | null;
	entries: AttendanceEntryData[];
	createdAt: string;
	user: {
		id: string;
		firstName: string;
		lastName: string;
		batchRelation: { name: string } | null;
		currentSemester: number | null;
		profileImage?: string | null;
	};
}

interface PaginatedSheets {
	data: AttendanceSheetForReview[];
	total: number;
	page: number;
	pageSize: number;
}

interface AttendanceReviewClientProps {
	sheets: PaginatedSheets;
	role: "faculty" | "hod";
	autoReviewSettings: AutoReviewSettings;
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const DAYS_ORDERED = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
	MONDAY: "Mon",
	TUESDAY: "Tue",
	WEDNESDAY: "Wed",
	THURSDAY: "Thu",
	FRIDAY: "Fri",
	SATURDAY: "Sat",
	SUNDAY: "Sun",
};

// ======================== MAIN COMPONENT ========================

export function AttendanceReviewClient({
	sheets: initialSheets,
	role,
	autoReviewSettings,
}: AttendanceReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Server-side paginated data
	const [sheets, setSheets] = useState(initialSheets.data);
	const [total, setTotal] = useState(initialSheets.total);
	const [page, setPage] = useState(initialSheets.page);
	const pageSize = initialSheets.pageSize;
	const [loading, setLoading] = useState(false);

	// Search & filter
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [batchFilter, setBatchFilter] = useState("ALL");

	// Batches from submissions (extract from current page)
	const batches = useMemo(() => {
		const set = new Set<string>();
		sheets.forEach((s) => {
			if (s.user.batchRelation?.name) set.add(s.user.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [sheets]);

	// Bulk selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Detail sheet
	const [detailSheet, setDetailSheet] =
		useState<AttendanceSheetForReview | null>(null);

	// Sign dialog
	const [signTarget, setSignTarget] = useState<AttendanceSheetForReview | null>(
		null,
	);
	const [signRemark, setSignRemark] = useState("");

	// Reject dialog
	const [rejectTarget, setRejectTarget] =
		useState<AttendanceSheetForReview | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Auto-review toggle
	const [autoReview, setAutoReview] = useState(autoReviewSettings.attendance);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	// ---- Server-side data fetching ----
	const fetchSheets = useCallback(
		async (pg: number, status?: string, batch?: string, search?: string) => {
			setLoading(true);
			try {
				const result = await getAttendanceForReview({
					page: pg,
					pageSize,
					status: status || undefined,
					batchId: batch || undefined,
					search: search || undefined,
				});
				const serialized = JSON.parse(JSON.stringify(result));
				setSheets(serialized.data);
				setTotal(serialized.total);
				setPage(serialized.page);
			} catch {
				toast.error("Failed to load attendance sheets");
			} finally {
				setLoading(false);
			}
		},
		[pageSize],
	);

	function handlePageChange(newPage: number) {
		setSelectedIds(new Set());
		fetchSheets(
			newPage,
			statusFilter !== "ALL" ? statusFilter : undefined,
			batchFilter !== "ALL" ? batchFilter : undefined,
			searchQuery || undefined,
		);
	}

	function handleFilterChange(
		newStatus: StatusFilter,
		newBatch: string,
		newSearch: string,
	) {
		setStatusFilter(newStatus);
		setBatchFilter(newBatch);
		setSearchQuery(newSearch);
		setSelectedIds(new Set());
		fetchSheets(
			1,
			newStatus !== "ALL" ? newStatus : undefined,
			newBatch !== "ALL" ? newBatch : undefined,
			newSearch || undefined,
		);
	}

	// ---- Counts (from current page view) ----
	const counts = useMemo(() => {
		const c = { SUBMITTED: 0, SIGNED: 0, NEEDS_REVISION: 0, DRAFT: 0 };
		for (const s of sheets) {
			if (s.status in c) c[s.status as keyof typeof c]++;
		}
		return { ...c, ALL: sheets.length };
	}, [sheets]);

	// ---- Bulk Select ----
	const submittedInView = sheets.filter((s) => s.status === "SUBMITTED");
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
	function openSign(entry: AttendanceSheetForReview) {
		setSignTarget(entry);
		setSignRemark("");
	}

	function confirmSign() {
		if (!signTarget) return;
		startTransition(async () => {
			try {
				await signAttendanceSheet(signTarget.id, signRemark || undefined);
				toast.success(
					`Signed attendance for ${signTarget.user.firstName} ${signTarget.user.lastName}`,
				);
				setSignTarget(null);
				setDetailSheet(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(signTarget.id);
					return next;
				});
				fetchSheets(
					page,
					statusFilter !== "ALL" ? statusFilter : undefined,
					batchFilter !== "ALL" ? batchFilter : undefined,
					searchQuery || undefined,
				);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to sign");
			}
		});
	}

	function openReject(entry: AttendanceSheetForReview) {
		setRejectTarget(entry);
		setRejectRemark("");
	}

	function confirmReject() {
		if (!rejectTarget) return;
		if (!rejectRemark.trim()) {
			toast.error("Please provide a remark for revision");
			return;
		}
		startTransition(async () => {
			try {
				await rejectAttendanceSheet(rejectTarget.id, rejectRemark);
				toast.success(
					`Sent back for revision: ${rejectTarget.user.firstName} ${rejectTarget.user.lastName}`,
				);
				setRejectTarget(null);
				setDetailSheet(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(rejectTarget.id);
					return next;
				});
				fetchSheets(
					page,
					statusFilter !== "ALL" ? statusFilter : undefined,
					batchFilter !== "ALL" ? batchFilter : undefined,
					searchQuery || undefined,
				);
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
				const result = await bulkSignAttendanceSheets(ids);
				toast.success(`Signed ${result.signedCount} sheets`);
				setSelectedIds(new Set());
				fetchSheets(
					page,
					statusFilter !== "ALL" ? statusFilter : undefined,
					batchFilter !== "ALL" ? batchFilter : undefined,
					searchQuery || undefined,
				);
			} catch {
				toast.error("Bulk sign failed");
			}
		});
	}

	function handleAutoReviewToggle() {
		startTransition(async () => {
			try {
				await toggleAutoReview("attendance", !autoReview);
				setAutoReview((prev) => !prev);
				toast.success(
					autoReview ?
						"Auto-review disabled for attendance"
					:	"Auto-review enabled for attendance",
				);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to toggle",
				);
			}
		});
	}

	// ---- Export ----
	async function handleExportPdf() {
		const { exportAttendancePdf } = await import("@/lib/export/export-pdf");
		exportAttendancePdf(sheets);
	}

	async function handleExportExcel() {
		const { exportAttendanceExcel } = await import("@/lib/export/export-excel");
		exportAttendanceExcel(sheets);
	}

	// ---- Helpers ----
	function weekLabel(s: AttendanceSheetForReview) {
		return (
			format(new Date(s.weekStartDate), "dd MMM") +
			" – " +
			format(new Date(s.weekEndDate), "dd MMM yyyy")
		);
	}

	return (
		<div className="space-y-6">
			{/* Stats Row */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatMini label="Total (page)" count={total} color="default" />
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
				<CardContent className="p-4 space-y-3">
					<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						{/* Search */}
						<div className="relative flex-1 w-full">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by student name..."
								value={searchQuery}
								onChange={(e) =>
									handleFilterChange(statusFilter, batchFilter, e.target.value)
								}
								className="pl-9"
							/>
						</div>

						{/* Status Filter */}
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Select
								value={statusFilter}
								onValueChange={(v) =>
									handleFilterChange(
										v as StatusFilter,
										batchFilter,
										searchQuery,
									)
								}
							>
								<SelectTrigger className="w-44">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Status</SelectItem>
									<SelectItem value="SUBMITTED">Pending</SelectItem>
									<SelectItem value="SIGNED">Signed</SelectItem>
									<SelectItem value="NEEDS_REVISION">Revision</SelectItem>
									<SelectItem value="DRAFT">Draft</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Batch Filter */}
						{batches.length > 0 && (
							<Select
								value={batchFilter}
								onValueChange={(v) =>
									handleFilterChange(statusFilter, v, searchQuery)
								}
							>
								<SelectTrigger className="w-44">
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

						<ExportDropdown
							onExportPdf={handleExportPdf}
							onExportExcel={handleExportExcel}
						/>
					</div>

					{/* Auto-review toggle (HOD only) */}
					{role === "hod" && (
						<div className="flex items-center gap-3 pt-1 border-t">
							<Switch
								checked={autoReview}
								onCheckedChange={handleAutoReviewToggle}
								disabled={isPending}
							/>
							<span className="text-sm text-muted-foreground">
								Auto-review attendance (auto-sign on submit)
							</span>
						</div>
					)}

					{/* Bulk Actions Bar */}
					{selectedIds.size > 0 && (
						<div className="flex items-center gap-3 p-2 bg-blue-50 rounded-md border border-blue-200">
							<span className="text-sm font-medium text-blue-700">
								{selectedIds.size} selected
							</span>
							<Button
								size="sm"
								className="bg-green-600 hover:bg-green-700 text-white"
								onClick={handleBulkSign}
								disabled={isPending}
							>
								{isPending ?
									<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
								:	<CheckCheck className="h-3.5 w-3.5 mr-1" />}
								Sign All Selected
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedIds(new Set())}
							>
								Clear
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Submissions Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						Attendance Sheets ({total})
					</CardTitle>
					<CardDescription>
						Click on any row to view full attendance details
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					{loading ?
						<div className="flex justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					: sheets.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No attendance sheets found</p>
							<p className="text-sm mt-1">
								{searchQuery || statusFilter !== "ALL" ?
									"Try adjusting your search or filter"
								:	"No attendance sheets have been submitted yet"}
							</p>
						</div>
					:	<div className="border rounded-lg">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-12 text-center">
											<Checkbox
												checked={allSubmittedSelected}
												onCheckedChange={toggleSelectAll}
												aria-label="Select all"
											/>
										</TableHead>
										<TableHead className="font-bold">Student</TableHead>
										<TableHead className="text-center font-bold">
											Week
										</TableHead>
										<TableHead className="text-center font-bold">
											Department
										</TableHead>
										<TableHead className="text-center font-bold">
											Status
										</TableHead>
										<TableHead className="text-center font-bold w-40">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sheets.map((sheet) => (
										<TableRow
											key={sheet.id}
											className={cn(
												"cursor-pointer transition-colors",
												selectedIds.has(sheet.id) && "bg-blue-50/60",
												sheet.status === "SIGNED" && "bg-green-50/40",
											)}
											onClick={() => setDetailSheet(sheet)}
										>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												{sheet.status === "SUBMITTED" && (
													<Checkbox
														checked={selectedIds.has(sheet.id)}
														onCheckedChange={() => toggleSelect(sheet.id)}
													/>
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-8 w-8 rounded-full bg-hospital-primary/10 flex items-center justify-center">
														<User className="h-4 w-4 text-hospital-primary" />
													</div>
													<div>
														<div className="font-medium text-sm">
															{sheet.user.firstName} {sheet.user.lastName}
														</div>
														<div className="text-xs text-muted-foreground">
															{sheet.user.batchRelation?.name ?? "No batch"}
															{sheet.user.currentSemester ?
																` · Sem ${sheet.user.currentSemester}`
															:	""}
														</div>
													</div>
												</div>
											</TableCell>
											<TableCell className="text-center text-sm">
												{weekLabel(sheet)}
											</TableCell>
											<TableCell className="text-center text-sm">
												{sheet.postedDepartment ?? "—"}
											</TableCell>
											<TableCell className="text-center">
												<StatusBadge
													status={sheet.status as EntryStatus}
													size="sm"
												/>
											</TableCell>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex items-center justify-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-blue-600"
														title="View details"
														onClick={() => setDetailSheet(sheet)}
													>
														<Eye className="h-3.5 w-3.5" />
													</Button>
													{sheet.status === "SUBMITTED" && (
														<>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
																title="Sign"
																onClick={() => openSign(sheet)}
																disabled={isPending}
															>
																<CheckCircle2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
																title="Reject"
																onClick={() => openReject(sheet)}
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
						</div>
					}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4 px-2">
							<p className="text-sm text-muted-foreground">
								Page {page} of {totalPages} ({total} sheets)
							</p>
							<div className="flex gap-1">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1 || loading}
									onClick={() => handlePageChange(page - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages || loading}
									onClick={() => handlePageChange(page + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* ==================== Detail Sheet (Side Panel) ==================== */}
			<Sheet
				open={detailSheet !== null}
				onOpenChange={(open) => !open && setDetailSheet(null)}
			>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					{detailSheet && (
						<>
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<CalendarDays className="h-5 w-5 text-hospital-primary" />
									Attendance Details
								</SheetTitle>
								<SheetDescription>
									{detailSheet.user.firstName} {detailSheet.user.lastName}
									{" — "}
									{weekLabel(detailSheet)}
								</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-4">
								{/* Header Info */}
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-muted-foreground">Student:</span>
										<p className="font-medium">
											{detailSheet.user.firstName} {detailSheet.user.lastName}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Batch:</span>
										<p className="font-medium">
											{detailSheet.user.batchRelation?.name ?? "—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Department:</span>
										<p className="font-medium flex items-center gap-1">
											<Building2 className="h-3.5 w-3.5" />
											{detailSheet.postedDepartment ?? "—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Status:</span>
										<div className="mt-0.5">
											<StatusBadge
												status={detailSheet.status as EntryStatus}
												size="sm"
											/>
										</div>
									</div>
								</div>

								{/* Faculty Remark */}
								{detailSheet.facultyRemark && (
									<div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
										<p className="font-medium text-amber-800">
											Faculty Remark:
										</p>
										<p className="text-amber-700 mt-0.5">
											{detailSheet.facultyRemark}
										</p>
									</div>
								)}

								{/* Day-by-day table */}
								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50">
												<TableHead className="w-12 text-center font-bold">
													#
												</TableHead>
												<TableHead className="font-bold">Day</TableHead>
												<TableHead className="text-center font-bold">
													Date
												</TableHead>
												<TableHead className="text-center font-bold">
													Attendance
												</TableHead>
												<TableHead className="font-bold">HoD Name</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{DAYS_ORDERED.map((day, idx) => {
												const entry = detailSheet.entries.find(
													(e) => e.day === day,
												);
												return (
													<TableRow key={day}>
														<TableCell className="text-center text-sm font-medium">
															{idx + 1}
														</TableCell>
														<TableCell className="text-sm font-medium">
															{DAY_LABELS[day]}
														</TableCell>
														<TableCell className="text-center text-sm">
															{entry?.date ?
																format(new Date(entry.date), "dd/MM/yy")
															:	"—"}
														</TableCell>
														<TableCell className="text-center text-sm">
															{entry?.presentAbsent ?
																<span
																	className={cn(
																		"px-2 py-0.5 rounded text-xs font-medium",
																		entry.presentAbsent === "Present" &&
																			"bg-green-100 text-green-700",
																		entry.presentAbsent === "Absent" &&
																			"bg-red-100 text-red-700",
																		entry.presentAbsent === "Leave" &&
																			"bg-amber-100 text-amber-700",
																		entry.presentAbsent === "Holiday" &&
																			"bg-blue-100 text-blue-700",
																	)}
																>
																	{entry.presentAbsent}
																</span>
															:	"—"}
														</TableCell>
														<TableCell className="text-sm">
															{entry?.hodName || "—"}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>

								{/* Action buttons in detail panel */}
								{detailSheet.status === "SUBMITTED" && (
									<div className="flex gap-2 pt-2">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700"
											onClick={() => openSign(detailSheet)}
											disabled={isPending}
										>
											<CheckCircle2 className="h-4 w-4 mr-2" />
											Sign
										</Button>
										<Button
											variant="destructive"
											className="flex-1"
											onClick={() => openReject(detailSheet)}
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

			{/* ==================== Sign Dialog ==================== */}
			<Dialog
				open={signTarget !== null}
				onOpenChange={(open) => !open && setSignTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Attendance Sheet</DialogTitle>
						<DialogDescription>
							Sign the attendance sheet for{" "}
							<strong>
								{signTarget?.user.firstName} {signTarget?.user.lastName}
							</strong>{" "}
							— {signTarget ? weekLabel(signTarget) : ""}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<label className="text-sm font-medium">Remark (optional)</label>
						<Textarea
							placeholder="Add an optional remark..."
							value={signRemark}
							onChange={(e) => setSignRemark(e.target.value)}
							rows={2}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setSignTarget(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							className="bg-green-600 hover:bg-green-700"
							onClick={confirmSign}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<CheckCircle2 className="h-4 w-4 mr-1" />}
							Confirm Sign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ==================== Reject Dialog ==================== */}
			<Dialog
				open={rejectTarget !== null}
				onOpenChange={(open) => !open && setRejectTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Send the attendance sheet back to{" "}
							<strong>
								{rejectTarget?.user.firstName} {rejectTarget?.user.lastName}
							</strong>{" "}
							for revision. A remark is required.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<label className="text-sm font-medium">
							Revision Remark <span className="text-red-500">*</span>
						</label>
						<Textarea
							placeholder="Describe what needs to be corrected..."
							value={rejectRemark}
							onChange={(e) => setRejectRemark(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectTarget(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmReject}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<XCircle className="h-4 w-4 mr-1" />}
							Send for Revision
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== STAT MINI ========================

function StatMini({
	label,
	count,
	color,
}: {
	label: string;
	count: number;
	color: "default" | "amber" | "green" | "red";
}) {
	const colorClasses = {
		default: "text-foreground",
		amber: "text-amber-600",
		green: "text-green-600",
		red: "text-red-600",
	};

	return (
		<div className="bg-white border rounded-lg px-4 py-3 text-center">
			<div className={cn("text-2xl font-bold", colorClasses[color])}>
				{count}
			</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}
