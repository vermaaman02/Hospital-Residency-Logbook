/**
 * @module AttendanceReviewClient
 * @description Review UI for daily attendance entries with server-side pagination.
 * Features: stat cards, search, batch/status filter, bulk select, detail panel,
 * sign/reject dialogs with remarks, auto-review toggle.
 * Each entry is an individual day (not weekly sheets).
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 * @see actions/attendance.ts — getDailyEntriesForReview, signDailyEntry, etc.
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
	signDailyEntry,
	rejectDailyEntry,
	bulkSignDailyEntries,
	getDailyEntriesForReview,
} from "@/actions/attendance";
import { toggleAutoReview } from "@/actions/auto-review";
import type { AutoReviewSettings } from "@/actions/auto-review";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface DailyEntryForReview {
	id: string;
	date: string | null;
	day: string;
	presentAbsent: string | null;
	hodName: string | null;
	status: string;
	facultyRemark: string | null;
	signedAt: string | null;
	signedBy: string | null;
	markedAt: string | null;
	attendanceSheet: {
		userId: string;
		batch: string | null;
		postedDepartment: string | null;
		user: {
			id: string;
			firstName: string;
			lastName: string;
			batchRelation: { name: string } | null;
			currentSemester: number | null;
			profileImage: string | null;
		};
	};
}

interface PaginatedEntries {
	data: DailyEntryForReview[];
	total: number;
	page: number;
	pageSize: number;
}

interface AttendanceReviewClientProps {
	entries: PaginatedEntries;
	role: "faculty" | "hod";
	autoReviewSettings: AutoReviewSettings;
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const STATUS_COLOR: Record<string, string> = {
	Present: "bg-green-100 text-green-700",
	Absent: "bg-red-100 text-red-700",
	Leave: "bg-amber-100 text-amber-700",
	Holiday: "bg-blue-100 text-blue-700",
};

// ======================== MAIN COMPONENT ========================

export function AttendanceReviewClient({
	entries: initialEntries,
	role,
	autoReviewSettings,
}: AttendanceReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Server-side paginated data
	const [entries, setEntries] = useState(initialEntries.data);
	const [total, setTotal] = useState(initialEntries.total);
	const [page, setPage] = useState(initialEntries.page);
	const pageSize = initialEntries.pageSize;
	const [loading, setLoading] = useState(false);

	// Search & filter
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [batchFilter, setBatchFilter] = useState("ALL");

	// Batches from current page
	const batches = useMemo(() => {
		const set = new Set<string>();
		entries.forEach((e) => {
			if (e.attendanceSheet.user.batchRelation?.name)
				set.add(e.attendanceSheet.user.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [entries]);

	// Bulk selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Detail entry
	const [detailEntry, setDetailEntry] = useState<DailyEntryForReview | null>(
		null,
	);

	// Sign dialog
	const [signTarget, setSignTarget] = useState<DailyEntryForReview | null>(
		null,
	);
	const [signRemark, setSignRemark] = useState("");

	// Reject dialog
	const [rejectTarget, setRejectTarget] = useState<DailyEntryForReview | null>(
		null,
	);
	const [rejectRemark, setRejectRemark] = useState("");

	// Auto-review toggle
	const [autoReview, setAutoReview] = useState(autoReviewSettings.attendance);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	// ---- Server-side data fetching ----
	const fetchEntries = useCallback(
		async (pg: number, status?: string, batch?: string, search?: string) => {
			setLoading(true);
			try {
				const result = await getDailyEntriesForReview({
					page: pg,
					pageSize,
					status: status || undefined,
					batchId: batch || undefined,
					search: search || undefined,
				});
				const serialized = JSON.parse(JSON.stringify(result));
				setEntries(serialized.data);
				setTotal(serialized.total);
				setPage(serialized.page);
			} catch {
				toast.error("Failed to load attendance entries");
			} finally {
				setLoading(false);
			}
		},
		[pageSize],
	);

	function handlePageChange(newPage: number) {
		setSelectedIds(new Set());
		fetchEntries(
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
		fetchEntries(
			1,
			newStatus !== "ALL" ? newStatus : undefined,
			newBatch !== "ALL" ? newBatch : undefined,
			newSearch || undefined,
		);
	}

	// ---- Counts (from current page view) ----
	const counts = useMemo(() => {
		const c = { SUBMITTED: 0, SIGNED: 0, NEEDS_REVISION: 0, DRAFT: 0 };
		for (const e of entries) {
			if (e.status in c) c[e.status as keyof typeof c]++;
		}
		return { ...c, ALL: entries.length };
	}, [entries]);

	// ---- Bulk Select ----
	const submittedInView = entries.filter((e) => e.status === "SUBMITTED");
	const allSubmittedSelected =
		submittedInView.length > 0 &&
		submittedInView.every((e) => selectedIds.has(e.id));

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
			setSelectedIds(new Set(submittedInView.map((e) => e.id)));
		}
	}

	// ---- Actions ----
	function openSign(entry: DailyEntryForReview) {
		setSignTarget(entry);
		setSignRemark("");
	}

	function confirmSign() {
		if (!signTarget) return;
		startTransition(async () => {
			try {
				await signDailyEntry(signTarget.id, signRemark || undefined);
				toast.success(
					`Signed attendance for ${signTarget.attendanceSheet.user.firstName} ${signTarget.attendanceSheet.user.lastName}`,
				);
				setSignTarget(null);
				setDetailEntry(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(signTarget.id);
					return next;
				});
				fetchEntries(
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

	function openReject(entry: DailyEntryForReview) {
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
				await rejectDailyEntry(rejectTarget.id, rejectRemark);
				toast.success(
					`Sent back for revision: ${rejectTarget.attendanceSheet.user.firstName} ${rejectTarget.attendanceSheet.user.lastName}`,
				);
				setRejectTarget(null);
				setDetailEntry(null);
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(rejectTarget.id);
					return next;
				});
				fetchEntries(
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
				const result = await bulkSignDailyEntries(ids);
				toast.success(`Signed ${result.signedCount} entries`);
				setSelectedIds(new Set());
				fetchEntries(
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

	function studentLabel(e: DailyEntryForReview) {
		return `${e.attendanceSheet.user.firstName} ${e.attendanceSheet.user.lastName}`;
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

			{/* Entries Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						Daily Attendance Entries ({total})
					</CardTitle>
					<CardDescription>
						Review individual daily attendance entries from students
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					{loading ?
						<div className="flex justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					: entries.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No attendance entries found</p>
							<p className="text-sm mt-1">
								{searchQuery || statusFilter !== "ALL" ?
									"Try adjusting your search or filter"
								:	"No attendance entries have been submitted yet"}
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
											Date
										</TableHead>
										<TableHead className="text-center font-bold">Day</TableHead>
										<TableHead className="text-center font-bold">
											Attendance
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
									{entries.map((entry) => (
										<TableRow
											key={entry.id}
											className={cn(
												"cursor-pointer transition-colors",
												selectedIds.has(entry.id) && "bg-blue-50/60",
												entry.status === "SIGNED" && "bg-green-50/40",
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
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-8 w-8 rounded-full bg-hospital-primary/10 flex items-center justify-center">
														<User className="h-4 w-4 text-hospital-primary" />
													</div>
													<div>
														<button
															type="button"
															className="font-medium text-sm text-hospital-primary hover:underline text-left"
															onClick={(e) => {
																e.stopPropagation();
																router.push(
																	`/dashboard/faculty/attendance/student/${entry.attendanceSheet.user.id}`,
																);
															}}
														>
															{studentLabel(entry)}
														</button>
														<div className="text-xs text-muted-foreground">
															{entry.attendanceSheet.user.batchRelation?.name ??
																"No batch"}
															{entry.attendanceSheet.user.currentSemester ?
																` · Sem ${entry.attendanceSheet.user.currentSemester}`
															:	""}
														</div>
													</div>
												</div>
											</TableCell>
											<TableCell className="text-center text-sm font-medium">
												{entry.date ?
													format(new Date(entry.date), "dd MMM yyyy")
												:	"—"}
											</TableCell>
											<TableCell className="text-center text-sm">
												{entry.day ?
													entry.day.charAt(0) + entry.day.slice(1).toLowerCase()
												:	"—"}
											</TableCell>
											<TableCell className="text-center">
												{entry.presentAbsent ?
													<span
														className={cn(
															"px-2 py-0.5 rounded text-xs font-medium",
															STATUS_COLOR[entry.presentAbsent] ??
																"bg-gray-100 text-gray-600",
														)}
													>
														{entry.presentAbsent}
													</span>
												:	"—"}
											</TableCell>
											<TableCell className="text-center text-sm">
												{entry.attendanceSheet.postedDepartment ?? "—"}
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
												<div className="flex items-center justify-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-blue-600"
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
																onClick={() => openSign(entry)}
																disabled={isPending}
															>
																<CheckCircle2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
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
								</TableBody>
							</Table>
						</div>
					}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4 px-2">
							<p className="text-sm text-muted-foreground">
								Page {page} of {totalPages} ({total} entries)
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

			{/* ==================== Detail Panel ==================== */}
			<Sheet
				open={detailEntry !== null}
				onOpenChange={(open) => !open && setDetailEntry(null)}
			>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					{detailEntry && (
						<>
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<CalendarDays className="h-5 w-5 text-hospital-primary" />
									Attendance Entry Detail
								</SheetTitle>
								<SheetDescription>
									{studentLabel(detailEntry)}
									{" — "}
									{detailEntry.date ?
										format(new Date(detailEntry.date), "dd MMM yyyy")
									:	"—"}
								</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-4">
								{/* Detail Grid */}
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-muted-foreground">Student:</span>
										<p className="font-medium">{studentLabel(detailEntry)}</p>
									</div>
									<div>
										<span className="text-muted-foreground">Batch:</span>
										<p className="font-medium">
											{detailEntry.attendanceSheet.user.batchRelation?.name ??
												"—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Date:</span>
										<p className="font-medium">
											{detailEntry.date ?
												format(new Date(detailEntry.date), "EEEE, dd MMM yyyy")
											:	"—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Attendance:</span>
										<p className="font-medium mt-0.5">
											{detailEntry.presentAbsent ?
												<span
													className={cn(
														"px-2 py-0.5 rounded text-xs font-medium",
														STATUS_COLOR[detailEntry.presentAbsent] ??
															"bg-gray-100 text-gray-600",
													)}
												>
													{detailEntry.presentAbsent}
												</span>
											:	"—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Department:</span>
										<p className="font-medium flex items-center gap-1">
											<Building2 className="h-3.5 w-3.5" />
											{detailEntry.attendanceSheet.postedDepartment ?? "—"}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">HoD Name:</span>
										<p className="font-medium">{detailEntry.hodName || "—"}</p>
									</div>
									<div>
										<span className="text-muted-foreground">Status:</span>
										<div className="mt-0.5">
											<StatusBadge
												status={detailEntry.status as EntryStatus}
												size="sm"
											/>
										</div>
									</div>
									<div>
										<span className="text-muted-foreground">Marked At:</span>
										<p className="font-medium">
											{detailEntry.markedAt ?
												format(
													new Date(detailEntry.markedAt),
													"dd MMM yyyy, HH:mm",
												)
											:	"—"}
										</p>
									</div>
								</div>

								{/* Faculty Remark */}
								{detailEntry.facultyRemark && (
									<div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
										<p className="font-medium text-amber-800">
											Faculty Remark:
										</p>
										<p className="text-amber-700 mt-0.5">
											{detailEntry.facultyRemark}
										</p>
									</div>
								)}

								{/* Signed info */}
								{detailEntry.signedAt && (
									<div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
										<p className="font-medium text-green-800">Signed</p>
										<p className="text-green-700 mt-0.5">
											{format(
												new Date(detailEntry.signedAt),
												"dd MMM yyyy, HH:mm",
											)}
										</p>
									</div>
								)}

								{/* Action buttons in detail panel */}
								{detailEntry.status === "SUBMITTED" && (
									<div className="flex gap-2 pt-2">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700"
											onClick={() => openSign(detailEntry)}
											disabled={isPending}
										>
											<CheckCircle2 className="h-4 w-4 mr-2" />
											Sign
										</Button>
										<Button
											variant="destructive"
											className="flex-1"
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

			{/* ==================== Sign Dialog ==================== */}
			<Dialog
				open={signTarget !== null}
				onOpenChange={(open) => !open && setSignTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Attendance Entry</DialogTitle>
						<DialogDescription>
							Sign the attendance entry for{" "}
							<strong>{signTarget ? studentLabel(signTarget) : ""}</strong>
							{" — "}
							{signTarget?.date ?
								format(new Date(signTarget.date), "dd MMM yyyy")
							:	""}
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
							Send the attendance entry back to{" "}
							<strong>{rejectTarget ? studentLabel(rejectTarget) : ""}</strong>{" "}
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
