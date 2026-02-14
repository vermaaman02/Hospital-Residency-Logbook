/**
 * @module ThesisReviewClient
 * @description Faculty/HOD view of students' thesis records.
 * Features: search, batch filter, accept/reject, bulk select, pagination.
 *
 * @see PG Logbook .md — "THESIS" section
 */

"use client";

import React, { useState, useMemo, useTransition, useCallback } from "react";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Search,
	GraduationCap,
	BookOpen,
	ChevronRight,
	ChevronLeft,
	User,
	Users,
	CheckCircle2,
	XCircle,
	Loader2,
	FileText,
	CalendarDays,
	MessageSquare,
	ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	signThesis,
	rejectThesis,
	bulkSignTheses,
	signSemesterRecord,
	rejectSemesterRecord,
} from "@/actions/thesis";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ======================== TYPES ========================

interface SemesterRecord {
	id: string;
	thesisId: string;
	semester: number;
	srJrMember: string | null;
	srMember: string | null;
	facultyMember: string | null;
	status: string;
	facultyRemark: string | null;
}

export interface ThesisForReview {
	id: string;
	userId: string;
	topic: string | null;
	chiefGuide: string | null;
	status: string;
	facultyRemark: string | null;
	semesterRecords: SemesterRecord[];
	user: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		email: string | null;
		batchRelation: { name: string } | null;
		currentSemester: number | null;
	};
}

interface ThesisReviewClientProps {
	theses: ThesisForReview[];
	role: "faculty" | "hod";
}

type StatusFilter = "ALL" | "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-700",
	SUBMITTED: "bg-amber-100 text-amber-700",
	SIGNED: "bg-green-100 text-green-700",
	NEEDS_REVISION: "bg-red-100 text-red-700",
};

// ======================== COMPONENT ========================

