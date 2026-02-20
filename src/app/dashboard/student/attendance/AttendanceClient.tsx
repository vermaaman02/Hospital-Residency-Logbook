/**
 * @module AttendanceClient
 * @description True daily attendance system with two tabs:
 *   1. Attendance — Mark daily attendance, per-entry submit for review, inline edit
 *   2. History — Full analytics, paginated entries, holiday list, export
 *
 * Each day is individually submitted for review (no weekly grouping).
 * Already-marked dates are disabled in the date picker.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 */

"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	Loader2,
	Send,
	CheckCircle2,
	X,
	ClipboardList,
	AlertTriangle,
	Search,
	Undo2,
	Trash2,
	History,
	CalendarDays,
	TrendingUp,
	ChevronLeft,
	ChevronRight,
	Pencil,
	PartyPopper,
	ShieldCheck,
	CheckCheck,
	CalendarOff,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ALL_ROTATION_NAMES } from "@/lib/constants/rotation-postings";
import {
	markDailyAttendance,
	updateDailyEntry,
	deleteDailyEntry,
	submitDailyEntry,
	submitMultipleDailyEntries,
	retractDailyEntry,
} from "@/actions/attendance";
import { FaceRecognitionAttendance } from "@/components/shared/FaceRecognitionAttendance";
import type { EntryStatus } from "@/types";

// ======================== CONSTANTS ========================

const ATTENDANCE_OPTIONS = [
	{ value: "Present", label: "Present", color: "bg-green-100 text-green-700" },
	{ value: "Leave", label: "Leave", color: "bg-amber-100 text-amber-700" },
];

const STATUS_COLOR: Record<string, string> = {
	Present: "bg-green-100 text-green-700",
	Absent: "bg-red-100 text-red-700",
	Leave: "bg-amber-100 text-amber-700",
	Holiday: "bg-blue-100 text-blue-700",
};

const ENTRIES_PER_PAGE = 15;

// ======================== TYPES ========================

interface AttendanceEntryData {
	id: string;
	attendanceSheetId: string;
	date: string | null;
	day: string;
	presentAbsent: string | null;
	hodName: string | null;
	markedAt: string | null;
	status: string;
	facultyRemark: string | null;
	attendanceSheet: {
		id: string;
		postedDepartment: string | null;
		batch: string | null;
		weekStartDate: string;
	};
}

interface HolidayData {
	id: string;
	date: string;
	name: string;
	batchId: string | null;
	batch: { name: string } | null;
}

interface AnalyticsData {
	totalDays: number;
	presentDays: number;
	absentDays: number;
	leaveDays: number;
	holidayDays: number;
	workingDays: number;
	attendancePct: number;
	minimumPct: number;
	meetsMinimum: boolean;
	monthlyTrend: {
		month: string;
		present: number;
		absent: number;
		leave: number;
		holiday: number;
		total: number;
		pct: number;
	}[];
	totalEntries: number;
	signedEntries: number;
}

interface ConfigData {
	batchId: string;
	classStartTime: string | null;
	classEndTime: string | null;
	locationEnabled: boolean;
	weeklyOffDays: string[];
	minimumAttendancePct: number;
	manualAttendanceEnabled: boolean;
	faceRecognitionEnabled: boolean;
}

interface AttendanceClientProps {
	entries: AttendanceEntryData[];
	userBatch?: string;
	userId?: string;
	userName?: string;
	userProfileImage?: string;
	facultyNames: string[];
	analytics?: AnalyticsData;
	holidays?: HolidayData[];
	currentDepartment?: string;
	config?: ConfigData | null;
}

// ======================== MAIN COMPONENT ========================

