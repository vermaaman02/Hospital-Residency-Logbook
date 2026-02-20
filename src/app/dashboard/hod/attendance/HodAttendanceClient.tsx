/**
 * @module HodAttendanceClient
 * @description Comprehensive HOD attendance management with four tabs:
 * 1. Overview — batch-wise student attendance summary with percentages, alerts
 * 2. Config — batch attendance settings (timing, location, weekly off, min %)
 * 3. Holidays — calendar-based holiday management per batch or global
 * 4. Review — review submitted attendance sheets with pagination, sign/reject
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 * @see actions/attendance.ts — all HOD attendance actions
 */

"use client";

import React, {
	useState,
	useTransition,
	useMemo,
	useCallback,
	useEffect,
} from "react";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	Search,
	CheckCircle2,
	XCircle,
	Loader2,
	Eye,
	CheckCheck,
	User,
	CalendarDays,
	ClipboardList,
	ChevronLeft,
	ChevronRight,
	Building2,
	Settings,
	CalendarPlus,
	BarChart3,
	Trash2,
	MapPin,
	Clock,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Users,
	GraduationCap,
	Plus,
	CalendarIcon,
	Percent,
	ScanFace,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	upsertAttendanceConfig,
	addHoliday,
	removeHoliday,
	signDailyEntry,
	rejectDailyEntry,
	bulkSignDailyEntries,
	getDailyEntriesForReview,
} from "@/actions/attendance";
import { toggleAutoReview } from "@/actions/auto-review";
import type { AutoReviewSettings } from "@/actions/auto-review";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface BatchData {
	id: string;
	name: string;
	currentSemester: number;
	startDate: string;
	endDate: string | null;
	isActive: boolean;
}

interface ConfigData {
	id: string;
	batchId: string;
	batchStartDate: string;
	batchEndDate: string;
	classStartTime: string;
	classEndTime: string;
	locationEnabled: boolean;
	locationLatitude: number | null;
	locationLongitude: number | null;
	locationRadiusMeters: number | null;
	weeklyOffDays: string[];
	minimumAttendancePct: number;
	manualAttendanceEnabled: boolean;
	faceRecognitionEnabled: boolean;
}

interface HolidayData {
	id: string;
	date: string;
	name: string;
	batchId: string | null;
	batch: { name: string } | null;
}

interface StudentSummary {
	id: string;
	name: string;
	batch: string | null;
	batchId: string | null;
	semester: number | null;
	profileImage: string | null;
	totalDays: number;
	presentDays: number;
	absentDays: number;
	workingDays: number;
	attendancePct: number;
	minimumPct: number;
	meetsMinimum: boolean;
	totalEntries: number;
	signedEntries: number;
}

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

interface HodAttendanceClientProps {
	batches: BatchData[];
	configs: ConfigData[];
	holidays: HolidayData[];
	studentSummaries: StudentSummary[];
	initialEntries: {
		data: DailyEntryForReview[];
		total: number;
		page: number;
		pageSize: number;
	};
	autoReviewSettings: AutoReviewSettings;
}

const STATUS_COLOR: Record<string, string> = {
	Present: "bg-green-100 text-green-700",
	Absent: "bg-red-100 text-red-700",
	Leave: "bg-amber-100 text-amber-700",
	Holiday: "bg-blue-100 text-blue-700",
};

// ======================== MAIN COMPONENT ========================

export function HodAttendanceClient({
	batches,
	configs: initialConfigs,
	holidays: initialHolidays,
	studentSummaries,
	initialEntries,
	autoReviewSettings,
}: HodAttendanceClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("overview");

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab}>
			<TabsList className="w-full sm:w-auto">
				<TabsTrigger value="overview" className="gap-1.5">
					<BarChart3 className="h-4 w-4" /> Overview
				</TabsTrigger>
				<TabsTrigger value="review" className="gap-1.5">
					<ClipboardList className="h-4 w-4" /> Review
				</TabsTrigger>
				<TabsTrigger value="holidays" className="gap-1.5">
					<CalendarPlus className="h-4 w-4" /> Holidays
				</TabsTrigger>
				<TabsTrigger value="config" className="gap-1.5">
					<Settings className="h-4 w-4" /> Config
				</TabsTrigger>
			</TabsList>

			<TabsContent value="overview" className="space-y-6 mt-4">
				<OverviewTab
					batches={batches}
					students={studentSummaries}
					isPending={isPending}
					startTransition={startTransition}
					router={router}
				/>
			</TabsContent>

			<TabsContent value="review" className="space-y-6 mt-4">
				<ReviewTab
					batches={batches}
					initialEntries={initialEntries}
					autoReviewSettings={autoReviewSettings}
					isPending={isPending}
					startTransition={startTransition}
					router={router}
				/>
			</TabsContent>

			<TabsContent value="holidays" className="space-y-6 mt-4">
				<HolidaysTab
					batches={batches}
					holidays={initialHolidays}
					isPending={isPending}
					startTransition={startTransition}
					router={router}
				/>
			</TabsContent>

			<TabsContent value="config" className="space-y-6 mt-4">
				<ConfigTab
					batches={batches}
					configs={initialConfigs}
					isPending={isPending}
					startTransition={startTransition}
					router={router}
				/>
			</TabsContent>
		</Tabs>
	);
}

