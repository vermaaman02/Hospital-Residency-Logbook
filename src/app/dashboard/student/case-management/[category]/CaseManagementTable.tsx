/**
 * @module CaseManagementTable
 * @description Inline-editing table for Case Management entries (one category).
 * Click row to edit. Columns: Sl.No (auto), Case Category (sub-category, read-only),
 * Date, Patient Name, Age (int), Sex (select), UHID, Complete Diagnosis,
 * CBD/S/O/MS/MI (select), Faculty Sign (searchable dropdown), Total Case Tally (number),
 * Status, Actions.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	MarkdownEditor,
	renderMarkdown,
} from "@/components/shared/MarkdownEditor";
import {
	updateCaseManagementEntry,
	submitCaseManagementEntry,
	initializeCaseManagement,
	addCaseManagementRow,
	deleteCaseManagementEntry,
} from "@/actions/case-management";
import { COMPETENCY_LEVEL_OPTIONS } from "@/lib/constants/case-management-fields";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface CaseManagementEntry {
	id: string;
	slNo: number;
	caseSubCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	facultyId: string | null;
	facultyRemark: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

interface CaseManagementTableProps {
	entries: CaseManagementEntry[];
	facultyList: FacultyOption[];
	category: string;
	categoryLabel: string;
}

interface InlineForm {
	date: string;
	patientName: string;
	patientAge: string;
	patientSex: string;
	uhid: string;
	completeDiagnosis: string;
	competencyLevel: string;
	totalCaseTally: number;
	facultyId: string;
}

const emptyForm: InlineForm = {
	date: "",
	patientName: "",
	patientAge: "",
	patientSex: "",
	uhid: "",
	completeDiagnosis: "",
	competencyLevel: "",
	totalCaseTally: 0,
	facultyId: "",
};

const SEX_OPTIONS = [
	{ value: "Male", label: "Male" },
	{ value: "Female", label: "Female" },
	{ value: "Other", label: "Other" },
];

// ======================== MAIN COMPONENT ========================

const PAGE_SIZE = 15;

export function CaseManagementTable({
	entries,
	facultyList,
	category,
	categoryLabel,
}: CaseManagementTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<InlineForm>(emptyForm);
	const [facultyPickerOpen, setFacultyPickerOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

	const paginatedEntries = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return entries.slice(start, start + PAGE_SIZE);
	}, [entries, currentPage]);

	const stats = useMemo(() => {
		const total = entries.length;
		const signed = entries.filter((e) => e.status === "SIGNED").length;
		const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
		const draft = entries.filter((e) => e.status === "DRAFT").length;
		const needsRevision = entries.filter(
			(e) => e.status === "NEEDS_REVISION",
		).length;
		return { total, signed, submitted, draft, needsRevision };
	}, [entries]);

	const getFacultyName = useCallback(
		(facultyId: string | null) => {
			if (!facultyId) return "—";
			const f = facultyList.find((fl) => fl.id === facultyId);
			return f ? `Dr. ${f.firstName} ${f.lastName}` : "—";
		},
		[facultyList],
	);

	const competencyLabel = useCallback((val: string | null) => {
		if (!val) return "—";
		return (
			COMPETENCY_LEVEL_OPTIONS.find((cl) => cl.value === val)?.label ?? val
		);
	}, []);

	// ---- Editing ----

	function startEditing(entry: CaseManagementEntry) {
		if (entry.status === "SUBMITTED" || entry.status === "SIGNED") return;
		setEditingId(entry.id);
		setForm({
			date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
			patientName: entry.patientName ?? "",
			patientAge: entry.patientAge != null ? String(entry.patientAge) : "",
			patientSex: entry.patientSex ?? "",
			uhid: entry.uhid ?? "",
			completeDiagnosis: entry.completeDiagnosis ?? "",
			competencyLevel: entry.competencyLevel ?? "",
			totalCaseTally: entry.totalCaseTally,
			facultyId: entry.facultyId ?? "",
		});
	}

	function cancelEdit() {
		setEditingId(null);
	}

	function handleSave(id: string) {
		startTransition(async () => {
			try {
				const ageNum = form.patientAge ? parseInt(form.patientAge) : null;
				if (form.patientAge && (isNaN(ageNum!) || ageNum! < 0)) {
					toast.error("Age must be a valid positive integer");
					return;
				}
				await updateCaseManagementEntry(id, {
					date: form.date || null,
					patientName: form.patientName || null,
					patientAge: ageNum,
					patientSex: form.patientSex || null,
					uhid: form.uhid || null,
					completeDiagnosis: form.completeDiagnosis || null,
					competencyLevel: form.competencyLevel || null,
					totalCaseTally: form.totalCaseTally,
					facultyId: form.facultyId || null,
				});
				toast.success("Saved");
				setEditingId(null);
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Save failed");
			}
		});
	}

	function handleSubmit(id: string) {
		const entry = entries.find((e) => e.id === id);
		if (entry) {
			const missing: string[] = [];
			if (!entry.competencyLevel) missing.push("Competency Level");
			if (!entry.facultyId) missing.push("Faculty Sign");
			if (missing.length > 0) {
				toast.error(`Cannot submit — fill: ${missing.join(", ")}`);
				return;
			}
		}
		startTransition(async () => {
			try {
				await submitCaseManagementEntry(id);
				toast.success("Submitted for review");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	function handleInitialize() {
		startTransition(async () => {
			try {
				const result = await initializeCaseManagement(category);
				if (result.initialized) {
					router.refresh();
				}
			} catch {
				toast.error("Failed to initialize case entries");
			}
		});
	}

	function handleAddRow() {
		startTransition(async () => {
			try {
				await addCaseManagementRow(category);
				toast.success("Row added");
				router.refresh();
				// Jump to last page
				const newTotal = entries.length + 1;
				setCurrentPage(Math.ceil(newTotal / PAGE_SIZE));
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to add row");
			}
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			try {
				await deleteCaseManagementEntry(id);
				toast.success("Entry deleted");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Cannot delete");
			}
		});
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">
							Case Management — {categoryLabel}
						</CardTitle>
						<CardDescription>
							{stats.signed} of {stats.total} entries signed off
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleAddRow}
							disabled={isPending}
						>
							<Plus className="h-4 w-4 mr-1" /> Add Row
						</Button>
						<Badge variant="outline" className="text-sm">
							{stats.signed}/{stats.total}
						</Badge>
					</div>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-muted rounded-full h-2 mt-2">
					<div
						className="bg-hospital-secondary rounded-full h-2 transition-all"
						style={{
							width: `${stats.total > 0 ? (stats.signed / stats.total) * 100 : 0}%`,
						}}
					/>
				</div>
			</CardHeader>
			<CardContent className="p-0 sm:p-6 overflow-x-auto">
				{entries.length === 0 ?
					<div className="text-center py-12 text-muted-foreground space-y-3">
						<p>No entries yet for this category.</p>
						<div className="flex items-center justify-center gap-3">
							<Button
								variant="outline"
								onClick={handleInitialize}
								disabled={isPending}
							>
								{isPending ?
									<Loader2 className="h-4 w-4 animate-spin mr-1" />
								:	null}
								Initialize Sub-Categories
							</Button>
							<Button
								variant="default"
								onClick={handleAddRow}
								disabled={isPending}
							>
								<Plus className="h-4 w-4 mr-1" /> Add Your First Entry
							</Button>
						</div>
					</div>
				:	<>
						<div className="border rounded-lg" style={{ minWidth: "1150px" }}>
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-12 text-center font-bold">
											Sl.
										</TableHead>
										<TableHead className="min-w-36 font-bold">
											Case Category
										</TableHead>
										<TableHead className="w-24 font-bold">Date</TableHead>
										<TableHead className="w-28 font-bold">
											Patient Name
										</TableHead>
										<TableHead className="w-14 text-center font-bold">
											Age
										</TableHead>
										<TableHead className="w-20 font-bold">Sex</TableHead>
										<TableHead className="w-24 font-bold">UHID</TableHead>
										<TableHead className="min-w-36 font-bold">
											Complete Diagnosis
										</TableHead>
										<TableHead className="w-32 font-bold">
											CBD/S/O/MS/MI
										</TableHead>
										<TableHead className="w-36 font-bold">
											Faculty/SR Sign
										</TableHead>
										<TableHead className="w-16 text-center font-bold">
											Tally
										</TableHead>
										<TableHead className="w-24 text-center font-bold">
											Status
										</TableHead>
										<TableHead className="w-24 text-center font-bold">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedEntries.map((entry) =>
										editingId === entry.id ?
											<EditRow
												key={entry.id}
												entry={entry}
												form={form}
												setForm={setForm}
												facultyList={facultyList}
												facultyPickerOpen={facultyPickerOpen}
												setFacultyPickerOpen={setFacultyPickerOpen}
												onSave={() => handleSave(entry.id)}
												onCancel={cancelEdit}
												isPending={isPending}
												getFacultyName={getFacultyName}
											/>
										:	<ReadRow
												key={entry.id}
												entry={entry}
												onEdit={() => startEditing(entry)}
												onSubmit={() => handleSubmit(entry.id)}
												onDelete={() => handleDelete(entry.id)}
												isPending={isPending}
												getFacultyName={getFacultyName}
												competencyLabel={competencyLabel}
											/>,
									)}
								</TableBody>
							</Table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-4 px-2">
								<p className="text-sm text-muted-foreground">
									Showing {(currentPage - 1) * PAGE_SIZE + 1}–
									{Math.min(currentPage * PAGE_SIZE, entries.length)} of{" "}
									{entries.length} entries
								</p>
								<div className="flex items-center gap-1">
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									{Array.from({ length: totalPages }, (_, i) => i + 1)
										.filter(
											(p) =>
												p === 1 ||
												p === totalPages ||
												Math.abs(p - currentPage) <= 1,
										)
										.reduce<(number | "...")[]>((acc, p, idx, arr) => {
											if (idx > 0 && p - (arr[idx - 1] ?? 0) > 1)
												acc.push("...");
											acc.push(p);
											return acc;
										}, [])
										.map((p, idx) =>
											p === "..." ?
												<span
													key={`dot-${idx}`}
													className="px-1 text-muted-foreground"
												>
													…
												</span>
											:	<Button
													key={p}
													variant={currentPage === p ? "default" : "outline"}
													size="icon"
													className="h-8 w-8"
													onClick={() => setCurrentPage(p)}
												>
													{p}
												</Button>,
										)}
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() =>
											setCurrentPage((p) => Math.min(totalPages, p + 1))
										}
										disabled={currentPage === totalPages}
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
	);
}

// ======================== EDIT ROW ========================

function EditRow({
	entry,
	form,
	setForm,
	facultyList,
	facultyPickerOpen,
	setFacultyPickerOpen,
	onSave,
	onCancel,
	isPending,
	getFacultyName,
}: {
	entry: CaseManagementEntry;
	form: InlineForm;
	setForm: React.Dispatch<React.SetStateAction<InlineForm>>;
	facultyList: FacultyOption[];
	facultyPickerOpen: boolean;
	setFacultyPickerOpen: (open: boolean) => void;
	onSave: () => void;
	onCancel: () => void;
	isPending: boolean;
	getFacultyName: (id: string | null) => string;
}) {
	return (
		<TableRow className="bg-blue-50/40">
			{/* Sl. No */}
			<TableCell className="text-center font-medium text-muted-foreground">
				{entry.slNo}
			</TableCell>

			{/* Case Category (sub-category, read-only) */}
			<TableCell className="font-medium text-sm">
				{entry.caseSubCategory}
			</TableCell>

			{/* Date */}
			<TableCell>
				<Input
					type="date"
					value={form.date}
					onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
					className="w-28 text-xs"
				/>
			</TableCell>

			{/* Patient Name */}
			<TableCell>
				<Input
					value={form.patientName}
					onChange={(e) =>
						setForm((f) => ({ ...f, patientName: e.target.value }))
					}
					placeholder="Name"
					className="w-28 text-xs"
				/>
			</TableCell>

			{/* Age (integer only) */}
			<TableCell className="text-center">
				<Input
					type="number"
					min={0}
					max={150}
					step={1}
					value={form.patientAge}
					onChange={(e) => {
						const val = e.target.value.replace(/[^0-9]/g, "");
						setForm((f) => ({ ...f, patientAge: val }));
					}}
					placeholder="Age"
					className="w-16 text-center text-xs"
				/>
			</TableCell>

			{/* Sex */}
			<TableCell>
				<Select
					value={form.patientSex}
					onValueChange={(val) => setForm((f) => ({ ...f, patientSex: val }))}
				>
					<SelectTrigger className="w-20 text-xs">
						<SelectValue placeholder="Sex" />
					</SelectTrigger>
					<SelectContent>
						{SEX_OPTIONS.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* UHID */}
			<TableCell>
				<Input
					value={form.uhid}
					onChange={(e) => setForm((f) => ({ ...f, uhid: e.target.value }))}
					placeholder="UHID"
					className="w-24 text-xs"
				/>
			</TableCell>

			{/* Complete Diagnosis */}
			<TableCell>
				<MarkdownEditor
					value={form.completeDiagnosis}
					onChange={(val) => setForm((f) => ({ ...f, completeDiagnosis: val }))}
					placeholder="Enter diagnosis…"
					minRows={2}
					compact
				/>
			</TableCell>

			{/* Competency Level (CBD/S/O/MS/MI) */}
			<TableCell>
				<Select
					value={form.competencyLevel}
					onValueChange={(val) =>
						setForm((f) => ({ ...f, competencyLevel: val }))
					}
				>
					<SelectTrigger className="w-36 text-xs">
						<SelectValue placeholder="Select…" />
					</SelectTrigger>
					<SelectContent>
						{COMPETENCY_LEVEL_OPTIONS.map((cl) => (
							<SelectItem key={cl.value} value={cl.value}>
								{cl.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* Faculty Sign (searchable dropdown) */}
			<TableCell>
				<Popover open={facultyPickerOpen} onOpenChange={setFacultyPickerOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							className="w-full justify-between text-xs"
						>
							{form.facultyId ?
								getFacultyName(form.facultyId)
							:	"Select faculty…"}
							<ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-56 p-0" align="start">
						<Command>
							<CommandInput placeholder="Search faculty…" />
							<CommandList>
								<CommandEmpty>No faculty found.</CommandEmpty>
								<CommandGroup>
									{facultyList.map((f) => (
										<CommandItem
											key={f.id}
											value={`${f.firstName} ${f.lastName}`}
											onSelect={() => {
												setForm((prev) => ({ ...prev, facultyId: f.id }));
												setFacultyPickerOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													form.facultyId === f.id ? "opacity-100" : "opacity-0",
												)}
											/>
											Dr. {f.firstName} {f.lastName}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</TableCell>

			{/* Total Case Tally */}
			<TableCell className="text-center">
				<Input
					type="number"
					min={0}
					value={form.totalCaseTally}
					onChange={(e) =>
						setForm((f) => ({
							...f,
							totalCaseTally: parseInt(e.target.value) || 0,
						}))
					}
					className="w-20 mx-auto text-center text-xs"
				/>
			</TableCell>

			{/* Status */}
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
			</TableCell>

			{/* Actions */}
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
						title="Save"
						onClick={onSave}
						disabled={isPending}
					>
						{isPending ?
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						:	<Save className="h-3.5 w-3.5" />}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground"
						title="Cancel"
						onClick={onCancel}
						disabled={isPending}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

// ======================== READ ROW ========================

function ReadRow({
	entry,
	onEdit,
	onSubmit,
	onDelete,
	isPending,
	getFacultyName,
	competencyLabel,
}: {
	entry: CaseManagementEntry;
	onEdit: () => void;
	onSubmit: () => void;
	onDelete: () => void;
	isPending: boolean;
	getFacultyName: (id: string | null) => string;
	competencyLabel: (val: string | null) => string;
}) {
	const isEditable = entry.status !== "SUBMITTED" && entry.status !== "SIGNED";

	return (
		<TableRow
			className={cn(
				"transition-colors",
				isEditable && "cursor-pointer hover:bg-muted/30",
				entry.status === "SIGNED" && "bg-green-50/50",
				entry.status === "NEEDS_REVISION" && "bg-orange-50/50",
				entry.status === "SUBMITTED" && "bg-amber-50/30",
			)}
			onClick={isEditable ? onEdit : undefined}
		>
			{/* Sl. No */}
			<TableCell className="text-center font-medium text-muted-foreground">
				{entry.slNo}
			</TableCell>

			{/* Case Category (sub-category) */}
			<TableCell className="font-medium text-sm">
				{entry.caseSubCategory}
			</TableCell>

			{/* Date */}
			<TableCell className="text-sm">
				{entry.date ?
					new Date(entry.date).toLocaleDateString("en-IN", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					})
				:	<span className="text-muted-foreground italic">—</span>}
			</TableCell>

			{/* Patient Name */}
			<TableCell className="text-sm">
				{entry.patientName || (
					<span className="text-muted-foreground italic">—</span>
				)}
			</TableCell>

			{/* Age */}
			<TableCell className="text-center text-sm">
				{entry.patientAge != null ?
					entry.patientAge
				:	<span className="text-muted-foreground">—</span>}
			</TableCell>

			{/* Sex */}
			<TableCell className="text-sm">
				{entry.patientSex || <span className="text-muted-foreground">—</span>}
			</TableCell>

			{/* UHID */}
			<TableCell className="text-sm">
				{entry.uhid || <span className="text-muted-foreground italic">—</span>}
			</TableCell>

			{/* Complete Diagnosis */}
			<TableCell className="text-sm max-w-40">
				{entry.completeDiagnosis ?
					<div
						className="line-clamp-2 prose prose-sm max-w-none"
						dangerouslySetInnerHTML={{
							__html: renderMarkdown(entry.completeDiagnosis),
						}}
					/>
				:	<span className="text-muted-foreground italic">Not filled</span>}
			</TableCell>

			{/* Competency Level */}
			<TableCell>
				{entry.competencyLevel ?
					<Badge variant="outline" className="text-xs">
						{competencyLabel(entry.competencyLevel)}
					</Badge>
				:	<span className="text-muted-foreground">—</span>}
			</TableCell>

			{/* Faculty Sign */}
			<TableCell className="text-sm">
				{getFacultyName(entry.facultyId)}
			</TableCell>

			{/* Total Case Tally */}
			<TableCell className="text-center font-mono">
				{entry.totalCaseTally}
			</TableCell>

			{/* Status */}
			<TableCell className="text-center">
				<div>
					<StatusBadge status={entry.status as EntryStatus} size="sm" />
					{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1 mt-1 text-[10px] text-red-600 cursor-help">
										<AlertTriangle className="h-3 w-3 shrink-0" />
										<span className="line-clamp-1">Revision needed</span>
									</div>
								</TooltipTrigger>
								<TooltipContent side="top" className="max-w-sm">
									<div
										className="prose prose-sm max-w-none text-sm"
										dangerouslySetInnerHTML={{
											__html: renderMarkdown(entry.facultyRemark),
										}}
									/>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</TableCell>

			{/* Actions */}
			<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-center gap-0.5">
					{entry.status === "DRAFT" && entry.competencyLevel && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-hospital-primary"
							title="Submit for review"
							onClick={onSubmit}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							:	<Send className="h-3.5 w-3.5" />}
						</Button>
					)}
					{entry.status === "DRAFT" && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
							title="Delete entry"
							onClick={onDelete}
							disabled={isPending}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}