export function AttendanceClient({
	entries,
	userBatch: _userBatch,
	userId,
	userName,
	userProfileImage,
	facultyNames,
	analytics,
	holidays = [],
	currentDepartment = "",
	config = null,
}: AttendanceClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("attendance");

	// ============= MARK ATTENDANCE STATE =============
	const [markDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
	const [markStatus, setMarkStatus] = useState<string>("");
	const [markHodName, setMarkHodName] = useState<string>("");
	const [markDept, setMarkDept] = useState<string>(currentDepartment);

	// ============= INLINE EDIT STATE =============
	const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
	const [editStatus, setEditStatus] = useState<string>("");
	const [editHodName, setEditHodName] = useState<string>("");

	// ============= DELETE DIALOG =============
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	// ============= BULK SELECT STATE =============
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// ============= HISTORY TAB STATE =============
	const [historyPage, setHistoryPage] = useState(1);
	const [historySearch, setHistorySearch] = useState("");
	const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
	const [historyAttendFilter, setHistoryAttendFilter] = useState("ALL");

	// ============= DERIVED DATA =============

	// Set of already-marked dates (YYYY-MM-DD) — these dates are unselectable
	const markedDatesSet = useMemo(() => {
		const set = new Set<string>();
		for (const entry of entries) {
			if (entry.date) {
				set.add(format(new Date(entry.date), "yyyy-MM-dd"));
			}
		}
		return set;
	}, [entries]);

	// Holiday map
	const holidayMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const h of holidays) {
			map.set(format(new Date(h.date), "yyyy-MM-dd"), h.name);
		}
		return map;
	}, [holidays]);

	// Is today a declared holiday?
	const todayStr = format(new Date(), "yyyy-MM-dd");
	const todayHolidayName = holidayMap.get(todayStr) ?? null;
	const todayIsHoliday = todayHolidayName !== null;

	// Method gating: which attendance methods are available?
	const showManualForm =
		(config?.manualAttendanceEnabled ?? true) && !todayIsHoliday;
	const showFaceRecognition =
		(config?.faceRecognitionEnabled ?? false) &&
		!!config?.batchId &&
		!todayIsHoliday;

	// Entries sorted by date descending
	const sortedEntries = useMemo(() => {
		return [...entries].sort((a, b) => {
			const da = a.date ? new Date(a.date).getTime() : 0;
			const db = b.date ? new Date(b.date).getTime() : 0;
			return db - da;
		});
	}, [entries]);

	// Entries that can be submitted (DRAFT with presentAbsent set)
	const draftEntries = useMemo(
		() =>
			sortedEntries.filter(
				(e) =>
					(e.status === "DRAFT" || e.status === "NEEDS_REVISION") &&
					e.presentAbsent,
			),
		[sortedEntries],
	);

	// Selectable entries for bulk submit (draft with attendance set)
	const selectableForBulk = useMemo(
		() => draftEntries.filter((e) => e.presentAbsent),
		[draftEntries],
	);
	const allSelectableSelected =
		selectableForBulk.length > 0 &&
		selectableForBulk.every((e) => selectedIds.has(e.id));

	// Revision entries
	const revisionEntries = useMemo(
		() => sortedEntries.filter((e) => e.status === "NEEDS_REVISION"),
		[sortedEntries],
	);

	// Quick counts
	const counts = useMemo(() => {
		const c = { DRAFT: 0, SUBMITTED: 0, SIGNED: 0, NEEDS_REVISION: 0 };
		for (const e of entries) {
			if (e.status in c) c[e.status as keyof typeof c]++;
		}
		return c;
	}, [entries]);

	// History filtered entries
	const filteredHistoryEntries = useMemo(() => {
		let result = sortedEntries;
		if (historyStatusFilter !== "ALL") {
			result = result.filter((e) => e.status === historyStatusFilter);
		}
		if (historyAttendFilter !== "ALL") {
			result = result.filter((e) => e.presentAbsent === historyAttendFilter);
		}
		if (historySearch.trim()) {
			const q = historySearch.toLowerCase();
			result = result.filter(
				(e) =>
					(e.hodName ?? "").toLowerCase().includes(q) ||
					(e.attendanceSheet.postedDepartment ?? "")
						.toLowerCase()
						.includes(q) ||
					(e.presentAbsent ?? "").toLowerCase().includes(q) ||
					(e.date ? format(new Date(e.date), "dd/MM/yyyy").includes(q) : false),
			);
		}
		return result;
	}, [sortedEntries, historyStatusFilter, historyAttendFilter, historySearch]);

	// Pagination for history
	const historyTotalPages = Math.max(
		1,
		Math.ceil(filteredHistoryEntries.length / ENTRIES_PER_PAGE),
	);
	const historyPaginated = filteredHistoryEntries.slice(
		(historyPage - 1) * ENTRIES_PER_PAGE,
		historyPage * ENTRIES_PER_PAGE,
	);

	// Check if markDate is already marked
	const isDateAlreadyMarked = markedDatesSet.has(markDate);

	// ============= ACTIONS =============

	function handleMarkAttendance() {
		if (!markDate || !markStatus) {
			toast.error("Please select attendance status");
			return;
		}
		if (isDateAlreadyMarked) {
			toast.error(
				"This date is already marked. Edit the existing entry instead.",
			);
			return;
		}
		startTransition(async () => {
			try {
				await markDailyAttendance({
					date: new Date(markDate),
					presentAbsent: markStatus as "Present" | "Leave",
					hodName: markHodName || undefined,
					postedDepartment: markDept || undefined,
				});
				toast.success(
					`Marked ${markStatus} for ${format(new Date(markDate), "dd MMM yyyy")}`,
				);
				setMarkStatus("");
				setMarkHodName("");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to mark attendance",
				);
			}
		});
	}

	function handleSubmitEntry(entryId: string) {
		startTransition(async () => {
			try {
				await submitDailyEntry(entryId);
				toast.success("Entry submitted for review");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	function handleBulkSubmit() {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		startTransition(async () => {
			try {
				const result = await submitMultipleDailyEntries(ids);
				toast.success(`Submitted ${result.submittedCount} entries for review`);
				setSelectedIds(new Set());
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	function handleRetractEntry(entryId: string) {
		startTransition(async () => {
			try {
				await retractDailyEntry(entryId);
				toast.success("Entry retracted to draft");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to retract",
				);
			}
		});
	}

	function startEdit(entry: AttendanceEntryData) {
		setEditingEntryId(entry.id);
		setEditStatus(entry.presentAbsent ?? "");
		setEditHodName(entry.hodName ?? "");
	}

	function cancelEdit() {
		setEditingEntryId(null);
		setEditStatus("");
		setEditHodName("");
	}

	function saveEdit(entryId: string) {
		if (!editStatus) {
			toast.error("Please select attendance status");
			return;
		}
		startTransition(async () => {
			try {
				await updateDailyEntry(entryId, {
					presentAbsent: editStatus,
					hodName: editHodName,
				});
				toast.success("Entry updated");
				cancelEdit();
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to update",
				);
			}
		});
	}

	function confirmDelete() {
		if (!deleteTarget) return;
		startTransition(async () => {
			try {
				await deleteDailyEntry(deleteTarget);
				toast.success("Entry deleted");
				setDeleteTarget(null);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to delete",
				);
			}
		});
	}

	function toggleSelect(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleSelectAll() {
		if (allSelectableSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(selectableForBulk.map((e) => e.id)));
		}
	}

	// ---- Export ----
	async function handleExportPdf() {
		try {
			const { exportDailyAttendancePdf } =
				await import("@/lib/export/export-pdf");
			exportDailyAttendancePdf(entries);
		} catch {
			toast.error("PDF export not available");
		}
	}

	async function handleExportExcel() {
		try {
			const { exportDailyAttendanceExcel } =
				await import("@/lib/export/export-excel");
			exportDailyAttendanceExcel(entries);
		} catch {
			toast.error("Excel export not available");
		}
	}

	// ======================== RENDER ========================

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
			<TabsList className="grid w-full grid-cols-2 max-w-md">
				<TabsTrigger value="attendance" className="flex items-center gap-2">
					<CalendarDays className="h-4 w-4" />
					Attendance
					{counts.DRAFT > 0 && (
						<Badge variant="secondary" className="ml-1 text-xs">
							{counts.DRAFT}
						</Badge>
					)}
				</TabsTrigger>
				<TabsTrigger value="history" className="flex items-center gap-2">
					<History className="h-4 w-4" />
					History
				</TabsTrigger>
			</TabsList>

			{/* ==================== ATTENDANCE TAB ==================== */}
			<TabsContent value="attendance" className="space-y-4">
				{/* Quick Stats */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<MiniStat
						label="Total Entries"
						value={entries.length}
						color="text-foreground"
					/>
					<MiniStat label="Draft" value={counts.DRAFT} color="text-gray-600" />
					<MiniStat
						label="Pending Review"
						value={counts.SUBMITTED}
						color="text-amber-600"
					/>
					<MiniStat
						label="Signed"
						value={counts.SIGNED}
						color="text-green-600"
					/>
				</div>

				{/* Revision Banner */}
				{revisionEntries.length > 0 && (
					<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
						<div>
							<p className="font-medium text-amber-800">
								{revisionEntries.length} entry(ies) need revision
							</p>
							{revisionEntries.slice(0, 3).map((e) => (
								<p key={e.id} className="text-sm text-amber-700 mt-1">
									{e.date ? format(new Date(e.date), "dd MMM yyyy") : "—"}
									{e.facultyRemark && ` — "${e.facultyRemark}"`}
								</p>
							))}
						</div>
					</div>
				)}

				{/* Holiday Banner — blocks all attendance today */}
				{todayIsHoliday && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
						<CalendarOff className="h-6 w-6 text-red-500 mt-0.5 shrink-0" />
						<div>
							<p className="font-semibold text-red-800">
								Today is a holiday — {todayHolidayName}
							</p>
							<p className="text-sm text-red-600 mt-1">
								Attendance cannot be marked or calculated on declared holidays.
							</p>
						</div>
					</div>
				)}

				{/* Mark Attendance Card */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<CalendarDays className="h-5 w-5 text-hospital-primary" />
							Mark Daily Attendance
						</CardTitle>
						<CardDescription>
							Select your attendance status for today. Each day is submitted
							independently for review.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{/* Config Info Banner */}
						{config && (
							<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
								<div className="flex flex-wrap gap-x-6 gap-y-1">
									{config.classStartTime && config.classEndTime && (
										<span>
											🕐 Time window:{" "}
											<strong>
												{config.classStartTime} – {config.classEndTime}
											</strong>
										</span>
									)}
									{config.locationEnabled && (
										<span>
											📍 Location verification: <strong>Enabled</strong>
										</span>
									)}
									{config.weeklyOffDays?.length > 0 && (
										<span>
											📅 Weekly off:{" "}
											<strong>
												{config.weeklyOffDays
													.map((d) => d.charAt(0) + d.slice(1).toLowerCase())
													.join(", ")}
											</strong>
										</span>
									)}
								</div>
							</div>
						)}
						{/* Face Recognition — shown when enabled in config and not a holiday */}
						{showFaceRecognition && (
							<div className="mb-4">
								<FaceRecognitionAttendance
									batchId={config!.batchId}
									currentStudentId={userId}
									currentStudentName={userName}
									currentStudentImageUrl={userProfileImage}
									onAttendanceMarked={() => router.refresh()}
									disabled={isDateAlreadyMarked}
								/>
							</div>
						)}
						{/* Manual Form — shown when enabled in config and not a holiday */}
						{showManualForm ?
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
								{/* Date — locked to today */}
								<div>
									<label className="text-sm font-medium mb-1 block">Date</label>
									<Input
										type="date"
										value={markDate}
										readOnly
										disabled
										className="bg-muted cursor-not-allowed"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										You can only mark today&apos;s attendance
									</p>
									{isDateAlreadyMarked && (
										<p className="text-xs text-amber-600 mt-0.5">
											Already marked — edit below
										</p>
									)}
								</div>

								{/* Status */}
								<div>
									<label className="text-sm font-medium mb-1 block">
										Status
									</label>
									<Select value={markStatus} onValueChange={setMarkStatus}>
										<SelectTrigger>
											<SelectValue placeholder="Select..." />
										</SelectTrigger>
										<SelectContent>
											{ATTENDANCE_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* HoD Name */}
								<div>
									<label className="text-sm font-medium mb-1 block">
										HoD Name
									</label>
									<Select value={markHodName} onValueChange={setMarkHodName}>
										<SelectTrigger>
											<SelectValue placeholder="Select HoD..." />
										</SelectTrigger>
										<SelectContent>
											{facultyNames.map((n) => (
												<SelectItem key={n} value={n}>
													{n}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Department */}
								<div>
									<label className="text-sm font-medium mb-1 block">
										Department
									</label>
									<Select value={markDept} onValueChange={setMarkDept}>
										<SelectTrigger>
											<SelectValue placeholder="Department..." />
										</SelectTrigger>
										<SelectContent>
											{ALL_ROTATION_NAMES.map((r) => (
												<SelectItem key={r} value={r}>
													{r}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Submit Button */}
								<Button
									onClick={handleMarkAttendance}
									disabled={
										isPending || !markDate || !markStatus || isDateAlreadyMarked
									}
									className="bg-hospital-primary hover:bg-hospital-primary-dark"
								>
									{isPending ?
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									:	<CalendarDays className="h-4 w-4 mr-2" />}
									Mark
								</Button>
							</div>
						: !todayIsHoliday ?
							<div className="text-center py-4 text-sm text-muted-foreground">
								Manual attendance form is disabled by administrator.
								{showFaceRecognition &&
									" Use face recognition to mark attendance."}
							</div>
						:	null}
					</CardContent>
				</Card>

				{/* Bulk Actions */}
				{selectedIds.size > 0 && (
					<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<span className="text-sm font-medium text-blue-700">
							{selectedIds.size} selected
						</span>
						<Button
							size="sm"
							className="bg-hospital-primary hover:bg-hospital-primary-dark text-white"
							onClick={handleBulkSubmit}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
							:	<CheckCheck className="h-3.5 w-3.5 mr-1" />}
							Submit All Selected
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

				{/* Daily Entries Table */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg flex items-center gap-2">
									<ClipboardList className="h-5 w-5" />
									Your Entries ({entries.length})
								</CardTitle>
								<CardDescription>
									Each entry can be individually submitted for faculty review
								</CardDescription>
							</div>
							{selectableForBulk.length > 0 && (
								<div className="flex items-center gap-2">
									<Checkbox
										checked={allSelectableSelected}
										onCheckedChange={toggleSelectAll}
									/>
									<span className="text-xs text-muted-foreground">
										Select all draft
									</span>
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent className="p-0 sm:p-6">
						{sortedEntries.length === 0 ?
							<div className="text-center py-12 text-muted-foreground">
								<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
								<p className="font-medium">No attendance entries yet</p>
								<p className="text-sm mt-1">Mark your first attendance above</p>
							</div>
						:	<div className="border rounded-lg overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/50">
											<TableHead className="w-10 text-center">
												<span className="sr-only">Select</span>
											</TableHead>
											<TableHead className="font-bold">Date</TableHead>
											<TableHead className="text-center font-bold">
												Day
											</TableHead>
											<TableHead className="text-center font-bold">
												Attendance
											</TableHead>
											<TableHead className="font-bold">HoD Name</TableHead>
											<TableHead className="font-bold">Department</TableHead>
											<TableHead className="text-center font-bold">
												Status
											</TableHead>
											<TableHead className="text-center font-bold w-48">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedEntries.map((entry) => {
											const isEditing = editingEntryId === entry.id;
											const canEdit =
												entry.status === "DRAFT" ||
												entry.status === "NEEDS_REVISION";
											const canSubmit = canEdit && !!entry.presentAbsent;
											const canRetract = entry.status === "SUBMITTED";
											const canDelete = canEdit;

											return (
												<TableRow
													key={entry.id}
													className={cn(
														selectedIds.has(entry.id) && "bg-blue-50/60",
														entry.status === "SIGNED" && "bg-green-50/40",
														entry.status === "NEEDS_REVISION" &&
															"bg-amber-50/40",
													)}
												>
													{/* Checkbox */}
													<TableCell className="text-center">
														{canSubmit && (
															<Checkbox
																checked={selectedIds.has(entry.id)}
																onCheckedChange={() => toggleSelect(entry.id)}
															/>
														)}
													</TableCell>

													{/* Date */}
													<TableCell className="text-sm font-medium">
														{entry.date ?
															format(new Date(entry.date), "dd MMM yyyy")
														:	"—"}
														{entry.date && isToday(new Date(entry.date)) && (
															<Badge
																variant="outline"
																className="ml-2 text-xs border-hospital-primary text-hospital-primary"
															>
																Today
															</Badge>
														)}
													</TableCell>

													{/* Day */}
													<TableCell className="text-center text-sm">
														{entry.day ?
															entry.day.charAt(0) +
															entry.day.slice(1).toLowerCase()
														:	"—"}
													</TableCell>

													{/* Attendance */}
													<TableCell className="text-center">
														{isEditing ?
															<Select
																value={editStatus}
																onValueChange={setEditStatus}
															>
																<SelectTrigger className="h-8 w-28 mx-auto">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{ATTENDANCE_OPTIONS.map((opt) => (
																		<SelectItem
																			key={opt.value}
																			value={opt.value}
																		>
																			{opt.label}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														: entry.presentAbsent ?
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

													{/* HoD Name */}
													<TableCell className="text-sm">
														{isEditing ?
															<Select
																value={editHodName}
																onValueChange={setEditHodName}
															>
																<SelectTrigger className="h-8 w-36">
																	<SelectValue placeholder="HoD..." />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="">None</SelectItem>
																	{facultyNames.map((n) => (
																		<SelectItem key={n} value={n}>
																			{n}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														:	entry.hodName || "—"}
													</TableCell>

													{/* Department */}
													<TableCell className="text-sm">
														{entry.attendanceSheet.postedDepartment || "—"}
													</TableCell>

													{/* Status */}
													<TableCell className="text-center">
														<StatusBadge
															status={entry.status as EntryStatus}
															size="sm"
														/>
													</TableCell>

													{/* Actions */}
													<TableCell className="text-center">
														<div className="flex items-center justify-center gap-1">
															{isEditing ?
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-7 w-7 text-green-600"
																		onClick={() => saveEdit(entry.id)}
																		disabled={isPending}
																		title="Save"
																	>
																		<CheckCircle2 className="h-3.5 w-3.5" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-7 w-7 text-gray-500"
																		onClick={cancelEdit}
																		title="Cancel"
																	>
																		<X className="h-3.5 w-3.5" />
																	</Button>
																</>
															:	<>
																	{canSubmit && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 text-hospital-primary"
																			onClick={() =>
																				handleSubmitEntry(entry.id)
																			}
																			disabled={isPending}
																			title="Send for review"
																		>
																			<Send className="h-3.5 w-3.5" />
																		</Button>
																	)}
																	{canRetract && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 text-amber-600"
																			onClick={() =>
																				handleRetractEntry(entry.id)
																			}
																			disabled={isPending}
																			title="Retract"
																		>
																			<Undo2 className="h-3.5 w-3.5" />
																		</Button>
																	)}
																	{canEdit && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 text-blue-600"
																			onClick={() => startEdit(entry)}
																			disabled={isPending}
																			title="Edit"
																		>
																			<Pencil className="h-3.5 w-3.5" />
																		</Button>
																	)}
																	{canDelete && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 text-red-500"
																			onClick={() => setDeleteTarget(entry.id)}
																			disabled={isPending}
																			title="Delete"
																		>
																			<Trash2 className="h-3.5 w-3.5" />
																		</Button>
																	)}
																	{entry.status === "SIGNED" && (
																		<ShieldCheck className="h-4 w-4 text-green-500" />
																	)}
																</>
															}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						}

						{/* Faculty Remarks Inline */}
						{sortedEntries.some((e) => e.facultyRemark) && (
							<div className="mt-4 space-y-2">
								{sortedEntries
									.filter((e) => e.facultyRemark)
									.map((e) => (
										<div
											key={e.id}
											className="p-2 bg-amber-50 border border-amber-200 rounded text-sm"
										>
											<span className="font-medium text-amber-800">
												{e.date ? format(new Date(e.date), "dd MMM") : "Entry"}:
											</span>{" "}
											<span className="text-amber-700">{e.facultyRemark}</span>
										</div>
									))}
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			{/* ==================== HISTORY TAB ==================== */}
			<TabsContent value="history" className="space-y-4">
				{/* Analytics Dashboard */}
				{analytics && <AnalyticsDashboard analytics={analytics} />}

				{/* Filters */}
				<Card>
					<CardContent className="p-4">
						<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
							<div className="relative flex-1 w-full">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search by HoD, department, date..."
									value={historySearch}
									onChange={(e) => {
										setHistorySearch(e.target.value);
										setHistoryPage(1);
									}}
									className="pl-9"
								/>
							</div>
							<Select
								value={historyStatusFilter}
								onValueChange={(v) => {
									setHistoryStatusFilter(v);
									setHistoryPage(1);
								}}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Status</SelectItem>
									<SelectItem value="DRAFT">Draft</SelectItem>
									<SelectItem value="SUBMITTED">Submitted</SelectItem>
									<SelectItem value="SIGNED">Signed</SelectItem>
									<SelectItem value="NEEDS_REVISION">Revision</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={historyAttendFilter}
								onValueChange={(v) => {
									setHistoryAttendFilter(v);
									setHistoryPage(1);
								}}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Types</SelectItem>
									{ATTENDANCE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<ExportDropdown
								onExportPdf={handleExportPdf}
								onExportExcel={handleExportExcel}
							/>
						</div>
					</CardContent>
				</Card>

				{/* History Table */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<History className="h-5 w-5" />
							All Entries ({filteredHistoryEntries.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 sm:p-6">
						{filteredHistoryEntries.length === 0 ?
							<div className="text-center py-12 text-muted-foreground">
								<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
								<p className="font-medium">No entries found</p>
							</div>
						:	<>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50">
												<TableHead className="w-10 text-center font-bold">
													#
												</TableHead>
												<TableHead className="font-bold">Date</TableHead>
												<TableHead className="text-center font-bold">
													Day
												</TableHead>
												<TableHead className="text-center font-bold">
													Attendance
												</TableHead>
												<TableHead className="font-bold">HoD</TableHead>
												<TableHead className="font-bold">Department</TableHead>
												<TableHead className="text-center font-bold">
													Status
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{historyPaginated.map((entry, idx) => (
												<TableRow
													key={entry.id}
													className={cn(
														entry.status === "SIGNED" && "bg-green-50/40",
														entry.status === "NEEDS_REVISION" &&
															"bg-amber-50/40",
													)}
												>
													<TableCell className="text-center text-sm text-muted-foreground">
														{(historyPage - 1) * ENTRIES_PER_PAGE + idx + 1}
													</TableCell>
													<TableCell className="text-sm font-medium">
														{entry.date ?
															format(new Date(entry.date), "dd MMM yyyy")
														:	"—"}
													</TableCell>
													<TableCell className="text-center text-sm">
														{entry.day ?
															entry.day.charAt(0) +
															entry.day.slice(1).toLowerCase()
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
													<TableCell className="text-sm">
														{entry.hodName || "—"}
													</TableCell>
													<TableCell className="text-sm">
														{entry.attendanceSheet.postedDepartment || "—"}
													</TableCell>
													<TableCell className="text-center">
														<StatusBadge
															status={entry.status as EntryStatus}
															size="sm"
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>

								{/* Pagination */}
								{historyTotalPages > 1 && (
									<div className="flex items-center justify-between mt-4 px-2">
										<p className="text-sm text-muted-foreground">
											Page {historyPage} of {historyTotalPages}
										</p>
										<div className="flex gap-1">
											<Button
												variant="outline"
												size="sm"
												disabled={historyPage <= 1}
												onClick={() => setHistoryPage((p) => p - 1)}
											>
												<ChevronLeft className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												disabled={historyPage >= historyTotalPages}
												onClick={() => setHistoryPage((p) => p + 1)}
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

				{/* Holidays */}
				{holidays.length > 0 && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<PartyPopper className="h-5 w-5" />
								Holidays ({holidays.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
								{holidays.map((h) => (
									<div
										key={h.id}
										className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm"
									>
										<CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
										<span className="font-medium">
											{format(new Date(h.date), "dd MMM yyyy")}
										</span>
										<span className="text-muted-foreground">— {h.name}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</TabsContent>

			{/* ==================== DELETE DIALOG ==================== */}
			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Attendance Entry</DialogTitle>
						<DialogDescription>
							Are you sure? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteTarget(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDelete}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<Trash2 className="h-4 w-4 mr-1" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Tabs>
	);
}

// ======================== ANALYTICS DASHBOARD ========================

function AnalyticsDashboard({ analytics }: { analytics: AnalyticsData }) {
	return (
		<div className="space-y-4">
			{/* Summary Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
				<Card className="text-center p-4">
					<div
						className={cn(
							"text-2xl font-bold",
							analytics.meetsMinimum ? "text-green-600" : "text-red-600",
						)}
					>
						{analytics.attendancePct}%
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						Attendance Rate
					</div>
					<div className="text-xs text-muted-foreground">
						Min: {analytics.minimumPct}%
					</div>
				</Card>
				<Card className="text-center p-4">
					<div className="text-2xl font-bold text-green-600">
						{analytics.presentDays}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Present</div>
				</Card>
				<Card className="text-center p-4">
					<div className="text-2xl font-bold text-red-600">
						{analytics.absentDays}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Absent</div>
				</Card>
				<Card className="text-center p-4">
					<div className="text-2xl font-bold text-amber-600">
						{analytics.leaveDays}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Leave</div>
				</Card>
				<Card className="text-center p-4">
					<div className="text-2xl font-bold text-purple-600">
						{analytics.holidayDays}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Holiday</div>
				</Card>
				<Card className="text-center p-4">
					<div className="text-2xl font-bold text-blue-600">
						{analytics.totalDays}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Total Days</div>
				</Card>
			</div>

			{/* Criteria */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-3">
						{analytics.meetsMinimum ?
							<>
								<ShieldCheck className="h-5 w-5 text-green-600" />
								<span className="text-sm text-green-700 font-medium">
									You meet the minimum attendance requirement (
									{analytics.minimumPct}%)
								</span>
							</>
						:	<>
								<AlertTriangle className="h-5 w-5 text-red-600" />
								<span className="text-sm text-red-700 font-medium">
									Below minimum attendance requirement ({analytics.minimumPct}
									%) — Current: {analytics.attendancePct}%
								</span>
							</>
						}
					</div>
				</CardContent>
			</Card>

			{/* Monthly Trend */}
			{analytics.monthlyTrend.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<TrendingUp className="h-4 w-4" />
							Monthly Trend
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
							{analytics.monthlyTrend.map((m) => (
								<div
									key={m.month}
									className="text-center p-2 bg-muted/50 rounded"
								>
									<div className="text-xs text-muted-foreground">{m.month}</div>
									<div
										className={cn(
											"text-lg font-bold",
											m.pct >= analytics.minimumPct ?
												"text-green-600"
											:	"text-red-600",
										)}
									>
										{m.pct}%
									</div>
									<div className="text-xs text-muted-foreground">
										P:{m.present} A:{m.absent} L:{m.leave}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ======================== MINI STAT ========================

function MiniStat({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="bg-white border rounded-lg px-4 py-3 text-center">
			<div className={cn("text-2xl font-bold", color)}>{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}
