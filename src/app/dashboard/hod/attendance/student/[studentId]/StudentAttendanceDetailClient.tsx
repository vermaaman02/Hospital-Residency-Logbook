/**
 * @module StudentAttendanceDetailClient
 * @description Client component for the full student attendance detail page.
 * Shows analytics, monthly trends, full entry history with filtering,
 * and ability to mark attendance for the student.
 *
 * @see actions/attendance.ts — markAttendanceForStudent()
 */

"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
	ArrowLeft,
	User,
	Calendar,
	TrendingUp,
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	Clock,
	XCircle,
	Download,
	Filter,
	Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { markAttendanceForStudent } from "@/actions/attendance";

// ======================== TYPES ========================

interface EntryData {
	id: string;
	date: string;
	day: string;
	presentAbsent: string | null;
	hodName: string | null;
	status: string;
	facultyRemark: string | null;
	markedAt: string | null;
	signedAt: string | null;
	attendanceSheet: {
		postedDepartment: string | null;
		batch: string | null;
	};
}

interface MonthlyTrendItem {
	month: string;
	present: number;
	absent: number;
	leave: number;
	holiday: number;
	total: number;
	pct: number;
}

interface StudentData {
	id: string;
	firstName: string;
	lastName: string;
	batch: { name: string } | null;
	currentSemester: number | null;
	profileImage: string | null;
}

interface AnalyticsData {
	student: StudentData;
	totalDays: number;
	presentDays: number;
	absentDays: number;
	leaveDays: number;
	holidayDays: number;
	workingDays: number;
	attendancePct: number;
	minimumPct: number;
	meetsMinimum: boolean;
	monthlyTrend: MonthlyTrendItem[];
	totalEntries: number;
	signedEntries: number;
	entries: EntryData[];
}

interface HolidayData {
	id: string;
	name: string;
	date: string;
}

interface StudentAttendanceDetailClientProps {
	analytics: AnalyticsData;
	holidays: HolidayData[];
}

// ======================== STATUS HELPERS ========================

const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; icon: React.ReactNode }
> = {
	Present: {
		label: "Present",
		color: "bg-green-100 text-green-800 border-green-200",
		icon: <CheckCircle2 className="h-3 w-3" />,
	},
	Absent: {
		label: "Absent",
		color: "bg-red-100 text-red-800 border-red-200",
		icon: <XCircle className="h-3 w-3" />,
	},
	Leave: {
		label: "Leave",
		color: "bg-amber-100 text-amber-800 border-amber-200",
		icon: <Clock className="h-3 w-3" />,
	},
	Holiday: {
		label: "Holiday",
		color: "bg-purple-100 text-purple-800 border-purple-200",
		icon: <Calendar className="h-3 w-3" />,
	},
};

const ENTRY_STATUS_BADGE: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-700",
	SUBMITTED: "bg-amber-100 text-amber-700",
	SIGNED: "bg-green-100 text-green-700",
	REJECTED: "bg-red-100 text-red-700",
	NEEDS_REVISION: "bg-orange-100 text-orange-700",
};

// ======================== MAIN COMPONENT ========================

