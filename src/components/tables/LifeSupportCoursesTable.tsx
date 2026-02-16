/**
 * @module LifeSupportCoursesTable
 * @description Inline-editing table for Life-Support Courses attended.
 * Simple form with Date, Course Name, Conducted@, Confidence Level.
 * Features: inline editing, pagination, faculty selector, status badges, add row.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 */

"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Send,
	Check,
	X,
	ChevronsUpDown,
	Save,
	AlertTriangle,
	Plus,
	Trash2,
	ChevronLeft,
	ChevronRight,
	CalendarIcon,
	GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { EntryStatus } from "@/types";

// ======================== CONSTANTS ========================

const PAGE_SIZE = 15;

const CONFIDENCE_LEVELS = [
	{ value: "VC", label: "Very Confident" },
	{ value: "FC", label: "Fairly Confident" },
	{ value: "SC", label: "Slightly Confident" },
	{ value: "NC", label: "Not Confident" },
] as const;

const CONFIDENCE_LABELS: Record<string, string> = {
	VC: "Very Confident",
	FC: "Fairly Confident",
	SC: "Slightly Confident",
	NC: "Not Confident",
};

// ======================== TYPES ========================

export interface CourseEntry {
	id: string;
	slNo: number;
	date: string | null;
	courseName: string | null;
	conductedAt: string | null;
	confidenceLevel: string | null;
	facultyId: string | null;
	facultyRemark: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

interface LifeSupportCoursesTableProps {
	entries: CourseEntry[];
	facultyList: FacultyOption[];
	maxEntries: number;
	onAddRow: () => Promise<unknown>;
	onDeleteEntry: (id: string) => Promise<unknown>;
	onUpdateEntry: (
		id: string,
		data: {
			date?: string | null;
			courseName?: string | null;
			conductedAt?: string | null;
			confidenceLevel?: string | null;
			facultyId?: string | null;
		},
	) => Promise<unknown>;
	onSubmitEntry: (id: string) => Promise<unknown>;
}

interface InlineForm {
	date: string;
	courseName: string;
	conductedAt: string;
	confidenceLevel: string;
	facultyId: string;
}

const emptyForm: InlineForm = {
	date: "",
	courseName: "",
	conductedAt: "",
	confidenceLevel: "",
	facultyId: "",
};

// ======================== COMPONENT ========================

export function LifeSupportCoursesTable({
	entries,
	facultyList,
	maxEntries,
	onAddRow,
	onDeleteEntry,
	onUpdateEntry,
	onSubmitEntry,
}: LifeSupportCoursesTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// ---- Pagination ----
	const [page, setPage] = useState(1);
	const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const startIdx = (safePage - 1) * PAGE_SIZE;
	const pageEntries = entries.slice(startIdx, startIdx + PAGE_SIZE);

	// ---- Inline editing ----
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<InlineForm>(emptyForm);
	const [facultyOpen, setFacultyOpen] = useState(false);

	// ---- Stats ----
	const stats = useMemo(() => {
		const total = entries.length;
		const filled = entries.filter((e) => e.courseName).length;
		const draft = entries.filter((e) => e.status === "DRAFT").length;
		const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
		const signed = entries.filter((e) => e.status === "SIGNED").length;
		const needsRevision = entries.filter(
			(e) => e.status === "NEEDS_REVISION",
		).length;
		return { total, filled, draft, submitted, signed, needsRevision };
	}, [entries]);

	const progressPercent = useMemo(() => {
		if (maxEntries <= 0) return 0;
		return Math.min(100, Math.round((stats.filled / maxEntries) * 100));
	}, [stats.filled, maxEntries]);

	// ---- Faculty lookup ----
	const getFacultyName = useCallback(
		(id: string | null) => {
			if (!id) return "";
			const f = facultyList.find((f) => f.id === id);
			return f ? `${f.firstName} ${f.lastName}` : "";
		},
		[facultyList],
	);

	// ---- Edit handlers ----
	function startEditing(entry: CourseEntry) {
		if (entry.status === "SIGNED" || entry.status === "SUBMITTED") return;
		setEditingId(entry.id);
		setForm({
			date: entry.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
			courseName: entry.courseName ?? "",
			conductedAt: entry.conductedAt ?? "",
			confidenceLevel: entry.confidenceLevel ?? "",
			facultyId: entry.facultyId ?? "",
		});
	}

	function cancelEditing() {
		setEditingId(null);
		setForm(emptyForm);
	}

	function handleSave(entryId: string) {
		startTransition(async () => {
			try {
				await onUpdateEntry(entryId, {
					date: form.date || null,
					courseName: form.courseName || null,
					conductedAt: form.conductedAt || null,
					confidenceLevel: form.confidenceLevel || null,
					facultyId: form.facultyId || null,
				});
				setEditingId(null);
				setForm(emptyForm);
				router.refresh();
				toast.success("Changes saved");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Save failed");
			}
		});
	}

	function handleSubmit(entry: CourseEntry) {
		if (!entry.courseName || !entry.date) {
			toast.error("Course name and date are required to submit");
			return;
		}
		startTransition(async () => {
			try {
				await onSubmitEntry(entry.id);
				router.refresh();
				toast.success("Submitted for review");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Submit failed");
			}
		});
	}

	function handleDelete(entry: CourseEntry) {
		if (entry.status !== "DRAFT") return;
		startTransition(async () => {
			try {
				await onDeleteEntry(entry.id);
				router.refresh();
				toast.success("Entry deleted");
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Delete failed");
			}
		});
	}

	function handleAddRow() {
		startTransition(async () => {
			try {
				await onAddRow();
				router.refresh();
				toast.success("New row added");
				// Jump to last page
				const newTotal = entries.length + 1;
				setPage(Math.ceil(newTotal / PAGE_SIZE));
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Add failed");
			}
		});
	}

	// ---- Render ----
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<GraduationCap className="h-6 w-6 text-hospital-primary" />
						<div>
							<CardTitle className="flex items-center gap-2">
								Life-Support Courses
								<Badge variant="outline" className="ml-2 text-xs">
									{stats.filled} / {maxEntries}
								</Badge>
							</CardTitle>
							<CardDescription>
								Life-support and other skill development courses attended
							</CardDescription>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleAddRow}
						disabled={isPending}
					>
						{isPending ?
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						:	<Plus className="h-4 w-4 mr-1" />}
						Add Row
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Stats Bar */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-muted/50 rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-hospital-primary">
							{stats.filled}
						</div>
						<div className="text-xs text-muted-foreground">Entries</div>
					</div>
					<div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-green-600">
							{stats.signed}
						</div>
						<div className="text-xs text-muted-foreground">Signed</div>
					</div>
					<div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-amber-600">
							{stats.submitted}
						</div>
						<div className="text-xs text-muted-foreground">Pending</div>
					</div>
					{stats.needsRevision > 0 && (
						<div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
							<div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
								<AlertTriangle className="h-4 w-4" />
								{stats.needsRevision}
							</div>
							<div className="text-xs text-muted-foreground">
								Needs Revision
							</div>
						</div>
					)}
				</div>

