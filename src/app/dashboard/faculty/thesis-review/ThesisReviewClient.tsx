/**
 * @module ThesisReviewClient
 * @description Faculty/HOD view of students' thesis records.
 * Features: search, batch filter, accept/reject, bulk select, pagination.
 *
 * @see PG Logbook .md — "THESIS" section
 */

"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signThesis, rejectThesis, bulkSignTheses } from "@/actions/thesis";
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

export function ThesisReviewClient({
	theses,
	role: _role,
}: ThesisReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [page, setPage] = useState(1);

	// Detail sheet
	const [selectedThesis, setSelectedThesis] = useState<ThesisForReview | null>(
		null,
	);

	// Bulk selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Reject dialog
	const [rejectEntry, setRejectEntry] = useState<ThesisForReview | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Sign dialog
	const [signEntry, setSignEntry] = useState<ThesisForReview | null>(null);
	const [signRemark, setSignRemark] = useState("");

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
						{batches.length > 1 && (
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
												className="font-medium cursor-pointer"
												onClick={() => setSelectedThesis(thesis)}
											>
												<div>
													{thesis.user.firstName} {thesis.user.lastName}
													<span className="block text-xs text-muted-foreground">
														Sem {thesis.user.currentSemester ?? "—"}
													</span>
												</div>
											</TableCell>
											<TableCell
												className="max-w-48 truncate text-sm cursor-pointer"
												onClick={() => setSelectedThesis(thesis)}
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
														onClick={() => setSelectedThesis(thesis)}
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
				onOpenChange={(open) => !open && setSelectedThesis(null)}
			>
				<SheetContent className="sm:max-w-xl overflow-y-auto">
					{selectedThesis && (
						<>
							<SheetHeader>
								<SheetTitle>
									{selectedThesis.user.firstName} {selectedThesis.user.lastName}{" "}
									— Thesis
								</SheetTitle>
								<SheetDescription>
									Batch: {selectedThesis.user.batchRelation?.name ?? "N/A"} |
									Semester: {selectedThesis.user.currentSemester ?? "—"}
								</SheetDescription>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								{/* Status + Remark */}
								<div className="flex items-center gap-3">
									<Badge
										className={cn(
											"text-xs",
											STATUS_COLORS[selectedThesis.status] ?? "bg-gray-100",
										)}
									>
										{selectedThesis.status}
									</Badge>
									{selectedThesis.facultyRemark && (
										<span className="text-xs text-muted-foreground">
											Remark: {selectedThesis.facultyRemark}
										</span>
									)}
								</div>

								{/* Topic & Guide */}
								<div className="space-y-3">
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											THESIS TOPIC
										</label>
										<p className="text-sm font-medium mt-0.5">
											{selectedThesis.topic || (
												<span className="text-muted-foreground italic">
													Not set
												</span>
											)}
										</p>
									</div>
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											CHIEF GUIDE
										</label>
										<p className="text-sm font-medium mt-0.5">
											{selectedThesis.chiefGuide || (
												<span className="text-muted-foreground italic">
													Not assigned
												</span>
											)}
										</p>
									</div>
								</div>

								{/* Semester Records */}
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										SEMESTER-WISE COMMITTEE
									</label>
									<div className="mt-2 border rounded-lg">
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/50">
													<TableHead className="text-center font-bold w-16">
														Sem
													</TableHead>
													<TableHead className="font-bold">
														SR/JR Member
													</TableHead>
													<TableHead className="font-bold">SR Member</TableHead>
													<TableHead className="font-bold">
														Faculty Member
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{[1, 2, 3, 4, 5, 6].map((sem) => {
													const record = selectedThesis.semesterRecords.find(
														(r) => r.semester === sem,
													);
													return (
														<TableRow
															key={sem}
															className={
																record ? "" : "text-muted-foreground/50"
															}
														>
															<TableCell className="text-center font-medium">
																{sem}
															</TableCell>
															<TableCell className="text-sm">
																{record?.srJrMember || "—"}
															</TableCell>
															<TableCell className="text-sm">
																{record?.srMember || "—"}
															</TableCell>
															<TableCell className="text-sm">
																{record?.facultyMember || "—"}
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								</div>

								{/* Action buttons in sheet */}
								{selectedThesis.status !== "SIGNED" && (
									<div className="flex gap-3 pt-4 border-t">
										<Button
											className="flex-1 bg-green-600 hover:bg-green-700"
											onClick={() => {
												handleSign(selectedThesis);
												setSelectedThesis(null);
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
												setSelectedThesis(null);
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
		</div>
	);
}