// ======================== OVERVIEW TAB ========================

function OverviewTab({
	batches,
	students,
	isPending: _isPending,
	startTransition: _startTransition,
	router,
}: {
	batches: BatchData[];
	students: StudentSummary[];
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
	router: ReturnType<typeof useRouter>;
}) {
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"name" | "attendance">("attendance");

	const filtered = useMemo(() => {
		let result = students;
		if (batchFilter !== "ALL") {
			result = result.filter((s) => s.batchId === batchFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					(s.batch ?? "").toLowerCase().includes(q),
			);
		}
		if (sortBy === "attendance") {
			result = [...result].sort((a, b) => a.attendancePct - b.attendancePct);
		} else {
			result = [...result].sort((a, b) => a.name.localeCompare(b.name));
		}
		return result;
	}, [students, batchFilter, searchQuery, sortBy]);

	const stats = useMemo(() => {
		const total = students.length;
		const belowMin = students.filter(
			(s) => !s.meetsMinimum && s.workingDays > 0,
		).length;
		const avgPct =
			students.length > 0 ?
				Math.round(
					students.reduce((a, s) => a + s.attendancePct, 0) / students.length,
				)
			:	0;
		const totalPresent = students.reduce((a, s) => a + s.presentDays, 0);
		const totalWorking = students.reduce((a, s) => a + s.workingDays, 0);
		return { total, belowMin, avgPct, totalPresent, totalWorking };
	}, [students]);

	const openStudentDetail = useCallback(
		(studentId: string) => {
			router.push(`/dashboard/hod/attendance/student/${studentId}`);
		},
		[router],
	);

	return (
		<>
			{/* KPI Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<KpiCard
					label="Total Students"
					value={stats.total}
					icon={<Users className="h-4 w-4" />}
					color="blue"
				/>
				<KpiCard
					label="Average Attendance"
					value={`${stats.avgPct}%`}
					icon={<TrendingUp className="h-4 w-4" />}
					color={stats.avgPct >= 75 ? "green" : "amber"}
				/>
				<KpiCard
					label="Below Minimum"
					value={stats.belowMin}
					icon={<TrendingDown className="h-4 w-4" />}
					color={stats.belowMin > 0 ? "red" : "green"}
				/>
				<KpiCard
					label="Total Present Days"
					value={stats.totalPresent}
					icon={<CheckCircle2 className="h-4 w-4" />}
					color="green"
				/>
			</div>

			{/* Alert: Students below minimum */}
			{stats.belowMin > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-semibold text-red-800">
							{stats.belowMin} student{stats.belowMin > 1 ? "s" : ""} below
							minimum attendance
						</p>
						<p className="text-xs text-red-600 mt-0.5">
							These students need immediate attention to meet the attendance
							criteria.
						</p>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div className="relative flex-1 w-full sm:max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name or batch..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={batchFilter} onValueChange={setBatchFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All Batches" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All Batches</SelectItem>
						{batches
							.filter((b) => b.isActive)
							.map((b) => (
								<SelectItem key={b.id} value={b.id}>
									{b.name}
								</SelectItem>
							))}
					</SelectContent>
				</Select>
				<Select
					value={sortBy}
					onValueChange={(v) => setSortBy(v as "name" | "attendance")}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="attendance">Sort: Attendance % ↑</SelectItem>
						<SelectItem value="name">Sort: Name A-Z</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Student Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<GraduationCap className="h-5 w-5" />
						Student Attendance Overview ({filtered.length})
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0 sm:p-6">
					{filtered.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No students found</p>
						</div>
					:	<div className="border rounded-lg overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="font-bold">Student</TableHead>
										<TableHead className="text-center font-bold">
											Batch
										</TableHead>
										<TableHead className="text-center font-bold">Sem</TableHead>
										<TableHead className="text-center font-bold">
											Present
										</TableHead>
										<TableHead className="text-center font-bold">
											Working
										</TableHead>
										<TableHead className="text-center font-bold">
											Attendance %
										</TableHead>
										<TableHead className="text-center font-bold">
											Status
										</TableHead>
										<TableHead className="text-center font-bold">
											Entries
										</TableHead>
										<TableHead className="text-center font-bold w-20">
											Action
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.map((student) => (
										<TableRow
											key={student.id}
											className="cursor-pointer hover:bg-blue-50/40"
											onClick={() => openStudentDetail(student.id)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-8 w-8 rounded-full bg-hospital-primary/10 flex items-center justify-center">
														<User className="h-4 w-4 text-hospital-primary" />
													</div>
													<span className="font-medium text-sm">
														{student.name}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-center text-sm">
												{student.batch ?? "—"}
											</TableCell>
											<TableCell className="text-center text-sm">
												{student.semester ?? "—"}
											</TableCell>
											<TableCell className="text-center text-sm font-medium text-green-600">
												{student.presentDays}
											</TableCell>
											<TableCell className="text-center text-sm">
												{student.workingDays}
											</TableCell>
											<TableCell className="text-center">
												<AttendancePctBadge
													pct={student.attendancePct}
													minPct={student.minimumPct}
												/>
											</TableCell>
											<TableCell className="text-center">
												{student.workingDays === 0 ?
													<Badge variant="outline" className="text-xs">
														No Data
													</Badge>
												: student.meetsMinimum ?
													<Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
														<CheckCircle2 className="h-3 w-3 mr-1" /> On Track
													</Badge>
												:	<Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
														<AlertTriangle className="h-3 w-3 mr-1" /> Below Min
													</Badge>
												}
											</TableCell>
											<TableCell className="text-center text-sm">
												{student.signedEntries}/{student.totalEntries}
											</TableCell>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-blue-600"
													onClick={() => openStudentDetail(student.id)}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					}
				</CardContent>
			</Card>
		</>
	);
}

// ======================== REVIEW TAB ========================

function ReviewTab({
	batches,
	initialEntries,
	autoReviewSettings,
	isPending,
	startTransition,
	router,
}: {
	batches: BatchData[];
	initialEntries: HodAttendanceClientProps["initialEntries"];
	autoReviewSettings: AutoReviewSettings;
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
	router: ReturnType<typeof useRouter>;
}) {
	const [entries, setEntries] = useState(initialEntries.data);
	const [total, setTotal] = useState(initialEntries.total);
	const [page, setPage] = useState(initialEntries.page);
	const pageSize = initialEntries.pageSize;

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [detailEntry, setDetailEntry] = useState<DailyEntryForReview | null>(
		null,
	);
	const [signTarget, setSignTarget] = useState<DailyEntryForReview | null>(
		null,
	);
	const [signRemark, setSignRemark] = useState("");
	const [rejectTarget, setRejectTarget] = useState<DailyEntryForReview | null>(
		null,
	);
	const [rejectRemark, setRejectRemark] = useState("");
	const [autoReview, setAutoReview] = useState(autoReviewSettings.attendance);
	const [loading, setLoading] = useState(false);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
		newStatus: string,
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

	const counts = useMemo(() => {
		const c = { SUBMITTED: 0, SIGNED: 0, NEEDS_REVISION: 0, DRAFT: 0 };
		for (const e of entries) {
			if (e.status in c) c[e.status as keyof typeof c]++;
		}
		return { ...c, ALL: entries.length };
	}, [entries]);

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
		if (allSubmittedSelected) setSelectedIds(new Set());
		else setSelectedIds(new Set(submittedInView.map((e) => e.id)));
	}

	function studentLabel(e: DailyEntryForReview) {
		return `${e.attendanceSheet.user.firstName} ${e.attendanceSheet.user.lastName}`;
	}

	function confirmSign() {
		if (!signTarget) return;
		startTransition(async () => {
			try {
				await signDailyEntry(signTarget.id, signRemark || undefined);
				toast.success(`Signed attendance for ${studentLabel(signTarget)}`);
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

	function confirmReject() {
		if (!rejectTarget || !rejectRemark.trim()) {
			toast.error("Please provide a remark for revision");
			return;
		}
		startTransition(async () => {
			try {
				await rejectDailyEntry(rejectTarget.id, rejectRemark);
				toast.success(`Sent back for revision`);
				setRejectTarget(null);
				setDetailEntry(null);
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
					autoReview ? "Auto-review disabled" : "Auto-review enabled",
				);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to toggle",
				);
			}
		});
	}

	return (
		<>
			{/* Stats Row */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatMini label="Total" count={total} color="default" />
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
						<Select
							value={statusFilter}
							onValueChange={(v) =>
								handleFilterChange(v, batchFilter, searchQuery)
							}
						>
							<SelectTrigger className="w-40">
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
						{batches.length > 0 && (
							<Select
								value={batchFilter}
								onValueChange={(v) =>
									handleFilterChange(statusFilter, v, searchQuery)
								}
							>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Batch" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Batches</SelectItem>
									{batches
										.filter((b) => b.isActive)
										.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Auto-review toggle */}
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

					{/* Bulk Actions */}
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

			{/* Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						Daily Attendance Entries ({total})
					</CardTitle>
					<CardDescription>
						Review individual daily attendance entries from all students
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
																	`/dashboard/hod/attendance/student/${entry.attendanceSheet.user.id}`,
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
																onClick={() => {
																	setSignTarget(entry);
																	setSignRemark("");
																}}
																disabled={isPending}
															>
																<CheckCircle2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
																onClick={() => {
																	setRejectTarget(entry);
																	setRejectRemark("");
																}}
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
								Page {page} of {totalPages} ({total} total)
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

			{/* Detail Panel */}
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
									{studentLabel(detailEntry)} —{" "}
									{detailEntry.date ?
										format(new Date(detailEntry.date), "dd MMM yyyy")
									:	"—"}
								</SheetDescription>
							</SheetHeader>
							<div className="mt-6 space-y-4">
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
								{detailEntry.status === "SUBMITTED" && (
									<div className="flex gap-2 pt-2">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700"
											onClick={() => {
												setSignTarget(detailEntry);
												setSignRemark("");
											}}
											disabled={isPending}
										>
											<CheckCircle2 className="h-4 w-4 mr-2" /> Sign
										</Button>
										<Button
											variant="destructive"
											className="flex-1"
											onClick={() => {
												setRejectTarget(detailEntry);
												setRejectRemark("");
											}}
											disabled={isPending}
										>
											<XCircle className="h-4 w-4 mr-2" /> Request Revision
										</Button>
									</div>
								)}
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* Sign Dialog */}
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

			{/* Reject Dialog */}
			<Dialog
				open={rejectTarget !== null}
				onOpenChange={(open) => !open && setRejectTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Send back to{" "}
							<strong>{rejectTarget ? studentLabel(rejectTarget) : ""}</strong>{" "}
							for revision.
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
		</>
	);
}

// ======================== HOLIDAYS TAB ========================

function HolidaysTab({
	batches,
	holidays: initialHolidays,
	isPending,
	startTransition,
	router,
}: {
	batches: BatchData[];
	holidays: HolidayData[];
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
	router: ReturnType<typeof useRouter>;
}) {
	const [holidays, setHolidays] = useState(initialHolidays);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
	const [holidayName, setHolidayName] = useState("");
	const [holidayBatch, setHolidayBatch] = useState("GLOBAL");
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [yearFilter, setYearFilter] = useState(
		String(new Date().getFullYear()),
	);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const years = useMemo(() => {
		const y = new Set<number>();
		y.add(new Date().getFullYear());
		y.add(new Date().getFullYear() + 1);
		holidays.forEach((h) => y.add(new Date(h.date).getFullYear()));
		return Array.from(y).sort();
	}, [holidays]);

	const filteredHolidays = useMemo(() => {
		return holidays
			.filter((h) => String(new Date(h.date).getFullYear()) === yearFilter)
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [holidays, yearFilter]);

	const holidayDates = useMemo(() => {
		return new Set(holidays.map((h) => format(new Date(h.date), "yyyy-MM-dd")));
	}, [holidays]);

	function handleAddHoliday() {
		if (!selectedDate || !holidayName.trim()) {
			toast.error("Please select a date and enter a holiday name");
			return;
		}
		startTransition(async () => {
			try {
				const result = await addHoliday({
					date: selectedDate,
					name: holidayName.trim(),
					batchId: holidayBatch === "GLOBAL" ? null : holidayBatch,
				});
				if (result.success) {
					toast.success("Holiday added");
					setShowAddDialog(false);
					setSelectedDate(undefined);
					setHolidayName("");
					setHolidayBatch("GLOBAL");
					router.refresh();
					// Optimistically add to local state
					if (result.data) {
						setHolidays((prev) => [
							...prev,
							{
								id: result.data.id,
								date: result.data.date.toISOString(),
								name: result.data.name,
								batchId: result.data.batchId,
								batch:
									result.data.batchId ?
										batches.find((b) => b.id === result.data!.batchId) ?
											{
												name: batches.find(
													(b) => b.id === result.data!.batchId,
												)!.name,
											}
										:	null
									:	null,
							},
						]);
					}
				}
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to add holiday",
				);
			}
		});
	}

	function handleDeleteHoliday() {
		if (!deleteTarget) return;
		startTransition(async () => {
			try {
				await removeHoliday(deleteTarget);
				toast.success("Holiday removed");
				setHolidays((prev) => prev.filter((h) => h.id !== deleteTarget));
				setDeleteTarget(null);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to remove holiday",
				);
			}
		});
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<CalendarPlus className="h-5 w-5 text-hospital-primary" />
						Holiday Calendar
					</h3>
					<p className="text-sm text-muted-foreground">
						Manage holidays for all batches or specific batches
					</p>
				</div>
				<Button size="sm" onClick={() => setShowAddDialog(true)}>
					<Plus className="h-4 w-4 mr-1" /> Add Holiday
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Calendar Preview */}
				<Card className="lg:col-span-1">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Calendar View</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={(d) => {
								setSelectedDate(d);
								if (d) {
									const dateStr = format(d, "yyyy-MM-dd");
									if (holidayDates.has(dateStr)) return;
									setShowAddDialog(true);
								}
							}}
							modifiers={{ holiday: holidays.map((h) => new Date(h.date)) }}
							modifiersClassNames={{
								holiday: "bg-red-100 text-red-700 font-bold rounded-full",
							}}
							className="rounded-md border"
						/>
					</CardContent>
				</Card>

				{/* Holiday List */}
				<Card className="lg:col-span-2">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm">
								Holidays ({filteredHolidays.length})
							</CardTitle>
							<Select value={yearFilter} onValueChange={setYearFilter}>
								<SelectTrigger className="w-28 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<CardContent>
						{filteredHolidays.length === 0 ?
							<div className="text-center py-8 text-muted-foreground">
								<CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
								<p className="text-sm">No holidays for {yearFilter}</p>
							</div>
						:	<div className="space-y-2">
								{filteredHolidays.map((holiday) => (
									<div
										key={holiday.id}
										className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
												<CalendarDays className="h-5 w-5 text-red-500" />
											</div>
											<div>
												<p className="text-sm font-medium">{holiday.name}</p>
												<p className="text-xs text-muted-foreground">
													{format(new Date(holiday.date), "EEEE, dd MMMM yyyy")}
													{holiday.batch ?
														<>
															{" "}
															·{" "}
															<Badge variant="outline" className="ml-1 text-xs">
																{holiday.batch.name}
															</Badge>
														</>
													:	<>
															{" "}
															·{" "}
															<Badge
																variant="secondary"
																className="ml-1 text-xs"
															>
																All Batches
															</Badge>
														</>
													}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
											onClick={() => setDeleteTarget(holiday.id)}
											disabled={isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						}
					</CardContent>
				</Card>
			</div>

			{/* Add Holiday Dialog */}
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Holiday</DialogTitle>
						<DialogDescription>
							Add a holiday to the calendar. Global holidays apply to all
							batches.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Date</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											"w-full mt-1 justify-start",
											!selectedDate && "text-muted-foreground",
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{selectedDate ?
											format(selectedDate, "dd MMMM yyyy")
										:	"Select date"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={selectedDate}
										onSelect={setSelectedDate}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<Label>Holiday Name</Label>
							<Input
								className="mt-1"
								placeholder="e.g., Republic Day"
								value={holidayName}
								onChange={(e) => setHolidayName(e.target.value)}
							/>
						</div>
						<div>
							<Label>Applies To</Label>
							<Select value={holidayBatch} onValueChange={setHolidayBatch}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="GLOBAL">All Batches (Global)</SelectItem>
									{batches
										.filter((b) => b.isActive)
										.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAddDialog(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddHoliday}
							disabled={isPending || !selectedDate || !holidayName.trim()}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							:	<Plus className="h-4 w-4 mr-1" />}
							Add Holiday
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Holiday Confirmation */}
			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Holiday</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove this holiday?
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
							onClick={handleDeleteHoliday}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							:	null}
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ======================== CONFIG TAB ========================

const DAYS_ORDERED = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

const FULL_DAY_LABELS: Record<string, string> = {
	MONDAY: "Monday",
	TUESDAY: "Tuesday",
	WEDNESDAY: "Wednesday",
	THURSDAY: "Thursday",
	FRIDAY: "Friday",
	SATURDAY: "Saturday",
	SUNDAY: "Sunday",
};

function ConfigTab({
	batches,
	configs: initialConfigs,
	isPending,
	startTransition,
	router,
}: {
	batches: BatchData[];
	configs: ConfigData[];
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
	router: ReturnType<typeof useRouter>;
}) {
	const [selectedBatch, setSelectedBatch] = useState<string>(
		batches.find((b) => b.isActive)?.id ?? "",
	);
	const [configs] = useState(initialConfigs);

	const currentConfig = useMemo(() => {
		return configs.find((c) => c.batchId === selectedBatch);
	}, [configs, selectedBatch]);

	const selectedBatchData = useMemo(
		() => batches.find((b) => b.id === selectedBatch),
		[batches, selectedBatch],
	);

	// Form state
	const [batchStartDate, setBatchStartDate] = useState<Date | undefined>(
		undefined,
	);
	const [batchEndDate, setBatchEndDate] = useState<Date | undefined>(undefined);
	const [classStartTime, setClassStartTime] = useState("08:00");
	const [classEndTime, setClassEndTime] = useState("17:00");
	const [locationEnabled, setLocationEnabled] = useState(false);
	const [latitude, setLatitude] = useState("");
	const [longitude, setLongitude] = useState("");
	const [radius, setRadius] = useState("500");
	const [weeklyOffDays, setWeeklyOffDays] = useState<Set<string>>(
		new Set(["SUNDAY"]),
	);
	const [minPct, setMinPct] = useState("75");
	const [manualAttendanceEnabled, setManualAttendanceEnabled] = useState(true);
	const [faceRecognitionEnabled, setFaceRecognitionEnabled] = useState(false);

	// Load config when batch changes — use a key to reset form
	const configKey = currentConfig?.id ?? selectedBatch;
	useEffect(() => {
		const loadConfig = () => {
			if (currentConfig) {
				setBatchStartDate(new Date(currentConfig.batchStartDate));
				setBatchEndDate(new Date(currentConfig.batchEndDate));
				setClassStartTime(currentConfig.classStartTime);
				setClassEndTime(currentConfig.classEndTime);
				setLocationEnabled(currentConfig.locationEnabled);
				setLatitude(currentConfig.locationLatitude?.toString() ?? "");
				setLongitude(currentConfig.locationLongitude?.toString() ?? "");
				setRadius(currentConfig.locationRadiusMeters?.toString() ?? "500");
				setWeeklyOffDays(new Set(currentConfig.weeklyOffDays));
				setMinPct(currentConfig.minimumAttendancePct.toString());
				setManualAttendanceEnabled(
					currentConfig.manualAttendanceEnabled ?? true,
				);
				setFaceRecognitionEnabled(
					currentConfig.faceRecognitionEnabled ?? false,
				);
			} else if (selectedBatchData) {
				setBatchStartDate(new Date(selectedBatchData.startDate));
				setBatchEndDate(
					selectedBatchData.endDate ?
						new Date(selectedBatchData.endDate)
					:	undefined,
				);
				setClassStartTime("08:00");
				setClassEndTime("17:00");
				setLocationEnabled(false);
				setLatitude("");
				setLongitude("");
				setRadius("500");
				setWeeklyOffDays(new Set(["SUNDAY"]));
				setMinPct("75");
				setManualAttendanceEnabled(true);
				setFaceRecognitionEnabled(false);
			}
		};
		loadConfig();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [configKey]);

	function toggleWeeklyOff(day: string) {
		setWeeklyOffDays((prev) => {
			const next = new Set(prev);
			if (next.has(day)) next.delete(day);
			else next.add(day);
			return next;
		});
	}

	function handleSave() {
		if (!selectedBatch) {
			toast.error("Please select a batch");
			return;
		}
		if (!batchStartDate) {
			toast.error("Batch start date is required");
			return;
		}
		if (!batchEndDate) {
			toast.error("Batch end date is required");
			return;
		}
		if (!manualAttendanceEnabled && !faceRecognitionEnabled) {
			toast.error(
				"At least one attendance method must be enabled (manual or face recognition).",
			);
			return;
		}

		startTransition(async () => {
			try {
				const result = await upsertAttendanceConfig({
					batchId: selectedBatch,
					batchStartDate,
					batchEndDate,
					classStartTime,
					classEndTime,
					locationEnabled,
					locationLatitude: latitude ? parseFloat(latitude) : null,
					locationLongitude: longitude ? parseFloat(longitude) : null,
					locationRadiusMeters: radius ? parseInt(radius) : null,
					weeklyOffDays: Array.from(weeklyOffDays),
					minimumAttendancePct: parseFloat(minPct) || 75,
					manualAttendanceEnabled,
					faceRecognitionEnabled,
				});
				if (result.success) {
					toast.success("Configuration saved");
					router.refresh();
				}
			} catch (error) {
				toast.error(
					error instanceof Error ?
						error.message
					:	"Failed to save configuration",
				);
			}
		});
	}

	return (
		<>
			{/* Batch Selector */}
			<div className="flex items-center gap-3">
				<Label className="text-sm font-medium whitespace-nowrap">
					Configure batch:
				</Label>
				<Select value={selectedBatch} onValueChange={setSelectedBatch}>
					<SelectTrigger className="w-60">
						<SelectValue placeholder="Select batch" />
					</SelectTrigger>
					<SelectContent>
						{batches
							.filter((b) => b.isActive)
							.map((b) => (
								<SelectItem key={b.id} value={b.id}>
									{b.name} (Sem {b.currentSemester})
								</SelectItem>
							))}
					</SelectContent>
				</Select>
				{currentConfig && (
					<Badge variant="secondary" className="text-xs">
						Configured
					</Badge>
				)}
			</div>

			{!selectedBatch ?
				<Card>
					<CardContent className="py-12 text-center text-muted-foreground">
						<Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
						<p>Select a batch to configure attendance settings</p>
					</CardContent>
				</Card>
			:	<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Academic Dates */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm flex items-center gap-2">
								<CalendarDays className="h-4 w-4" /> Academic Dates
							</CardTitle>
							<CardDescription>Batch start and end dates</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="text-xs">Batch Start Date</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full mt-1 justify-start",
												!batchStartDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{batchStartDate ?
												format(batchStartDate, "dd MMM yyyy")
											:	"Select start date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={batchStartDate}
											onSelect={setBatchStartDate}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div>
								<Label className="text-xs">Batch End Date</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full mt-1 justify-start",
												!batchEndDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{batchEndDate ?
												format(batchEndDate, "dd MMM yyyy")
											:	"Select end date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={batchEndDate}
											onSelect={setBatchEndDate}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</CardContent>
					</Card>

					{/* Class Timing */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm flex items-center gap-2">
								<Clock className="h-4 w-4" /> Class Timing
							</CardTitle>
							<CardDescription>
								Time window for attendance marking
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="text-xs">Class Start Time</Label>
								<Input
									type="time"
									className="mt-1"
									value={classStartTime}
									onChange={(e) => setClassStartTime(e.target.value)}
								/>
							</div>
							<div>
								<Label className="text-xs">Class End Time</Label>
								<Input
									type="time"
									className="mt-1"
									value={classEndTime}
									onChange={(e) => setClassEndTime(e.target.value)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Location */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm flex items-center gap-2">
								<MapPin className="h-4 w-4" /> Location Restriction
							</CardTitle>
							<CardDescription>
								Require students to be within campus
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3">
								<Switch
									checked={locationEnabled}
									onCheckedChange={setLocationEnabled}
								/>
								<span className="text-sm">
									{locationEnabled ? "Enabled" : "Disabled"}
								</span>
							</div>
							{locationEnabled && (
								<>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() => {
											if (!navigator.geolocation) {
												toast.error(
													"Geolocation is not supported by your browser",
												);
												return;
											}
											toast.info("Capturing location…");
											navigator.geolocation.getCurrentPosition(
												(pos) => {
													setLatitude(String(pos.coords.latitude));
													setLongitude(String(pos.coords.longitude));
													toast.success(
														`Location captured: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
													);
												},
												(err) => {
													toast.error(
														err.code === 1 ?
															"Location permission denied. Please allow location access in your browser."
														:	`Unable to capture location: ${err.message}`,
													);
												},
												{ enableHighAccuracy: true, timeout: 10000 },
											);
										}}
									>
										<MapPin className="h-4 w-4 mr-1" />
										Capture Campus Location
									</Button>
									<div>
										<Label className="text-xs">Campus Latitude</Label>
										<Input
											type="number"
											step="any"
											className="mt-1"
											placeholder="e.g., 25.6115"
											value={latitude}
											onChange={(e) => setLatitude(e.target.value)}
										/>
									</div>
									<div>
										<Label className="text-xs">Campus Longitude</Label>
										<Input
											type="number"
											step="any"
											className="mt-1"
											placeholder="e.g., 85.1349"
											value={longitude}
											onChange={(e) => setLongitude(e.target.value)}
										/>
									</div>
									{latitude && longitude && (
										<p className="text-xs text-muted-foreground">
											📍 {Number(latitude).toFixed(6)},{" "}
											{Number(longitude).toFixed(6)}
										</p>
									)}
									<div>
										<Label className="text-xs">Allowed Radius (meters)</Label>
										<Input
											type="number"
											className="mt-1"
											placeholder="500"
											value={radius}
											onChange={(e) => setRadius(e.target.value)}
										/>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					{/* Weekly Off & Min % */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm flex items-center gap-2">
								<Percent className="h-4 w-4" /> Attendance Rules
							</CardTitle>
							<CardDescription>
								Weekly offs and minimum percentage
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="text-xs mb-2 block">Weekly Off Days</Label>
								<div className="flex flex-wrap gap-2">
									{DAYS_ORDERED.map((day) => (
										<Button
											key={day}
											variant={weeklyOffDays.has(day) ? "default" : "outline"}
											size="sm"
											className={cn(
												"text-xs",
												weeklyOffDays.has(day) && "bg-red-500 hover:bg-red-600",
											)}
											onClick={() => toggleWeeklyOff(day)}
										>
											{FULL_DAY_LABELS[day]}
										</Button>
									))}
								</div>
							</div>
							<div>
								<Label className="text-xs">
									Minimum Attendance Percentage (%)
								</Label>
								<Input
									type="number"
									min={0}
									max={100}
									step={1}
									className="mt-1"
									value={minPct}
									onChange={(e) => setMinPct(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Students below this % will be flagged
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Attendance Methods */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm flex items-center gap-2">
								<ClipboardList className="h-4 w-4" /> Attendance Methods
							</CardTitle>
							<CardDescription>
								Control which methods students can use to mark attendance. At
								least one method must be enabled.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
							{/* Manual Attendance */}
							<div className="space-y-2">
								<div className="flex items-center gap-3">
									<Switch
										checked={manualAttendanceEnabled}
										onCheckedChange={(checked) => {
											if (!checked && !faceRecognitionEnabled) {
												toast.error(
													"At least one attendance method must remain enabled.",
												);
												return;
											}
											setManualAttendanceEnabled(checked);
										}}
									/>
									<span className="text-sm font-medium">
										Manual Attendance{" "}
										<span className="font-normal text-muted-foreground">
											— {manualAttendanceEnabled ? "Enabled" : "Disabled"}
										</span>
									</span>
								</div>
								{manualAttendanceEnabled && (
									<p className="text-xs text-muted-foreground ml-11">
										Students can manually select Present / Leave and submit
										attendance via the form.
									</p>
								)}
							</div>

							{/* Face Recognition */}
							<div className="space-y-2">
								<div className="flex items-center gap-3">
									<Switch
										checked={faceRecognitionEnabled}
										onCheckedChange={(checked) => {
											if (!checked && !manualAttendanceEnabled) {
												toast.error(
													"At least one attendance method must remain enabled.",
												);
												return;
											}
											setFaceRecognitionEnabled(checked);
										}}
									/>
									<span className="text-sm font-medium">
										<ScanFace className="h-3.5 w-3.5 inline mr-1" />
										Face Recognition{" "}
										<span className="font-normal text-muted-foreground">
											— {faceRecognitionEnabled ? "Enabled" : "Disabled"}
										</span>
									</span>
								</div>
								{faceRecognitionEnabled && (
									<div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1 ml-11">
										<p className="font-medium">How it works:</p>
										<ul className="list-disc ml-4 space-y-0.5">
											<li>Students use their webcam to verify identity</li>
											<li>Face is matched against their Clerk profile photo</li>
											<li>
												On successful match, attendance is marked automatically
											</li>
											<li>Minimum confidence threshold: 60%</li>
										</ul>
										<p className="mt-2 text-blue-600 font-medium">
											Students must have a clear profile photo uploaded for this
											to work.
										</p>
									</div>
								)}
							</div>

							{/* Summary */}
							{!manualAttendanceEnabled && faceRecognitionEnabled && (
								<div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
									<AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
									Manual form is disabled — students can <strong>
										only
									</strong>{" "}
									mark attendance via face recognition.
								</div>
							)}
							{manualAttendanceEnabled && !faceRecognitionEnabled && (
								<div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-muted-foreground">
									Face recognition is off — students use the manual form only.
								</div>
							)}
							{manualAttendanceEnabled && faceRecognitionEnabled && (
								<div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-700">
									Both methods enabled — students can use either the manual form
									or face recognition.
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			}

			{selectedBatch && (
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ?
							<Loader2 className="h-4 w-4 mr-1 animate-spin" />
						:	<CheckCircle2 className="h-4 w-4 mr-1" />}
						Save Configuration
					</Button>
				</div>
			)}
		</>
	);
}

// ======================== HELPER COMPONENTS ========================

function KpiCard({
	label,
	value,
	icon,
	color,
}: {
	label: string;
	value: number | string;
	icon: React.ReactNode;
	color: "blue" | "green" | "amber" | "red";
}) {
	const colorMap = {
		blue: "bg-blue-50 text-blue-600 border-blue-200",
		green: "bg-green-50 text-green-600 border-green-200",
		amber: "bg-amber-50 text-amber-600 border-amber-200",
		red: "bg-red-50 text-red-600 border-red-200",
	};
	return (
		<div
			className={cn("border rounded-lg px-4 py-3 text-center", colorMap[color])}
		>
			<div className="flex items-center justify-center gap-1.5 mb-1">
				{icon}
			</div>
			<div className="text-2xl font-bold">{value}</div>
			<div className="text-xs opacity-80">{label}</div>
		</div>
	);
}

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

function AttendancePctBadge({
	pct,
	minPct,
	size = "sm",
}: {
	pct: number;
	minPct: number;
	size?: "sm" | "lg";
}) {
	const isGood = pct >= minPct;
	const classes =
		size === "lg" ?
			cn("text-3xl font-bold", isGood ? "text-green-600" : "text-red-600")
		:	cn(
				"inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
				isGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
			);
	return <span className={classes}>{pct}%</span>;
}