export function ThesisReviewClient({ theses, role }: ThesisReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [page, setPage] = useState(1);

	// Detail sheet — store ID, derive object from props so it stays fresh
	const [selectedThesisId, setSelectedThesisId] = useState<string | null>(null);
	const selectedThesis = useMemo(
		() => theses.find((t) => t.id === selectedThesisId) ?? null,
		[theses, selectedThesisId],
	);

	// Bulk selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Reject dialog
	const [rejectEntry, setRejectEntry] = useState<ThesisForReview | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Sign dialog
	const [signEntry, setSignEntry] = useState<ThesisForReview | null>(null);
	const [signRemark, setSignRemark] = useState("");

	// Per-semester review
	const [semRejectId, setSemRejectId] = useState<string | null>(null);
	const [semRejectSem, setSemRejectSem] = useState<number | null>(null);
	const [semRejectRemark, setSemRejectRemark] = useState("");

	const handleSignSemester = useCallback(
		(recordId: string, semester: number) => {
			startTransition(async () => {
				try {
					await signSemesterRecord(recordId);
					toast.success(`Semester ${semester} approved`);
					router.refresh();
				} catch {
					toast.error("Failed to approve semester record");
				}
			});
		},
		[router],
	);

	const openSemReject = useCallback((recordId: string, semester: number) => {
		setSemRejectId(recordId);
		setSemRejectSem(semester);
		setSemRejectRemark("");
	}, []);

	const confirmSemReject = useCallback(() => {
		if (!semRejectId || !semRejectRemark.trim()) return;
		startTransition(async () => {
			try {
				await rejectSemesterRecord(semRejectId, semRejectRemark);
				toast.success(`Semester ${semRejectSem} sent back for revision`);
				setSemRejectId(null);
				router.refresh();
			} catch {
				toast.error("Failed to reject semester record");
			}
		});
	}, [semRejectId, semRejectRemark, semRejectSem, router]);

	const batches = useMemo(() => {
		const set = new Set<string>();
		theses.forEach((t) => {
			if (t.user.batchRelation?.name) set.add(t.user.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [theses]);

	const filtered = useMemo(() => {
		return theses.filter((t) => {
			const name =
				`${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.toLowerCase();
			const topicMatch = (t.topic ?? "").toLowerCase();
			const q = search.toLowerCase();
			const matchesSearch = !q || name.includes(q) || topicMatch.includes(q);
			const matchesBatch =
				batchFilter === "ALL" || t.user.batchRelation?.name === batchFilter;
			const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
			return matchesSearch && matchesBatch && matchesStatus;
		});
	}, [theses, search, batchFilter, statusFilter]);

	// Pagination
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// Reset page when filters change
	const handleSearch = useCallback((val: string) => {
		setSearch(val);
		setPage(1);
	}, []);
	const handleBatchFilter = useCallback((val: string) => {
		setBatchFilter(val);
		setPage(1);
	}, []);
	const handleStatusFilter = useCallback((val: StatusFilter) => {
		setStatusFilter(val);
		setPage(1);
	}, []);

	const totalWithTopic = theses.filter((t) => t.topic).length;
	const totalWithGuide = theses.filter((t) => t.chiefGuide).length;

	// Bulk selection
	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const toggleSelectAll = useCallback(() => {
		if (selectedIds.size === paginated.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(paginated.map((t) => t.id)));
		}
	}, [paginated, selectedIds.size]);

	// Actions
	const handleSign = useCallback((thesis: ThesisForReview) => {
		setSignEntry(thesis);
		setSignRemark("");
	}, []);

	const confirmSign = useCallback(() => {
		if (!signEntry) return;
		startTransition(async () => {
			try {
				await signThesis(signEntry.id, signRemark || undefined);
				toast.success("Thesis approved");
				setSignEntry(null);
				setSignRemark("");
				router.refresh();
			} catch {
				toast.error("Failed to approve thesis");
			}
		});
	}, [signEntry, signRemark, router]);

	const handleReject = useCallback((thesis: ThesisForReview) => {
		setRejectEntry(thesis);
		setRejectRemark("");
	}, []);

	const confirmReject = useCallback(() => {
		if (!rejectEntry || !rejectRemark.trim()) return;
		startTransition(async () => {
			try {
				await rejectThesis(rejectEntry.id, rejectRemark);
				toast.success("Thesis sent back for revision");
				setRejectEntry(null);
				setRejectRemark("");
				router.refresh();
			} catch {
				toast.error("Failed to reject thesis");
			}
		});
	}, [rejectEntry, rejectRemark, router]);

	const handleBulkSign = useCallback(() => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		startTransition(async () => {
			try {
				await bulkSignTheses(ids);
				toast.success(`${ids.length} thesis records approved`);
				setSelectedIds(new Set());
				router.refresh();
			} catch {
				toast.error("Bulk approve failed");
			}
		});
	}, [selectedIds, router]);

	return (
		<div className="space-y-6">
			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-50 rounded-lg">
								<Users className="h-5 w-5 text-hospital-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{theses.length}</p>
								<p className="text-xs text-muted-foreground">Total Students</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-50 rounded-lg">
								<GraduationCap className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">{totalWithTopic}</p>
								<p className="text-xs text-muted-foreground">Topics Set</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-amber-50 rounded-lg">
								<User className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">{totalWithGuide}</p>
								<p className="text-xs text-muted-foreground">Guides Assigned</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Bulk actions bar */}
			{selectedIds.size > 0 && (
				<div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
					<span className="text-sm font-medium">
						{selectedIds.size} selected
					</span>
					<Button
						size="sm"
						onClick={handleBulkSign}
						disabled={isPending}
						className="bg-green-600 hover:bg-green-700"
					>
						{isPending ?
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						:	<CheckCircle2 className="h-4 w-4 mr-1" />}
						Approve Selected
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => setSelectedIds(new Set())}
					>
						Clear
					</Button>
				</div>
			)}

			{/* Search, Filter & Table */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-hospital-primary" />
						<CardTitle>Student Thesis Records</CardTitle>
					</div>
					<CardDescription>
						Review, approve or send back student thesis entries
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="Search by student name or topic..."
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
										<SelectItem key={b} value={b}>
											{b}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						<Select
							value={statusFilter}
							onValueChange={(v) => handleStatusFilter(v as StatusFilter)}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Statuses</SelectItem>
								<SelectItem value="DRAFT">Draft</SelectItem>
								<SelectItem value="SUBMITTED">Submitted</SelectItem>
								<SelectItem value="SIGNED">Signed</SelectItem>
								<SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Table */}
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-10">
										<Checkbox
											checked={
												paginated.length > 0 &&
												selectedIds.size === paginated.length
											}
											onCheckedChange={toggleSelectAll}
										/>
									</TableHead>
									<TableHead className="font-bold">Student</TableHead>
									<TableHead className="font-bold">Thesis Topic</TableHead>
									<TableHead className="font-bold hidden md:table-cell">
										Chief Guide
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Status
									</TableHead>
									<TableHead className="w-24 text-center font-bold hidden sm:table-cell">
										Batch
									</TableHead>
									<TableHead className="w-32 text-center font-bold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginated.length === 0 ?
									<TableRow>
										<TableCell
											colSpan={7}
											className="text-center py-8 text-muted-foreground"
										>
											{(
												search ||
												batchFilter !== "ALL" ||
												statusFilter !== "ALL"
											) ?
												"No matching students found"
											:	"No thesis records available"}
										</TableCell>
									</TableRow>
								:	paginated.map((thesis) => (
										<TableRow
											key={thesis.id}
											className="hover:bg-muted/40 transition-colors"
										>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<Checkbox
													checked={selectedIds.has(thesis.id)}
													onCheckedChange={() => toggleSelect(thesis.id)}
												/>
											</TableCell>
											<TableCell
												className="font-medium"
												onClick={(e) => e.stopPropagation()}
											>
												<Link
													href={`/dashboard/${role}/thesis-review/student/${thesis.user.id}`}
													className="group"
												>
													<div className="text-hospital-primary group-hover:underline">
														{thesis.user.firstName} {thesis.user.lastName}
													</div>
													<span className="block text-xs text-muted-foreground">
														Sem {thesis.user.currentSemester ?? "—"}
													</span>
												</Link>
											</TableCell>
											<TableCell
												className="max-w-48 truncate text-sm cursor-pointer"
												onClick={() => setSelectedThesisId(thesis.id)}
											>
												{thesis.topic || (
													<span className="text-muted-foreground italic text-xs">
														Not set
													</span>
												)}
											</TableCell>
											<TableCell className="text-sm hidden md:table-cell">
												{thesis.chiefGuide || (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-center">
												<Badge
													className={cn(
														"text-xs",
														STATUS_COLORS[thesis.status] ?? "bg-gray-100",
													)}
												>
													{thesis.status === "NEEDS_REVISION" ?
														"Revision"
													:	thesis.status}
												</Badge>
											</TableCell>
											<TableCell className="text-center text-xs text-muted-foreground hidden sm:table-cell">
												{thesis.user.batchRelation?.name ?? "—"}
											</TableCell>
											<TableCell className="text-center">
												<div className="flex items-center justify-center gap-1">
													{thesis.status !== "SIGNED" && (
														<>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
																onClick={() => handleSign(thesis)}
																disabled={isPending}
																title="Approve"
															>
																<CheckCircle2 className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
																onClick={() => handleReject(thesis)}
																disabled={isPending}
																title="Send back"
															>
																<XCircle className="h-4 w-4" />
															</Button>
														</>
													)}
													<Button
														variant="ghost"
														size="sm"
														className="h-7 w-7 p-0"
														onClick={() => setSelectedThesisId(thesis.id)}
														title="View details"
													>
														<ChevronRight className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<p className="text-sm text-muted-foreground">
								Showing {(page - 1) * PAGE_SIZE + 1}–
								{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
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

			{/* Detail Sheet */}
			<Sheet
				open={!!selectedThesis}
				onOpenChange={(open) => !open && setSelectedThesisId(null)}
			>
				<SheetContent className="sm:max-w-xl overflow-y-auto p-0">
					{selectedThesis && (
						<>
							{/* Branded Header */}
							<div className="bg-linear-to-r from-hospital-primary to-hospital-primary-dark p-6 text-white">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2.5 bg-white/20 rounded-lg">
											<BookOpen className="h-5 w-5" />
										</div>
										<div>
											<SheetHeader className="p-0 space-y-0.5">
												<SheetTitle className="text-white text-lg">
													{selectedThesis.user.firstName}{" "}
													{selectedThesis.user.lastName}
												</SheetTitle>
												<SheetDescription className="text-white/80 text-sm">
													{selectedThesis.user.batchRelation?.name ?? "N/A"} ·
													Semester {selectedThesis.user.currentSemester ?? "—"}
												</SheetDescription>
											</SheetHeader>
										</div>
									</div>
									<Badge
										className={cn(
											"text-xs font-semibold",
											STATUS_COLORS[selectedThesis.status] ?? "bg-gray-100",
										)}
									>
										{selectedThesis.status === "NEEDS_REVISION" ?
											"Revision"
										:	selectedThesis.status}
									</Badge>
								</div>
							</div>

							<div className="p-6 space-y-6">
								{/* Thesis Info Section */}
								<DetailSection icon={FileText} title="Thesis Information">
									<DetailRow label="Topic">
										{selectedThesis.topic || (
											<span className="text-muted-foreground italic">
												Not set
											</span>
										)}
									</DetailRow>
									<DetailRow label="Chief Guide">
										{selectedThesis.chiefGuide || (
											<span className="text-muted-foreground italic">
												Not assigned
											</span>
										)}
									</DetailRow>
								</DetailSection>

								{/* Faculty Remark */}
								{selectedThesis.facultyRemark && (
									<DetailSection icon={MessageSquare} title="Faculty Remark">
										<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
											{selectedThesis.facultyRemark}
										</div>
									</DetailSection>
								)}

								{/* Semester Committee — Per-semester review */}
								<DetailSection
									icon={CalendarDays}
									title="Semester-wise Committee"
								>
									<div className="border rounded-lg overflow-hidden">
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/50">
													<TableHead className="text-center font-bold w-12">
														Sem
													</TableHead>
													<TableHead className="font-bold text-xs">
														SR/JR Member
													</TableHead>
													<TableHead className="font-bold text-xs">
														SR Member
													</TableHead>
													<TableHead className="font-bold text-xs">
														Faculty Member
													</TableHead>
													<TableHead className="text-center font-bold text-xs w-20">
														Status
													</TableHead>
													<TableHead className="text-center font-bold text-xs w-20">
														Action
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{[1, 2, 3, 4, 5, 6].map((sem) => {
													const record = selectedThesis.semesterRecords.find(
														(r) => r.semester === sem,
													);
													const hasFill =
														record?.srJrMember ||
														record?.srMember ||
														record?.facultyMember;
													const semStatus = record?.status ?? "DRAFT";
													return (
														<React.Fragment key={sem}>
															<TableRow
																className={cn(
																	!hasFill && "text-muted-foreground/50",
																	semStatus === "SIGNED" && "bg-green-50/40",
																	semStatus === "SUBMITTED" && "bg-amber-50/40",
																	semStatus === "NEEDS_REVISION" &&
																		"bg-red-50/20",
																	semStatus === "DRAFT" &&
																		hasFill &&
																		"bg-gray-50/40",
																)}
															>
																<TableCell className="text-center font-bold text-hospital-primary">
																	{sem}
																</TableCell>
																<TableCell className="text-sm">
																	{record?.srJrMember || (
																		<span className="text-muted-foreground/40">
																			—
																		</span>
																	)}
																</TableCell>
																<TableCell className="text-sm">
																	{record?.srMember || (
																		<span className="text-muted-foreground/40">
																			—
																		</span>
																	)}
																</TableCell>
																<TableCell className="text-sm">
																	{record?.facultyMember || (
																		<span className="text-muted-foreground/40">
																			—
																		</span>
																	)}
																</TableCell>
																<TableCell className="text-center">
																	{hasFill ?
																		<Badge
																			variant="outline"
																			className={cn(
																				"text-[10px] px-1.5 py-0",
																				STATUS_COLORS[semStatus] ??
																					"bg-gray-100",
																			)}
																		>
																			{semStatus === "NEEDS_REVISION" ?
																				"Revision"
																			:	semStatus}
																		</Badge>
																	:	<span className="text-muted-foreground/40 text-xs">
																			—
																		</span>
																	}
																</TableCell>
																<TableCell className="text-center">
																	{record &&
																		hasFill &&
																		semStatus !== "SIGNED" && (
																			<div className="flex items-center justify-center gap-0.5">
																				<Button
																					variant="ghost"
																					size="sm"
																					className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
																					onClick={() =>
																						handleSignSemester(record.id, sem)
																					}
																					disabled={isPending}
																					title="Approve semester"
																				>
																					<CheckCircle2 className="h-3.5 w-3.5" />
																				</Button>
																				<Button
																					variant="ghost"
																					size="sm"
																					className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
																					onClick={() =>
																						openSemReject(record.id, sem)
																					}
																					disabled={isPending}
																					title="Send back"
																				>
																					<XCircle className="h-3.5 w-3.5" />
																				</Button>
																			</div>
																		)}
																	{semStatus === "SIGNED" && (
																		<span className="text-green-600 text-[10px]">
																			✓
																		</span>
																	)}
																</TableCell>
															</TableRow>
															{/* Per-semester remark */}
															{semStatus === "NEEDS_REVISION" &&
																record?.facultyRemark && (
																	<TableRow className="bg-red-50/40">
																		<TableCell />
																		<TableCell
																			colSpan={5}
																			className="py-1 text-xs text-red-700"
																		>
																			<span className="font-medium">
																				Remark:
																			</span>{" "}
																			{record.facultyRemark}
																		</TableCell>
																	</TableRow>
																)}
														</React.Fragment>
													);
												})}
											</TableBody>
										</Table>
									</div>
								</DetailSection>

								{/* View Full Profile link */}
								<Link
									href={`/dashboard/${role}/thesis-review/student/${selectedThesis.user.id}`}
									className="flex items-center justify-center gap-2 text-sm text-hospital-primary hover:underline py-2"
								>
									<ExternalLink className="h-4 w-4" />
									View student thesis page
								</Link>

								{/* Action buttons in sheet */}
								{selectedThesis.status !== "SIGNED" && (
									<div className="flex gap-3 pt-4 border-t">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700"
											onClick={() => {
												handleSign(selectedThesis);
											}}
											disabled={isPending}
										>
											<CheckCircle2 className="h-4 w-4 mr-2" /> Approve
										</Button>
										<Button
											variant="destructive"
											className="flex-1"
											onClick={() => {
												handleReject(selectedThesis);
											}}
											disabled={isPending}
										>
											<XCircle className="h-4 w-4 mr-2" /> Send Back
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
				open={!!signEntry}
				onOpenChange={(open) => !open && setSignEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve Thesis</DialogTitle>
						<DialogDescription>
							Approve this thesis for {signEntry?.user.firstName}{" "}
							{signEntry?.user.lastName}?
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Optional remark..."
						value={signRemark}
						onChange={(e) => setSignRemark(e.target.value)}
						rows={3}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSignEntry(null)}>
							Cancel
						</Button>
						<Button
							onClick={confirmSign}
							disabled={isPending}
							className="bg-green-600 hover:bg-green-700"
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<CheckCircle2 className="h-4 w-4 mr-1" />}
							Approve
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog
				open={!!rejectEntry}
				onOpenChange={(open) => !open && setRejectEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Back for Revision</DialogTitle>
						<DialogDescription>
							Provide a remark for {rejectEntry?.user.firstName}{" "}
							{rejectEntry?.user.lastName}
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Reason for rejection (required)..."
						value={rejectRemark}
						onChange={(e) => setRejectRemark(e.target.value)}
						rows={3}
					/>
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
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<XCircle className="h-4 w-4 mr-1" />}
							Send Back
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Semester Reject Dialog */}
			<Dialog
				open={!!semRejectId}
				onOpenChange={(open) => {
					if (!open) {
						setSemRejectId(null);
						setSemRejectSem(null);
						setSemRejectRemark("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Back Semester {semRejectSem}</DialogTitle>
						<DialogDescription>
							Provide a remark for semester {semRejectSem} committee record.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Reason for rejection (required)..."
						value={semRejectRemark}
						onChange={(e) => setSemRejectRemark(e.target.value)}
						rows={3}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setSemRejectId(null);
								setSemRejectSem(null);
								setSemRejectRemark("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmSemReject}
							disabled={isPending || !semRejectRemark.trim()}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<XCircle className="h-4 w-4 mr-1" />}
							Send Back
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== DETAIL HELPERS ========================

function DetailSection({
	icon: Icon,
	title,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<Icon className="h-4 w-4 text-hospital-primary" />
				{title}
			</div>
			{children}
		</div>
	);
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-1.5 border-b border-dashed last:border-0">
			<span className="text-xs font-medium text-muted-foreground min-w-28 shrink-0 uppercase tracking-wide">
				{label}
			</span>
			<span className="text-sm font-medium text-foreground">{children}</span>
		</div>
	);
}
