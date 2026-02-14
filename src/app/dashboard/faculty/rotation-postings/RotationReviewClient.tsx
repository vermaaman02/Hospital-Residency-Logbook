/**
 * @module RotationReviewClient
 * @description Dedicated review page for student rotation-posting submissions.
 * Features: search, status filter, bulk select, detail panel, sign/reject.
 * Used by both Faculty and HOD pages with role-based data scoping.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING PG IN EM"
 * @see actions/rotation-postings.ts — signRotationPosting, rejectRotationPosting
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
import { Badge } from "@/components/ui/badge";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	Search,
	CheckCircle2,
	XCircle,
	Loader2,
	Eye,
	RotateCcw,
	Filter,
	CheckCheck,
	User,
	CalendarDays,
	Clock,
	FileText,
	BookOpen,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	signRotationPosting,
	rejectRotationPosting,
} from "@/actions/rotation-postings";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface RotationSubmission {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: string | null;
	endDate: string | null;
	totalDuration: string | null;
	durationDays: number | null;
	facultyId: string | null;
	status: string;
	facultyRemark: string | null;
	createdAt: string;
	user: {
		id: string;
		firstName: string;
		lastName: string;
		batchRelation: { name: string } | null;
		currentSemester: number | null;
	};
}

interface RotationReviewClientProps {
	submissions: RotationSubmission[];
	role: "faculty" | "hod";
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const ROTATION_PAGE_SIZE = 10;

// ======================== MAIN COMPONENT ========================

export function RotationReviewClient({
	submissions,
	role,
}: RotationReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Search & filter
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [batchFilter, setBatchFilter] = useState("ALL");

	// Available batches (derived from submissions)
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
	const [detailEntry, setDetailEntry] = useState<RotationSubmission | null>(
		null,
	);

	// Reject dialog
	const [rejectEntry, setRejectEntry] = useState<RotationSubmission | null>(
		null,
	);
	const [rejectRemark, setRejectRemark] = useState("");

	// Sign remark dialog (optional remark before signing)
	const [signEntry, setSignEntry] = useState<RotationSubmission | null>(null);
	const [signRemark, setSignRemark] = useState("");

	// Pagination
	const [page, setPage] = useState(1);

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
					s.rotationName.toLowerCase().includes(q) ||
					(s.user.batchRelation?.name ?? "").toLowerCase().includes(q),
			);
		}

		return result;
	}, [submissions, statusFilter, batchFilter, searchQuery]);

	// Paginate
	const totalPages = Math.max(
		1,
		Math.ceil(filtered.length / ROTATION_PAGE_SIZE),
	);
	const paginated = filtered.slice(
		(page - 1) * ROTATION_PAGE_SIZE,
		page * ROTATION_PAGE_SIZE,
	);

	// Reset page on filter change
	const handleSearchChange = useCallback((val: string) => {
		setSearchQuery(val);
		setPage(1);
	}, []);
	const handleStatusChange = useCallback((val: StatusFilter) => {
		setStatusFilter(val);
		setPage(1);
	}, []);
	const handleBatchChange = useCallback((val: string) => {
		setBatchFilter(val);
		setPage(1);
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
	const handleSign = useCallback((entry: RotationSubmission) => {
		setSignEntry(entry);
		setSignRemark("");
	}, []);

	function confirmSign() {
		if (!signEntry) return;
		startTransition(async () => {
			try {
				await signRotationPosting(signEntry.id, signRemark || undefined);
				toast.success(
					`Signed: ${signEntry.rotationName} (${signEntry.user.firstName})`,
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

	function openReject(entry: RotationSubmission) {
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
				await rejectRotationPosting(rejectEntry.id, rejectRemark);
				toast.success(`Sent back for revision: ${rejectEntry.rotationName}`);
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

	function bulkSign() {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		startTransition(async () => {
			let success = 0;
			let failed = 0;
			for (const id of ids) {
				try {
					await signRotationPosting(id);
					success++;
				} catch {
					failed++;
				}
			}
			setSelectedIds(new Set());
			toast.success(
				`Signed ${success} entries${failed > 0 ? `, ${failed} failed` : ""}`,
			);
			router.refresh();
		});
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-bold flex items-center gap-2">
					<RotateCcw className="h-6 w-6 text-hospital-primary" />
					Rotation Postings — Review
				</h1>
				<p className="text-muted-foreground mt-1">
					{role === "hod" ?
						"Review all student rotation postings"
					:	"Review rotation postings from your assigned students"}
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatMini label="Total" count={counts.ALL} color="default" />
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

			{/* Toolbar: Search + Filter + Bulk Actions */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						{/* Search */}
						<div className="relative flex-1 w-full">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by student name, rotation, or batch..."
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Status Filter */}
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Select
								value={statusFilter}
								onValueChange={(v) => handleStatusChange(v as StatusFilter)}
							>
								<SelectTrigger className="w-44">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All ({counts.ALL})</SelectItem>
									<SelectItem value="SUBMITTED">
										Pending ({counts.SUBMITTED})
									</SelectItem>
									<SelectItem value="SIGNED">
										Signed ({counts.SIGNED})
									</SelectItem>
									<SelectItem value="NEEDS_REVISION">
										Needs Revision ({counts.NEEDS_REVISION})
									</SelectItem>
									<SelectItem value="DRAFT">Draft ({counts.DRAFT})</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Batch Filter */}
						{batches.length > 0 && (
							<Select value={batchFilter} onValueChange={handleBatchChange}>
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

					{/* Bulk Actions Bar */}
					{selectedIds.size > 0 && (
						<div className="mt-3 flex items-center gap-3 p-2 bg-blue-50 rounded-md border border-blue-200">
							<span className="text-sm font-medium text-blue-700">
								{selectedIds.size} selected
							</span>
							<Button
								size="sm"
								className="bg-green-600 hover:bg-green-700 text-white"
								onClick={bulkSign}
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
						<BookOpen className="h-5 w-5" />
						Submissions ({filtered.length})
					</CardTitle>
					<CardDescription>
						Click on any row to view full details
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					{filtered.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No submissions found</p>
							<p className="text-sm mt-1">
								{searchQuery || statusFilter !== "ALL" ?
									"Try adjusting your search or filter"
								:	"No rotation postings have been submitted yet"}
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
										<TableHead className="font-bold">Rotation</TableHead>
										<TableHead className="text-center font-bold">
											Date Range
										</TableHead>
										<TableHead className="text-center font-bold">
											Duration
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
									{paginated.map((sub) => (
										<TableRow
											key={sub.id}
											className={cn(
												"cursor-pointer transition-colors",
												selectedIds.has(sub.id) && "bg-blue-50/60",
												sub.status === "SIGNED" && "bg-green-50/40",
											)}
											onClick={() => setDetailEntry(sub)}
										>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												{sub.status === "SUBMITTED" && (
													<Checkbox
														checked={selectedIds.has(sub.id)}
														onCheckedChange={() => toggleSelect(sub.id)}
													/>
												)}
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<Link
													href={`/dashboard/${role}/rotation-postings/student/${sub.user.id}`}
													className="group"
												>
													<div className="font-medium text-hospital-primary group-hover:underline">
														{sub.user.firstName} {sub.user.lastName}
													</div>
													<div className="text-xs text-muted-foreground">
														{sub.user.batchRelation?.name ?? "No batch"} · Sem{" "}
														{sub.user.currentSemester ?? "?"}
													</div>
												</Link>
											</TableCell>
											<TableCell>
												<div className="font-medium">{sub.rotationName}</div>
												<Badge variant="outline" className="text-[10px] mt-0.5">
													{sub.isElective ? "Elective" : "Core"}
												</Badge>
											</TableCell>
											<TableCell className="text-center text-sm">
												{sub.startDate ?
													format(new Date(sub.startDate), "dd/MM/yy")
												:	"—"}
												{sub.endDate ?
													` – ${format(new Date(sub.endDate), "dd/MM/yy")}`
												:	""}
											</TableCell>
											<TableCell className="text-center text-sm">
												{sub.totalDuration ?? "—"}
											</TableCell>
											<TableCell className="text-center">
												<StatusBadge
													status={sub.status as EntryStatus}
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
														className="h-7 w-7"
														title="View details"
														onClick={() => setDetailEntry(sub)}
													>
														<Eye className="h-3.5 w-3.5" />
													</Button>
													{sub.status === "SUBMITTED" && (
														<>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
																title="Sign off"
																onClick={() => handleSign(sub)}
																disabled={isPending}
															>
																<CheckCircle2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
																title="Request revision"
																onClick={() => openReject(sub)}
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
						<div className="flex items-center justify-between pt-4 px-2">
							<p className="text-sm text-muted-foreground">
								Showing {(page - 1) * ROTATION_PAGE_SIZE + 1}–
								{Math.min(page * ROTATION_PAGE_SIZE, filtered.length)} of{" "}
								{filtered.length}
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

			{/* ============ DETAIL SHEET ============ */}
			<Sheet
				open={!!detailEntry}
				onOpenChange={(open) => !open && setDetailEntry(null)}
			>
				<SheetContent className="sm:max-w-lg overflow-y-auto">
					{detailEntry && (
						<>
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<RotateCcw className="h-5 w-5 text-hospital-primary" />
									{detailEntry.rotationName}
								</SheetTitle>
								<SheetDescription>
									Submitted by {detailEntry.user.firstName}{" "}
									{detailEntry.user.lastName}
								</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								{/* Student Info */}
								<DetailSection title="Student Information" icon={User}>
									<DetailRow
										label="Name"
										value={`${detailEntry.user.firstName} ${detailEntry.user.lastName}`}
									/>
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
								</DetailSection>

								{/* Rotation Details */}
								<DetailSection title="Rotation Details" icon={BookOpen}>
									<DetailRow
										label="Rotation"
										value={detailEntry.rotationName}
									/>
									<DetailRow
										label="Type"
										value={detailEntry.isElective ? "Elective" : "Core"}
									/>
									<DetailRow
										label="Sl. No."
										value={detailEntry.slNo.toString()}
									/>
								</DetailSection>

								{/* Dates & Duration */}
								<DetailSection title="Dates & Duration" icon={CalendarDays}>
									<DetailRow
										label="Start Date"
										value={
											detailEntry.startDate ?
												format(new Date(detailEntry.startDate), "dd MMMM yyyy")
											:	"Not provided"
										}
									/>
									<DetailRow
										label="End Date"
										value={
											detailEntry.endDate ?
												format(new Date(detailEntry.endDate), "dd MMMM yyyy")
											:	"Not provided"
										}
									/>
									<DetailRow
										label="Total Duration"
										value={detailEntry.totalDuration ?? "—"}
									/>
									{detailEntry.durationDays !== null && (
										<DetailRow
											label="Duration (days)"
											value={`${detailEntry.durationDays} days`}
										/>
									)}
								</DetailSection>

								{/* Status */}
								<DetailSection title="Status" icon={Clock}>
									<div className="flex items-center gap-2">
										<StatusBadge
											status={detailEntry.status as EntryStatus}
											size="sm"
										/>
										{detailEntry.facultyRemark && (
											<span className="text-sm text-muted-foreground">
												— {detailEntry.facultyRemark}
											</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										Created:{" "}
										{format(
											new Date(detailEntry.createdAt),
											"dd MMM yyyy, HH:mm",
										)}
									</div>
								</DetailSection>

								{/* Remark if exists */}
								{detailEntry.facultyRemark && (
									<DetailSection title="Faculty Remark" icon={FileText}>
										<p className="text-sm bg-muted/50 rounded-md p-3">
											{detailEntry.facultyRemark}
										</p>
									</DetailSection>
								)}

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

			{/* ============ SIGN CONFIRMATION DIALOG ============ */}
			<Dialog open={!!signEntry} onOpenChange={(o) => !o && setSignEntry(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Off — {signEntry?.rotationName}</DialogTitle>
						<DialogDescription>
							You are approving{" "}
							{signEntry ?
								`${signEntry.user.firstName} ${signEntry.user.lastName}'s`
							:	""}{" "}
							rotation posting. Add an optional remark.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Optional remark (e.g., 'Verified with attendance records')"
						value={signRemark}
						onChange={(e) => setSignRemark(e.target.value)}
						rows={3}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setSignEntry(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							className="bg-green-600 hover:bg-green-700 text-white"
							onClick={confirmSign}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							:	<CheckCircle2 className="h-4 w-4 mr-2" />}
							Confirm Sign Off
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ============ REJECT DIALOG ============ */}
			<Dialog
				open={!!rejectEntry}
				onOpenChange={(o) => !o && setRejectEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Request Revision — {rejectEntry?.rotationName}
						</DialogTitle>
						<DialogDescription>
							Provide a remark explaining what needs to be corrected.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="e.g., 'Dates do not match department records. Please verify.'"
						value={rejectRemark}
						onChange={(e) => setRejectRemark(e.target.value)}
						rows={4}
					/>
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

// ======================== HELPER SUB-COMPONENTS ========================

function StatMini({
	label,
	count,
	color,
}: {
	label: string;
	count: number;
	color: "default" | "amber" | "green" | "red";
}) {
	const colorMap = {
		default: "bg-gray-50 border-gray-200 text-gray-700",
		amber: "bg-amber-50 border-amber-200 text-amber-700",
		green: "bg-green-50 border-green-200 text-green-700",
		red: "bg-red-50 border-red-200 text-red-700",
	};
	return (
		<div className={cn("rounded-lg border p-3", colorMap[color])}>
			<div className="text-2xl font-bold">{count}</div>
			<div className="text-xs font-medium">{label}</div>
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