				{/* Progress Bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Progress</span>
						<span>{progressPercent}%</span>
					</div>
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
						<div
							className={cn(
								"h-2 rounded-full transition-all duration-500",
								progressPercent >= 100 ? "bg-green-500"
								: progressPercent >= 50 ? "bg-hospital-primary"
								: "bg-amber-500",
							)}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>

				{/* Table */}
				<div className="border rounded-lg overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead className="w-14 text-center">Sl.</TableHead>
								<TableHead className="w-32">Date</TableHead>
								<TableHead className="min-w-50">Course Name</TableHead>
								<TableHead className="w-40">Conducted@</TableHead>
								<TableHead className="w-36">Confidence</TableHead>
								<TableHead className="w-40">Faculty</TableHead>
								<TableHead className="w-24 text-center">Status</TableHead>
								<TableHead className="w-28 text-center">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{pageEntries.length === 0 ?
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center text-muted-foreground py-8"
									>
										No entries yet. Click &quot;Add Row&quot; to start.
									</TableCell>
								</TableRow>
							:	pageEntries.map((entry) => {
									const isEditing = editingId === entry.id;
									const isSigned = entry.status === "SIGNED";
									const isSubmitted = entry.status === "SUBMITTED";
									const isNeedsRevision = entry.status === "NEEDS_REVISION";
									const canEdit = !isSigned && !isSubmitted;

									return (
										<TableRow
											key={entry.id}
											className={cn(
												"group hover:bg-muted/30",
												isEditing && "bg-blue-50/50 dark:bg-blue-950/20",
												isNeedsRevision && "bg-red-50/50 dark:bg-red-950/20",
											)}
											onClick={() =>
												!isEditing && canEdit && startEditing(entry)
											}
										>
											{/* Sl No */}
											<TableCell className="text-center font-medium text-muted-foreground">
												{entry.slNo}
											</TableCell>

											{/* Date */}
											<TableCell>
												{isEditing ?
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																size="sm"
																className={cn(
																	"w-full justify-start text-left font-normal",
																	!form.date && "text-muted-foreground",
																)}
															>
																<CalendarIcon className="mr-2 h-4 w-4" />
																{form.date ?
																	format(new Date(form.date), "dd/MM/yy")
																:	"Pick date"}
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-auto p-0">
															<Calendar
																mode="single"
																selected={
																	form.date ? new Date(form.date) : undefined
																}
																onSelect={(date) =>
																	setForm((f) => ({
																		...f,
																		date:
																			date ? format(date, "yyyy-MM-dd") : "",
																	}))
																}
																initialFocus
															/>
														</PopoverContent>
													</Popover>
												:	<span className="text-sm">
														{entry.date ?
															format(new Date(entry.date), "dd/MM/yyyy")
														:	"—"}
													</span>
												}
											</TableCell>

											{/* Course Name */}
											<TableCell>
												{isEditing ?
													<Input
														value={form.courseName}
														onChange={(e) =>
															setForm((f) => ({
																...f,
																courseName: e.target.value,
															}))
														}
														placeholder="e.g., ACLS, BLS, ATLS"
														className="h-8"
													/>
												:	<div className="truncate max-w-62.5">
														{entry.courseName || (
															<span className="text-muted-foreground italic">
																Click to edit
															</span>
														)}
													</div>
												}
											</TableCell>

											{/* Conducted@ */}
											<TableCell>
												{isEditing ?
													<Input
														value={form.conductedAt}
														onChange={(e) =>
															setForm((f) => ({
																...f,
																conductedAt: e.target.value,
															}))
														}
														placeholder="Location"
														className="h-8"
													/>
												:	<span className="text-sm">
														{entry.conductedAt || "—"}
													</span>
												}
											</TableCell>

											{/* Confidence Level */}
											<TableCell>
												{isEditing ?
													<Select
														value={form.confidenceLevel}
														onValueChange={(val) =>
															setForm((f) => ({ ...f, confidenceLevel: val }))
														}
													>
														<SelectTrigger className="h-8">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															{CONFIDENCE_LEVELS.map((level) => (
																<SelectItem
																	key={level.value}
																	value={level.value}
																>
																	{level.value} - {level.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												:	<span className="text-sm">
														{entry.confidenceLevel ?
															`${entry.confidenceLevel} - ${CONFIDENCE_LABELS[entry.confidenceLevel] ?? ""}`
														:	"—"}
													</span>
												}
											</TableCell>

											{/* Faculty */}
											<TableCell>
												{isEditing ?
													<Popover
														open={facultyOpen}
														onOpenChange={setFacultyOpen}
													>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																className="w-full justify-between h-8"
															>
																<span className="truncate">
																	{form.facultyId ?
																		getFacultyName(form.facultyId)
																	:	"Select..."}
																</span>
																<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-50 p-0">
															<Command>
																<CommandInput placeholder="Search..." />
																<CommandList>
																	<CommandEmpty>No faculty found.</CommandEmpty>
																	<CommandGroup>
																		{facultyList.map((f) => (
																			<CommandItem
																				key={f.id}
																				value={`${f.firstName} ${f.lastName}`}
																				onSelect={() => {
																					setForm((prev) => ({
																						...prev,
																						facultyId: f.id,
																					}));
																					setFacultyOpen(false);
																				}}
																			>
																				<Check
																					className={cn(
																						"mr-2 h-4 w-4",
																						form.facultyId === f.id ?
																							"opacity-100"
																						:	"opacity-0",
																					)}
																				/>
																				{f.firstName} {f.lastName}
																			</CommandItem>
																		))}
																	</CommandGroup>
																</CommandList>
															</Command>
														</PopoverContent>
													</Popover>
												:	<span className="text-sm">
														{getFacultyName(entry.facultyId) || "—"}
													</span>
												}
											</TableCell>

											{/* Status */}
											<TableCell className="text-center">
												<StatusBadge status={entry.status as EntryStatus} />
											</TableCell>

											{/* Actions */}
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												{isEditing ?
													<div className="flex items-center justify-center gap-1">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleSave(entry.id)}
															disabled={isPending}
															className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
														>
															{isPending ?
																<Loader2 className="h-4 w-4 animate-spin" />
															:	<Save className="h-4 w-4" />}
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={cancelEditing}
															disabled={isPending}
															className="h-7 w-7 text-gray-600 hover:text-gray-700"
														>
															<X className="h-4 w-4" />
														</Button>
													</div>
												:	<div className="flex items-center justify-center gap-1">
														{canEdit && entry.courseName && (
															<Button
																variant="ghost"
																size="icon"
																onClick={(e) => {
																	e.stopPropagation();
																	handleSubmit(entry);
																}}
																disabled={isPending}
																className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
																title="Submit for review"
															>
																<Send className="h-4 w-4" />
															</Button>
														)}
														{entry.status === "DRAFT" && (
															<Button
																variant="ghost"
																size="icon"
																onClick={(e) => {
																	e.stopPropagation();
																	handleDelete(entry);
																}}
																disabled={isPending}
																className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
																title="Delete"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														)}
														{isSigned && (
															<Check className="h-4 w-4 text-green-600" />
														)}
														{isSubmitted && (
															<span className="text-xs text-amber-600">
																Pending
															</span>
														)}
													</div>
												}
											</TableCell>
										</TableRow>
									);
								})
							}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between pt-2">
						<span className="text-sm text-muted-foreground">
							Page {safePage} of {totalPages} ({entries.length} entries)
						</span>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={safePage === 1}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={safePage === totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}

				{/* Rejection Warning */}
				{stats.needsRevision > 0 && (
					<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						<div>
							<p className="text-sm font-medium text-red-800 dark:text-red-200">
								{stats.needsRevision} entr
								{stats.needsRevision === 1 ? "y" : "ies"} need revision
							</p>
							<p className="text-xs text-red-600 dark:text-red-400">
								These entries were rejected by faculty. Please review the
								remarks and resubmit.
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
