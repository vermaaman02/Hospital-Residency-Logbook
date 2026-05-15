/**
 * @module DiagnosticSkillsReviewClient
 * @description 3-tab review page for student diagnostic skill submissions (ABG / ECG / Other).
 * Follows the rotation postings review page pattern exactly.
 * Features: tabs, auto-review toggle, batch/status/student filters, export,
 * stat cards, search, bulk select, detail sheet, sign/reject dialogs, pagination.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 * @see RotationReviewClient — Reference pattern for review pages
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { RevisionThreadButton } from "@/components/shared/RevisionThreadButton";
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
	Activity,
	User,
	Tag,
	MessageSquare,
	Calendar,
	Droplets,
	HeartPulse,
	Stethoscope,
	BookOpen,
	Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useSocketEvent } from "@/lib/socket";
import {
	signDiagnosticSkillEntry,
	rejectDiagnosticSkillEntry,
	bulkSignDiagnosticSkillEntries,
} from "@/actions/diagnostic-skills";
import { toggleAutoReview } from "@/actions/auto-review";
import {
	DIAGNOSTIC_CATEGORY_LABELS,
	CONFIDENCE_LEVEL_LABELS,
} from "@/lib/constants/diagnostic-types";
import type { EntryStatus } from "@/types";
import { ImageGallery } from "@/components/shared/CloudinaryUpload";

// ======================== TYPES ========================

export interface DiagnosticSkillSubmission {
	id: string;
	slNo: number;
	diagnosticCategory: string;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyId: string | null;
	facultyRemark: string | null;
	imageUrls: string[];
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
	signatures?: Array<{
		id: string;
		remark: string | null;
		signedAt: Date;
		signedBy: {
			id: string;
			firstName: string;
			lastName: string;
		};
	}>;
}

interface DiagnosticSkillsReviewClientProps {
	submissions: DiagnosticSkillSubmission[];
	role: "faculty" | "hod";
	autoReviewEnabled?: boolean;
}

type StatusFilter = "ALL" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION" | "DRAFT";

const PAGE_SIZE = 10;

const DIAGNOSTIC_TABS = [
	{
		value: "ABG_ANALYSIS",
		label: "ABG Analysis",
		shortLabel: "ABG",
		icon: Droplets,
	},
	{
		value: "ECG_ANALYSIS",
		label: "ECG Analysis",
		shortLabel: "ECG",
		icon: HeartPulse,
	},
	{
		value: "OTHER_DIAGNOSTIC",
		label: "Other Diagnostic",
		shortLabel: "Other",
		icon: Stethoscope,
	},
] as const;

// ======================== MAIN COMPONENT ========================

export function DiagnosticSkillsReviewClient({
	submissions,
	role,
	autoReviewEnabled,
}: DiagnosticSkillsReviewClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Real-time refresh on diagnostic skill events
	useSocketEvent("entry:updated", () => {
		router.refresh();
	});

	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab") || "ABG_ANALYSIS";

	// Active tab (category)
	const [activeTab, setActiveTab] = useState<string>(initialTab);

	// Auto-review
	const [autoReview, setAutoReview] = useState(autoReviewEnabled ?? false);

	// Filters (shared across tabs — in the top bar like rotation postings)
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [exportStatusFilter, setExportStatusFilter] = useState("ALL");
	const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
	const [studentPickerOpen, setStudentPickerOpen] = useState(false);

	// Per-tab state
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(1);

	// Detail sheet
	const [detailEntry, setDetailEntry] =
		useState<DiagnosticSkillSubmission | null>(null);

	// Sign/Reject dialogs
	const [signEntry, setSignEntry] = useState<DiagnosticSkillSubmission | null>(
		null,
	);
	const [signRemark, setSignRemark] = useState("");
	const [rejectEntry, setRejectEntry] =
		useState<DiagnosticSkillSubmission | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// ─── Derived data ────────────────────────────────────────

	// Available batches (from all submissions)
	const batches = useMemo(() => {
		const set = new Set<string>();
		submissions.forEach((s) => {
			if (s.user.batchRelation?.name) set.add(s.user.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [submissions]);

	// Student options (filtered by batch)
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

	// Submissions for the active tab (category)
	const tabSubmissions = useMemo(() => {
		let result = submissions.filter((s) => s.diagnosticCategory === activeTab);
		if (batchFilter !== "ALL")
			result = result.filter((s) => s.user.batchRelation?.name === batchFilter);
		if (selectedStudentId !== "all")
			result = result.filter((s) => s.user.id === selectedStudentId);
		return result;
	}, [submissions, activeTab, batchFilter, selectedStudentId]);

	// Apply per-tab filters (search + status)
	const filtered = useMemo(() => {
		let result = tabSubmissions;
		if (statusFilter !== "ALL")
			result = result.filter((s) => s.status === statusFilter);
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(s) =>
					`${s.user.firstName} ${s.user.lastName}`.toLowerCase().includes(q) ||
					s.skillName.toLowerCase().includes(q) ||
					(s.representativeDiagnosis ?? "").toLowerCase().includes(q),
			);
		}
		return result;
	}, [tabSubmissions, statusFilter, searchQuery]);

	// Pagination
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// Pending submission counts for each tab (to show badge indicators)
	const pendingCounts = useMemo(() => {
		const counts: Record<string, number> = {
			ABG_ANALYSIS: 0,
			ECG_ANALYSIS: 0,
			OTHER_DIAGNOSTIC: 0,
		};
		submissions.forEach((s) => {
			if (s.status === "SUBMITTED" && counts[s.diagnosticCategory] !== undefined) {
				counts[s.diagnosticCategory]++;
			}
		});
		return counts;
	}, [submissions]);

	// Counts for the active tab (based on tabSubmissions, not filtered)
	const counts = useMemo(() => {
		const c = {
			ALL: 0,
			SUBMITTED: 0,
			SIGNED: 0,
			NEEDS_REVISION: 0,
			DRAFT: 0,
		};
		for (const s of tabSubmissions) {
			c.ALL++;
			if (s.status in c) c[s.status as keyof typeof c]++;
		}
		return c;
	}, [tabSubmissions]);

	const confidenceLabel = (val: string | null) => {
		if (!val) return "—";
		return CONFIDENCE_LEVEL_LABELS[val] ?? val;
	};

	const categoryLabel = (val: string) => DIAGNOSTIC_CATEGORY_LABELS[val] ?? val;

	// Reset page on filter change
	const handleSearchChange = useCallback((val: string) => {
		setSearchQuery(val);
		setPage(1);
	}, []);
	const handleStatusChange = useCallback((val: StatusFilter) => {
		setStatusFilter(val);
		setPage(1);
	}, []);

	// When changing tab, reset per-tab state
	const handleTabChange = useCallback((val: string) => {
		setActiveTab(val);
		setSearchQuery("");
		setStatusFilter("ALL");
		setSelectedIds(new Set());
		setPage(1);
	}, []);

	// ─── Bulk Select ─────────────────────────────────────────

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
		if (allSubmittedSelected) setSelectedIds(new Set());
		else setSelectedIds(new Set(submittedInView.map((s) => s.id)));
	}

	// ─── Actions ─────────────────────────────────────────────

	const handleSign = useCallback((entry: DiagnosticSkillSubmission) => {
		setSignEntry(entry);
		setSignRemark("");
	}, []);

	function confirmSign() {
		if (!signEntry) return;
		startTransition(async () => {
			try {
				await signDiagnosticSkillEntry(signEntry.id, signRemark || undefined);
				toast.success(
					`Signed: ${signEntry.skillName} (${signEntry.user.firstName})`,
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

	function openReject(entry: DiagnosticSkillSubmission) {
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
				await rejectDiagnosticSkillEntry(rejectEntry.id, rejectRemark);
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
				await bulkSignDiagnosticSkillEntries(ids);
				setSelectedIds(new Set());
				toast.success(`Signed ${ids.length} entries`);
				router.refresh();
			} catch {
				toast.error("Bulk sign failed");
			}
		});
	}

	// ─── Auto-review toggle ─────────────────────────────────

	function handleAutoReviewToggle(checked: boolean) {
		setAutoReview(checked);
		startTransition(async () => {
			try {
				await toggleAutoReview("diagnosticSkills", checked);
				toast.success(
					checked ?
						"Auto-review enabled for Diagnostic Skills"
					:	"Auto-review disabled for Diagnostic Skills",
				);
			} catch {
				setAutoReview(!checked);
				toast.error("Failed to toggle setting");
			}
		});
	}

	// ─── Export ──────────────────────────────────────────────

	const buildExportData = useCallback(() => {
		let data = tabSubmissions;
		if (exportStatusFilter !== "ALL")
			data = data.filter((s) => s.status === exportStatusFilter);
		return data;
	}, [tabSubmissions, exportStatusFilter]);

	const handleExportExcel = useCallback(async () => {
		const { exportDiagnosticSkillsReviewToExcel } =
			await import("@/lib/export/export-excel");
		const data = buildExportData();
		exportDiagnosticSkillsReviewToExcel(
			data.map((s) => ({
				slNo: s.slNo,
				diagnosticCategory: categoryLabel(s.diagnosticCategory),
				skillName: s.skillName,
				representativeDiagnosis: s.representativeDiagnosis,
				confidenceLevel: confidenceLabel(s.confidenceLevel),
				totalTimesPerformed: s.totalTimesPerformed,
				facultyRemark: s.facultyRemark,
				status: s.status,
				studentName:
					`${s.user.firstName} ${s.user.lastName}`.trim() || "Unknown",
				batch: s.user.batchRelation?.name ?? "—",
				semester: s.user.currentSemester ?? 0,
			})),
		);
	}, [buildExportData]);

	const handleExportPdf = useCallback(async () => {
		toast.info("PDF export for diagnostics coming soon.");
	}, []);

	// ======================== RENDER ========================

	return (
		<Tabs
			defaultValue="ABG_ANALYSIS"
			className="space-y-4"
			onValueChange={handleTabChange}
		>
			{/* ━━━━ Top Bar: Tabs + Auto-Review + Filters + Export ━━━━ */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
				<TabsList className="grid w-full sm:w-auto grid-cols-3">
					{DIAGNOSTIC_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="flex items-center gap-2 text-xs sm:text-sm"
						>
							<tab.icon className="h-4 w-4" />
							<span className="hidden sm:inline">{tab.label}</span>
							<span className="sm:hidden">{tab.shortLabel}</span>
							{pendingCounts[tab.value] > 0 && (
								<Badge
									variant="destructive"
									className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium flex items-center justify-center"
								>
									{pendingCounts[tab.value]}
								</Badge>
							)}
						</TabsTrigger>
					))}
				</TabsList>

				{/* HOD Auto-Review Toggle */}
				{role === "hod" && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
						{isPending && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						<Label
							htmlFor="diag-auto-review"
							className="text-xs font-medium text-muted-foreground cursor-pointer"
						>
							Auto Review (Diagnostic Skills)
						</Label>
						<Switch
							id="diag-auto-review"
							checked={autoReview}
							onCheckedChange={handleAutoReviewToggle}
							disabled={isPending}
						/>
					</div>
				)}

				<div className="flex items-center gap-2 flex-wrap">
					{/* Batch Filter */}
					{batches.length > 0 && (
						<Select
							value={batchFilter}
							onValueChange={(val) => {
								setBatchFilter(val);
								setSelectedStudentId("all");
								setPage(1);
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

					{/* Status Filter for Export */}
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
												setPage(1);
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
													setPage(1);
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

			{/* ━━━━ Tab Content ━━━━ */}
			{DIAGNOSTIC_TABS.map((tab) => (
				<TabsContent key={tab.value} value={tab.value}>
					<DiagnosticCategoryReview
						tabLabel={tab.label}
						tabIcon={tab.icon}
						submissions={filtered}
						paginated={paginated}
						counts={counts}
						page={page}
						totalPages={totalPages}
						statusFilter={statusFilter}
						searchQuery={searchQuery}
						selectedIds={selectedIds}
						isPending={isPending}
						role={role}
						allSubmittedSelected={allSubmittedSelected}
						onSearchChange={handleSearchChange}
						onStatusChange={handleStatusChange}
						onPageChange={setPage}
						onToggleSelect={toggleSelect}
						onToggleSelectAll={toggleSelectAll}
						onBulkSign={handleBulkSign}
						onSign={handleSign}
						onReject={openReject}
						onViewDetail={setDetailEntry}
						confidenceLabel={confidenceLabel}
					/>
				</TabsContent>
			))}

			{/* ━━━━ Detail Sheet ━━━━ */}
			<Sheet
				open={!!detailEntry}
				onOpenChange={(open) => !open && setDetailEntry(null)}
			>
				<SheetContent className="sm:max-w-2xl overflow-y-auto">
					{detailEntry && (
						<>
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<Activity className="h-5 w-5 text-hospital-primary" />
									{detailEntry.skillName}
								</SheetTitle>
								<SheetDescription>
									{categoryLabel(detailEntry.diagnosticCategory)} — Entry #
									{detailEntry.slNo}
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

								{/* Diagnostic Details */}
								<DetailSection title="Diagnostic Details" icon={Activity}>
									<DetailRow
										label="Category"
										value={categoryLabel(detailEntry.diagnosticCategory)}
									/>
									<DetailRow label="Skill" value={detailEntry.skillName} />
									<DetailRow
										label="Confidence"
										value={confidenceLabel(detailEntry.confidenceLevel)}
									/>
									<DetailRow
										label="Tally"
										value={String(detailEntry.totalTimesPerformed)}
									/>
									<DetailRow
										label="Sl. No."
										value={detailEntry.slNo.toString()}
									/>
								</DetailSection>

								{/* Diagnosis */}
								<DetailSection title="Representative Diagnosis" icon={Tag}>
									<p className="text-sm bg-muted/30 rounded-md p-3">
										{detailEntry.representativeDiagnosis || "Not specified"}
									</p>
								</DetailSection>

								{/* Status & Dates */}
								<DetailSection title="Status" icon={Calendar}>
									<div className="flex items-center gap-2">
										<StatusBadge
											status={detailEntry.status as EntryStatus}
											size="sm"
										/>
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										Created:{" "}
										{new Date(detailEntry.createdAt).toLocaleDateString(
											"en-IN",
											{
												day: "2-digit",
												month: "short",
												year: "numeric",
											},
										)}
									</div>
								</DetailSection>

								{/* Faculty Remark */}
								{detailEntry.facultyRemark && (
									<DetailSection title="Faculty Remark" icon={MessageSquare}>
										<div
											className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 text-sm prose prose-sm max-w-none"
											dangerouslySetInnerHTML={{
												__html: renderMarkdown(detailEntry.facultyRemark),
											}}
										/>
									</DetailSection>
								)}

								{/* Signer Information */}
								{detailEntry.signatures && detailEntry.signatures.length > 0 && (
									<DetailSection title="Signer Information" icon={Activity}>
										<div className="space-y-3">
											{detailEntry.signatures.map((sig) => (
												<div
													key={sig.id}
													className="bg-green-50/50 border border-green-200/50 rounded-lg p-3 text-sm"
												>
													<div className="font-medium text-green-900">
														Dr. {sig.signedBy.firstName} {sig.signedBy.lastName}
													</div>
													{sig.remark && (
														<div className="text-green-800 mt-1 text-xs">
															{sig.remark}
														</div>
													)}
													<div className="text-green-700 mt-1 text-xs">
														{format(new Date(sig.signedAt), "MMM d, yyyy · h:mm a")}
													</div>
												</div>
											))}
										</div>
									</DetailSection>
								)}

								{/* Uploaded Images (Feature 4) */}
								<DetailSection title="Uploaded Images" icon={ImageIcon}>
									{detailEntry.imageUrls && detailEntry.imageUrls.length > 0 ? (
										<ImageGallery urls={detailEntry.imageUrls} maxDisplay={6} />
									) : (
										<div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-md">
											No images were attached to this entry.
										</div>
									)}
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

			{/* ━━━━ Sign Dialog ━━━━ */}
			<Dialog
				open={!!signEntry}
				onOpenChange={(open) => !open && setSignEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Off — {signEntry?.skillName}</DialogTitle>
						<DialogDescription>
							You are approving{" "}
							{signEntry ?
								`${signEntry.user.firstName} ${signEntry.user.lastName}'s`
							:	""}{" "}
							diagnostic skill entry. Add an optional remark.
						</DialogDescription>
					</DialogHeader>
					<MarkdownEditor
						value={signRemark}
						onChange={setSignRemark}
						placeholder="Optional remark..."
						compact
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

			{/* ━━━━ Reject Dialog ━━━━ */}
			<Dialog
				open={!!rejectEntry}
				onOpenChange={(open) => !open && setRejectEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Request Revision — {rejectEntry?.skillName}
						</DialogTitle>
						<DialogDescription>
							Provide a remark explaining what needs to be corrected.
						</DialogDescription>
					</DialogHeader>
					<MarkdownEditor
						value={rejectRemark}
						onChange={setRejectRemark}
						placeholder="Explain what needs to be revised..."
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
		</Tabs>
	);
}

// ======================== CATEGORY TAB CONTENT ========================

function DiagnosticCategoryReview({
	tabLabel,
	tabIcon: TabIcon,
	submissions,
	paginated,
	counts,
	page,
	totalPages,
	statusFilter,
	searchQuery,
	selectedIds,
	isPending,
	role,
	allSubmittedSelected,
	onSearchChange,
	onStatusChange,
	onPageChange,
	onToggleSelect,
	onToggleSelectAll,
	onBulkSign,
	onSign,
	onReject,
	onViewDetail,
	confidenceLabel,
}: {
	tabLabel: string;
	tabIcon: React.ComponentType<{ className?: string }>;
	submissions: DiagnosticSkillSubmission[];
	paginated: DiagnosticSkillSubmission[];
	counts: Record<string, number>;
	page: number;
	totalPages: number;
	statusFilter: StatusFilter;
	searchQuery: string;
	selectedIds: Set<string>;
	isPending: boolean;
	role: "faculty" | "hod";
	allSubmittedSelected: boolean;
	onSearchChange: (val: string) => void;
	onStatusChange: (val: StatusFilter) => void;
	onPageChange: (page: number) => void;
	onToggleSelect: (id: string) => void;
	onToggleSelectAll: () => void;
	onBulkSign: () => void;
	onSign: (entry: DiagnosticSkillSubmission) => void;
	onReject: (entry: DiagnosticSkillSubmission) => void;
	onViewDetail: (entry: DiagnosticSkillSubmission) => void;
	confidenceLabel: (val: string | null) => string;
}) {
	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-bold flex items-center gap-2">
					<TabIcon className="h-6 w-6 text-hospital-primary" />
					{tabLabel} — Review
				</h1>
				<p className="text-muted-foreground mt-1">
					{role === "hod" ?
						`Review all student ${tabLabel.toLowerCase()} submissions`
					:	`Review ${tabLabel.toLowerCase()} submissions from your assigned students`
					}
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

			{/* Toolbar: Search + Filters + Bulk Actions */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						{/* Search */}
						<div className="relative flex-1 w-full">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by student name, skill, or diagnosis..."
								value={searchQuery}
								onChange={(e) => onSearchChange(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Status Filter */}
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Select
								value={statusFilter}
								onValueChange={(v) => onStatusChange(v as StatusFilter)}
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
								onClick={onBulkSign}
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
								onClick={() => onToggleSelectAll()}
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
						Submissions ({submissions.length})
					</CardTitle>
					<CardDescription>
						Click on any row to view full details
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					{submissions.length === 0 ?
						<div className="text-center py-12 text-muted-foreground">
							<TabIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No submissions found</p>
							<p className="text-sm mt-1">
								{searchQuery || statusFilter !== "ALL" ?
									"Try adjusting your search or filter"
								:	"No diagnostic skill entries have been submitted yet"}
							</p>
						</div>
					:	<div className="border rounded-lg">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-12 text-center">
											<Checkbox
												checked={allSubmittedSelected}
												onCheckedChange={onToggleSelectAll}
												aria-label="Select all"
											/>
										</TableHead>
										<TableHead className="font-bold">Student</TableHead>
										<TableHead className="font-bold">
											Diagnostic Skill
										</TableHead>
										<TableHead className="font-bold">
											Representative Diagnosis
										</TableHead>
										<TableHead className="text-center font-bold">
											Confidence
										</TableHead>
										<TableHead className="text-center font-bold">
											Tally
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
									{paginated.map((entry) => (
										<TableRow
											key={entry.id}
											className={cn(
												"cursor-pointer transition-colors",
												selectedIds.has(entry.id) && "bg-blue-50/60",
												entry.status === "SIGNED" && "bg-green-50/40",
												entry.status === "NEEDS_REVISION" && "bg-amber-50/40",
											)}
											onClick={() => onViewDetail(entry)}
										>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												{entry.status === "SUBMITTED" && (
													<Checkbox
														checked={selectedIds.has(entry.id)}
														onCheckedChange={() => onToggleSelect(entry.id)}
													/>
												)}
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<Link
													href={`/dashboard/${role}/diagnostics/student/${entry.user.id}`}
													className="group"
												>
													<div className="font-medium text-hospital-primary group-hover:underline">
														{entry.user.firstName} {entry.user.lastName}
													</div>
													<div className="text-xs text-muted-foreground">
														{entry.user.batchRelation?.name ?? "No batch"} · Sem{" "}
														{entry.user.currentSemester ?? "?"}
													</div>
												</Link>
											</TableCell>
											<TableCell>
												<div className="font-medium text-sm">
													{entry.skillName}
												</div>
											</TableCell>
											<TableCell className="text-sm max-w-56">
												<div className="line-clamp-2">
													{entry.representativeDiagnosis || (
														<span className="text-muted-foreground">—</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">
												{entry.confidenceLevel ?
													<Badge variant="outline" className="text-xs">
														{confidenceLabel(entry.confidenceLevel)}
													</Badge>
												:	"—"}
											</TableCell>
											<TableCell className="text-center font-mono text-sm">
												{entry.totalTimesPerformed}
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
														className="h-7 w-7"
														title="View details"
														onClick={() => onViewDetail(entry)}
													>
														<Eye className="h-3.5 w-3.5" />
													</Button>
													{entry.status === "SUBMITTED" && (
														<>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
																title="Sign off"
																onClick={() => onSign(entry)}
																disabled={isPending}
															>
																<CheckCircle2 className="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
																title="Request revision"
																onClick={() => onReject(entry)}
																disabled={isPending}
															>
																<XCircle className="h-3.5 w-3.5" />
															</Button>
														</>
													)}
													<RevisionThreadButton
														entityType="DiagnosticSkill"
														entityId={entry.id}
														title={`History — ${entry.skillName}`}
														description={`Submission and review history for ${entry.user.firstName} ${entry.user.lastName}`}
														variant="ghost"
														size="sm"
														className="h-7 w-7"
														label=""
													/>
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
								Showing {(page - 1) * PAGE_SIZE + 1}–
								{Math.min(page * PAGE_SIZE, submissions.length)} of{" "}
								{submissions.length}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => onPageChange(page - 1)}
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
									onClick={() => onPageChange(page + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
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