export function StudentAttendanceDetailClient({
	analytics,
	holidays,
}: StudentAttendanceDetailClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Filters
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [monthFilter, setMonthFilter] = useState("ALL");
	const [entryStatusFilter, setEntryStatusFilter] = useState("ALL");

	// Mark attendance dialog
	const [showMarkDialog, setShowMarkDialog] = useState(false);
	const [markDate, setMarkDate] = useState(format(new Date(), "yyyy-MM-dd"));
	const [markStatus, setMarkStatus] = useState("Present");
	const [markRemark, setMarkRemark] = useState("");

	const { student, entries } = analytics;

	// Available months for filter
	const availableMonths = useMemo(() => {
		const months = new Set<string>();
		for (const e of entries) {
			if (e.date) {
				const d = new Date(e.date);
				months.add(
					`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
				);
			}
		}
		return Array.from(months).sort();
	}, [entries]);

	// Filtered entries
	const filteredEntries = useMemo(() => {
		return entries.filter((e) => {
			if (statusFilter !== "ALL" && e.presentAbsent !== statusFilter)
				return false;
			if (entryStatusFilter !== "ALL" && e.status !== entryStatusFilter)
				return false;
			if (monthFilter !== "ALL" && e.date) {
				const d = new Date(e.date);
				const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
				if (mk !== monthFilter) return false;
			}
			return true;
		});
	}, [entries, statusFilter, monthFilter, entryStatusFilter]);

	// Handle mark attendance for student
	const handleMarkAttendance = () => {
		startTransition(async () => {
			try {
				const result = await markAttendanceForStudent({
					studentId: student.id,
					date: new Date(markDate),
					presentAbsent: markStatus as
						| "Present"
						| "Absent"
						| "Leave"
						| "Holiday",
					remark: markRemark || undefined,
				});
				if (result.success) {
					toast.success("Attendance marked successfully");
					setShowMarkDialog(false);
					setMarkRemark("");
					router.refresh();
				}
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to mark attendance",
				);
			}
		});
	};

	// CSV Export
	const handleExport = () => {
		const rows = [
			["Date", "Day", "Status", "Entry Status", "Department", "Remark"],
			...filteredEntries.map((e) => [
				e.date ? format(new Date(e.date), "dd/MM/yyyy") : "",
				e.day || "",
				e.presentAbsent || "",
				e.status,
				e.attendanceSheet?.postedDepartment || "",
				e.facultyRemark || "",
			]),
		];
		const csv = rows.map((r) => r.join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${student.firstName}_${student.lastName}_attendance.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.back()}
					className="shrink-0"
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex-1">
					<h1 className="text-xl font-bold flex items-center gap-2">
						<User className="h-5 w-5 text-hospital-primary" />
						{student.firstName} {student.lastName}
					</h1>
					<p className="text-sm text-muted-foreground">
						{student.batch?.name ?? "No batch"} · Semester{" "}
						{student.currentSemester ?? "—"}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="gap-1"
					>
						<Download className="h-4 w-4" />
						Export
					</Button>
					<Button
						size="sm"
						onClick={() => setShowMarkDialog(true)}
						className="gap-1"
					>
						<Plus className="h-4 w-4" />
						Mark Attendance
					</Button>
				</div>
			</div>

			{/* Analytics Summary */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
				<StatCard
					label="Attendance"
					value={`${analytics.attendancePct}%`}
					color={analytics.meetsMinimum ? "text-green-600" : "text-red-600"}
				/>
				<StatCard
					label="Present"
					value={analytics.presentDays}
					color="text-green-600"
				/>
				<StatCard
					label="Absent"
					value={analytics.absentDays}
					color="text-red-600"
				/>
				<StatCard
					label="Leave"
					value={analytics.leaveDays}
					color="text-amber-600"
				/>
				<StatCard
					label="Holiday"
					value={analytics.holidayDays}
					color="text-purple-600"
				/>
				<StatCard
					label="Working"
					value={analytics.workingDays}
					color="text-blue-600"
				/>
				<StatCard
					label="Total"
					value={analytics.totalDays}
					color="text-gray-700"
				/>
			</div>

			{/* Minimum requirement notice */}
			<Card
				className={cn(
					"border-l-4",
					analytics.meetsMinimum ? "border-l-green-500" : "border-l-red-500",
				)}
			>
				<CardContent className="p-4 flex items-center gap-3">
					{analytics.meetsMinimum ?
						<>
							<ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
							<span className="text-sm text-green-700 font-medium">
								Meets minimum attendance requirement ({analytics.minimumPct}%)
							</span>
						</>
					:	<>
							<AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
							<span className="text-sm text-red-700 font-medium">
								Below minimum attendance ({analytics.minimumPct}%) — Current:{" "}
								{analytics.attendancePct}%
							</span>
						</>
					}
				</CardContent>
			</Card>

			{/* Monthly Trend */}
			{analytics.monthlyTrend.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<TrendingUp className="h-4 w-4" />
							Monthly Attendance Trend
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
							{analytics.monthlyTrend.map((m) => (
								<div
									key={m.month}
									className="text-center p-3 bg-muted/50 rounded-lg"
								>
									<div className="text-xs text-muted-foreground font-medium">
										{m.month}
									</div>
									<div
										className={cn(
											"text-xl font-bold",
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

			{/* Entry History */}
			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div>
							<CardTitle className="text-base flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Attendance Entries ({filteredEntries.length})
							</CardTitle>
							<CardDescription>
								{analytics.signedEntries} of {analytics.totalEntries} entries
								signed
							</CardDescription>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-30 h-8 text-xs">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Status</SelectItem>
									<SelectItem value="Present">Present</SelectItem>
									<SelectItem value="Absent">Absent</SelectItem>
									<SelectItem value="Leave">Leave</SelectItem>
									<SelectItem value="Holiday">Holiday</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={entryStatusFilter}
								onValueChange={setEntryStatusFilter}
							>
								<SelectTrigger className="w-30 h-8 text-xs">
									<SelectValue placeholder="Review" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Review</SelectItem>
									<SelectItem value="DRAFT">Draft</SelectItem>
									<SelectItem value="SUBMITTED">Submitted</SelectItem>
									<SelectItem value="SIGNED">Signed</SelectItem>
									<SelectItem value="REJECTED">Rejected</SelectItem>
								</SelectContent>
							</Select>
							<Select value={monthFilter} onValueChange={setMonthFilter}>
								<SelectTrigger className="w-30 h-8 text-xs">
									<SelectValue placeholder="Month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Months</SelectItem>
									{availableMonths.map((m) => (
										<SelectItem key={m} value={m}>
											{m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{filteredEntries.length === 0 ?
						<div className="text-center py-8 text-muted-foreground text-sm">
							No entries match the current filters.
						</div>
					:	<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="font-bold">Date</TableHead>
										<TableHead className="font-bold">Day</TableHead>
										<TableHead className="font-bold text-center">
											Status
										</TableHead>
										<TableHead className="font-bold text-center">
											Review
										</TableHead>
										<TableHead className="font-bold">Department</TableHead>
										<TableHead className="font-bold">Remark</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredEntries.map((entry) => {
										const cfg =
											entry.presentAbsent ?
												STATUS_CONFIG[entry.presentAbsent]
											:	null;
										return (
											<TableRow key={entry.id}>
												<TableCell className="text-sm whitespace-nowrap">
													{entry.date ?
														format(new Date(entry.date), "dd MMM yyyy")
													:	"—"}
												</TableCell>
												<TableCell className="text-sm">
													{entry.day ?? "—"}
												</TableCell>
												<TableCell className="text-center">
													{cfg ?
														<span
															className={cn(
																"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
																cfg.color,
															)}
														>
															{cfg.icon}
															{cfg.label}
														</span>
													:	<span className="text-xs text-muted-foreground">
															—
														</span>
													}
												</TableCell>
												<TableCell className="text-center">
													<span
														className={cn(
															"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
															ENTRY_STATUS_BADGE[entry.status] ??
																"bg-gray-100 text-gray-700",
														)}
													>
														{entry.status}
													</span>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{entry.attendanceSheet?.postedDepartment || "—"}
												</TableCell>
												<TableCell className="text-sm text-muted-foreground max-w-50 truncate">
													{entry.facultyRemark || "—"}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					}
				</CardContent>
			</Card>

			{/* Upcoming Holidays */}
			{holidays.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Declared Holidays</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{holidays.map((h) => (
								<Badge key={h.id} variant="outline" className="text-xs">
									{h.name} — {format(new Date(h.date), "dd MMM yyyy")}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Mark Attendance Dialog */}
			<Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Attendance for Student</DialogTitle>
						<DialogDescription>
							Mark attendance for {student.firstName} {student.lastName} on any
							date within the batch period.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Date</Label>
							<Input
								type="date"
								value={markDate}
								onChange={(e) => setMarkDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Status</Label>
							<Select value={markStatus} onValueChange={setMarkStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Present">Present</SelectItem>
									<SelectItem value="Absent">Absent</SelectItem>
									<SelectItem value="Leave">Leave</SelectItem>
									<SelectItem value="Holiday">Holiday</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Remark (optional)</Label>
							<Input
								placeholder="Optional remark..."
								value={markRemark}
								onChange={(e) => setMarkRemark(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowMarkDialog(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button onClick={handleMarkAttendance} disabled={isPending}>
							{isPending ? "Marking..." : "Mark Attendance"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== STAT CARD ========================

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: string | number;
	color: string;
}) {
	return (
		<Card className="text-center p-3">
			<div className={cn("text-xl font-bold", color)}>{value}</div>
			<div className="text-xs text-muted-foreground mt-0.5">{label}</div>
		</Card>
	);
}
