/**
 * @module CasePresentationTable
 * @description Inline-editing table for Academic Case Presentation and Discussion.
 * Click any row to edit. "Insert New Row" to add unlimited entries.
 * Columns: Sl.No (auto), Date (datepicker), Patient Name, Age, Sex (dropdown),
 * UHID, Complete Diagnosis (MD editor), Category (dropdown),
 * Faculty Remark (MD editor), Faculty Sign (searchable dropdown).
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
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
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	CalendarIcon,
	Loader2,
	Trash2,
	Send,
	Check,
	X,
	Plus,
	BookOpen,
	ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	PATIENT_CATEGORY_OPTIONS,
	SEX_OPTIONS,
} from "@/lib/constants/academic-fields";
import {
	createCasePresentation,
	updateCasePresentation,
	submitCasePresentation,
	deleteCasePresentation,
} from "@/actions/case-presentations";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface CasePresentationData {
	id: string;
	slNo: number;
	date: Date | string | null;
	patientName: string | null;
	patientAge: string | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	category: string | null;
	facultyRemark: string | null;
	facultyId: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

interface CasePresentationTableProps {
	entries: CasePresentationData[];
	facultyList: FacultyOption[];
}

interface InlineForm {
	date: Date | undefined;
	patientName: string;
	patientAge: string;
	patientSex: string;
	uhid: string;
	completeDiagnosis: string;
	category: string;
	facultyRemark: string;
	facultyId: string;
}

const emptyForm: InlineForm = {
	date: undefined,
	patientName: "",
	patientAge: "",
	patientSex: "",
	uhid: "",
	completeDiagnosis: "",
	category: "",
	facultyRemark: "",
	facultyId: "",
};

// ======================== MAIN COMPONENT ========================

export function CasePresentationTable({
	entries,
	facultyList,
}: CasePresentationTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [form, setForm] = useState<InlineForm>(emptyForm);
	const [facultyPickerOpen, setFacultyPickerOpen] = useState(false);

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

	const getCategoryLabel = useCallback((val: string | null) => {
		if (!val) return "—";
		return PATIENT_CATEGORY_OPTIONS.find((o) => o.value === val)?.label ?? val;
	}, []);

	// ---- Editing  ----

	function startEditing(entry: CasePresentationData) {
		if (entry.status === "SUBMITTED" || entry.status === "SIGNED") return;
		setIsAddingNew(false);
		setEditingId(entry.id);
		setForm({
			date: entry.date ? new Date(entry.date) : undefined,
			patientName: entry.patientName ?? "",
			patientAge: entry.patientAge ?? "",
			patientSex: entry.patientSex ?? "",
			uhid: entry.uhid ?? "",
			completeDiagnosis: entry.completeDiagnosis ?? "",
			category: entry.category ?? "",
			facultyRemark: entry.facultyRemark ?? "",
			facultyId: entry.facultyId ?? "",
		});
	}

	function startAddingNew() {
		setEditingId(null);
		setIsAddingNew(true);
		setForm(emptyForm);
	}

	function cancelEdit() {
		setEditingId(null);
		setIsAddingNew(false);
	}

	function handleSave(existingId?: string) {
		const data = {
			date: form.date ?? null,
			patientName: form.patientName || null,
			patientAge: form.patientAge || null,
			patientSex:
				(form.patientSex as "Male" | "Female" | "Other" | null) || null,
			uhid: form.uhid || null,
			completeDiagnosis: form.completeDiagnosis || null,
			category:
				(form.category as
					| "ADULT_NON_TRAUMA"
					| "ADULT_TRAUMA"
					| "PEDIATRIC_NON_TRAUMA"
					| "PEDIATRIC_TRAUMA"
					| "OTHER"
					| null) || null,
			facultyRemark: form.facultyRemark || null,
			facultyId: form.facultyId || null,
		};

		startTransition(async () => {
			try {
				if (existingId) {
					await updateCasePresentation(existingId, data);
					toast.success("Updated");
				} else {
					await createCasePresentation(data);
					toast.success("Row added");
				}
				setEditingId(null);
				setIsAddingNew(false);
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save");
			}
		});
	}

	function handleSubmit(id: string) {
		startTransition(async () => {
			try {
				await submitCasePresentation(id);
				toast.success("Submitted for review");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			try {
				await deleteCasePresentation(id);
				toast.success("Deleted");
				setEditingId(null);
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			}
		});
	}

	// ======================== EXPORT ========================

	const buildStudentExportData = useCallback(() => {
		return entries.map((e) => ({
			slNo: e.slNo,
			date:
				e.date ?
					typeof e.date === "string" ?
						e.date
					:	e.date.toISOString()
				:	null,
			patientName: e.patientName,
			patientAge: e.patientAge,
			patientSex: e.patientSex,
			uhid: e.uhid,
			completeDiagnosis: e.completeDiagnosis,
			category: e.category,
			facultyRemark: e.facultyRemark,
			status: e.status,
		}));
	}, [entries]);

	const handleExportPdf = useCallback(async () => {
		const { exportCasePresentationsToPdf } =
			await import("@/lib/export/export-pdf");
		await exportCasePresentationsToPdf(buildStudentExportData(), "Student");
	}, [buildStudentExportData]);

	const handleExportExcel = useCallback(async () => {
		const { exportCasePresentationsToExcel } =
			await import("@/lib/export/export-excel");
		exportCasePresentationsToExcel(buildStudentExportData(), "Student");
	}, [buildStudentExportData]);

	// ======================== RENDER ========================

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-2">
							<BookOpen className="h-5 w-5 text-hospital-primary" />
							<div>
								<CardTitle className="text-lg">
									ACADEMIC CASE PRESENTATION AND DISCUSSION
								</CardTitle>
								<CardDescription>
									Click any row to edit. Target: 20 entries.
								</CardDescription>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<ExportDropdown
								onExportPdf={handleExportPdf}
								onExportExcel={handleExportExcel}
								label="Download"
								size="sm"
							/>
							<Button
								onClick={startAddingNew}
								disabled={isPending || isAddingNew}
								size="sm"
								className="gap-1.5"
							>
								<Plus className="h-4 w-4" />
								Insert New Row
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-300">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-16 text-center font-bold">
										Sl. No.
									</TableHead>
									<TableHead className="w-30 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="w-36 font-bold">Patient Name</TableHead>
									<TableHead className="w-18 text-center font-bold">
										Age
									</TableHead>
									<TableHead className="w-22 text-center font-bold">
										Sex
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										UHID
									</TableHead>
									<TableHead className="min-w-48 font-bold">
										Complete Diagnosis
									</TableHead>
									<TableHead className="w-40 text-center font-bold">
										Category
									</TableHead>
									<TableHead className="min-w-36 font-bold">
										Faculty Remark
									</TableHead>
									<TableHead className="w-40 text-center font-bold">
										Faculty Sign
									</TableHead>
									<TableHead className="w-20 text-center font-bold">
										Status
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => {
									const isEditing = editingId === entry.id;
									const canEdit =
										entry.status === "DRAFT" ||
										entry.status === "NEEDS_REVISION";

									if (isEditing) {
										return (
											<EditRow
												key={entry.id}
												slNo={entry.slNo}
												form={form}
												setForm={setForm}
												facultyList={facultyList}
												facultyPickerOpen={facultyPickerOpen}
												setFacultyPickerOpen={setFacultyPickerOpen}
												isPending={isPending}
												onSave={() => handleSave(entry.id)}
												onCancel={cancelEdit}
												onDelete={
													entry.status === "DRAFT" ?
														() => handleDelete(entry.id)
													:	undefined
												}
											/>
										);
									}

									return (
										<ReadRow
											key={entry.id}
											entry={entry}
											getFacultyName={getFacultyName}
											getCategoryLabel={getCategoryLabel}
											canEdit={canEdit}
											isPending={isPending}
											onClick={() => canEdit && startEditing(entry)}
											onSubmit={
												canEdit ? () => handleSubmit(entry.id) : undefined
											}
											onDelete={
												entry.status === "DRAFT" ?
													() => handleDelete(entry.id)
												:	undefined
											}
										/>
									);
								})}

								{/* New Row */}
								{isAddingNew && (
									<EditRow
										slNo={entries.length + 1}
										form={form}
										setForm={setForm}
										facultyList={facultyList}
										facultyPickerOpen={facultyPickerOpen}
										setFacultyPickerOpen={setFacultyPickerOpen}
										isPending={isPending}
										onSave={() => handleSave()}
										onCancel={cancelEdit}
										isNew
									/>
								)}

								{/* Empty state */}
								{entries.length === 0 && !isAddingNew && (
									<TableRow>
										<TableCell
											colSpan={12}
											className="text-center py-10 text-muted-foreground"
										>
											No entries yet. Click &quot;Insert New Row&quot; to add
											your first case presentation.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{/* Summary */}
					<div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground px-2 sm:px-0">
						<div>
							Total:{" "}
							<span className="font-medium text-foreground">
								{stats.total}/20
							</span>
						</div>
						<div>
							Signed:{" "}
							<span className="font-medium text-green-600">{stats.signed}</span>
						</div>
						<div>
							Pending:{" "}
							<span className="font-medium text-amber-600">
								{stats.submitted}
							</span>
						</div>
						<div>
							Draft:{" "}
							<span className="font-medium text-gray-600">{stats.draft}</span>
						</div>
						{stats.needsRevision > 0 && (
							<div>
								Needs Revision:{" "}
								<span className="font-medium text-orange-600">
									{stats.needsRevision}
								</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ======================== EDIT ROW ========================

interface EditRowProps {
	slNo: number;
	form: InlineForm;
	setForm: React.Dispatch<React.SetStateAction<InlineForm>>;
	facultyList: FacultyOption[];
	facultyPickerOpen: boolean;
	setFacultyPickerOpen: (open: boolean) => void;
	isPending: boolean;
	onSave: () => void;
	onCancel: () => void;
	onDelete?: () => void;
	isNew?: boolean;
}

function EditRow({
	slNo,
	form,
	setForm,
	facultyList,
	facultyPickerOpen,
	setFacultyPickerOpen,
	isPending,
	onSave,
	onCancel,
	onDelete,
	isNew,
}: EditRowProps) {
	const selectedFaculty = facultyList.find((f) => f.id === form.facultyId);

	return (
		<TableRow
			className={cn(
				"ring-1 align-top",
				isNew ?
					"bg-green-50/60 dark:bg-green-950/20 ring-green-200 dark:ring-green-800"
				:	"bg-blue-50/60 dark:bg-blue-950/20 ring-blue-200 dark:ring-blue-800",
			)}
		>
			{/* Sl. No */}
			<TableCell className="text-center font-medium pt-3">{slNo}.</TableCell>

			{/* Date */}
			<TableCell className="text-center pt-2">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"h-8 text-sm px-2 w-28",
								!form.date && "text-muted-foreground",
							)}
						>
							<CalendarIcon className="mr-1 h-3 w-3" />
							{form.date ? format(form.date, "dd/MM/yy") : "Date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={form.date}
							onSelect={(d) => setForm((p) => ({ ...p, date: d }))}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</TableCell>

			{/* Patient Name */}
			<TableCell className="pt-2">
				<Input
					className="h-8 text-sm"
					placeholder="Name"
					value={form.patientName}
					onChange={(e) =>
						setForm((p) => ({ ...p, patientName: e.target.value }))
					}
				/>
			</TableCell>

			{/* Age */}
			<TableCell className="pt-2">
				<Input
					className="h-8 text-sm text-center w-16"
					placeholder="Age"
					value={form.patientAge}
					onChange={(e) =>
						setForm((p) => ({ ...p, patientAge: e.target.value }))
					}
				/>
			</TableCell>

			{/* Sex */}
			<TableCell className="pt-2">
				<Select
					value={form.patientSex || "none"}
					onValueChange={(v) =>
						setForm((p) => ({ ...p, patientSex: v === "none" ? "" : v }))
					}
				>
					<SelectTrigger className="h-8 text-sm w-22">
						<SelectValue placeholder="Sex" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">—</SelectItem>
						{SEX_OPTIONS.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* UHID */}
			<TableCell className="pt-2">
				<Input
					className="h-8 text-sm w-24"
					placeholder="UHID"
					value={form.uhid}
					onChange={(e) => setForm((p) => ({ ...p, uhid: e.target.value }))}
				/>
			</TableCell>

			{/* Complete Diagnosis — MD Editor */}
			<TableCell className="pt-2">
				<MarkdownEditor
					value={form.completeDiagnosis}
					onChange={(v) => setForm((p) => ({ ...p, completeDiagnosis: v }))}
					placeholder="Diagnosis..."
					minRows={2}
					compact
				/>
			</TableCell>

			{/* Category */}
			<TableCell className="pt-2">
				<Select
					value={form.category || "none"}
					onValueChange={(v) =>
						setForm((p) => ({ ...p, category: v === "none" ? "" : v }))
					}
				>
					<SelectTrigger className="h-8 text-xs w-36">
						<SelectValue placeholder="Category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">—</SelectItem>
						{PATIENT_CATEGORY_OPTIONS.map((c) => (
							<SelectItem key={c.value} value={c.value}>
								{c.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* Faculty Remark — MD Editor */}
			<TableCell className="pt-2">
				<MarkdownEditor
					value={form.facultyRemark}
					onChange={(v) => setForm((p) => ({ ...p, facultyRemark: v }))}
					placeholder="Remark..."
					minRows={2}
					compact
					disabled
				/>
			</TableCell>

			{/* Faculty Sign — Searchable Dropdown */}
			<TableCell className="pt-2">
				<Popover open={facultyPickerOpen} onOpenChange={setFacultyPickerOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							size="sm"
							className="h-8 text-xs w-36 justify-between"
						>
							<span className="truncate">
								{selectedFaculty ?
									`Dr. ${selectedFaculty.firstName} ${selectedFaculty.lastName}`
								:	"Select faculty"}
							</span>
							<ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-56 p-0" align="start">
						<Command>
							<CommandInput placeholder="Search faculty..." />
							<CommandList>
								<CommandEmpty>No faculty found.</CommandEmpty>
								<CommandGroup>
									{facultyList.map((f) => (
										<CommandItem
											key={f.id}
											value={`${f.firstName} ${f.lastName}`}
											onSelect={() => {
												setForm((p) => ({
													...p,
													facultyId: p.facultyId === f.id ? "" : f.id,
												}));
												setFacultyPickerOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-3.5 w-3.5",
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

			{/* Status */}
			<TableCell className="text-center pt-3">
				<span
					className={cn(
						"text-xs font-medium",
						isNew ? "text-green-600" : "text-blue-600",
					)}
				>
					{isNew ? "New" : "Editing"}
				</span>
			</TableCell>

			{/* Actions */}
			<TableCell className="text-center pt-2">
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
						:	<Check className="h-3.5 w-3.5" />}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						title="Cancel"
						onClick={onCancel}
						disabled={isPending}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
					{onDelete && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-destructive hover:text-destructive"
							title="Delete"
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

// ======================== READ ROW ========================

interface ReadRowProps {
	entry: CasePresentationData;
	getFacultyName: (id: string | null) => string;
	getCategoryLabel: (val: string | null) => string;
	canEdit: boolean;
	isPending: boolean;
	onClick: () => void;
	onSubmit?: () => void;
	onDelete?: () => void;
}

function ReadRow({
	entry,
	getFacultyName,
	getCategoryLabel,
	canEdit,
	isPending,
	onClick,
	onSubmit,
	onDelete,
}: ReadRowProps) {
	const isClickable = canEdit && !isPending;

	return (
		<TableRow
			className={cn(
				"transition-colors",
				entry.status === "SIGNED" && "bg-green-50/50",
				entry.status === "NEEDS_REVISION" && "bg-orange-50/50",
				isClickable && "cursor-pointer hover:bg-blue-50/40",
			)}
			onClick={isClickable ? onClick : undefined}
		>
			<TableCell className="text-center font-medium">{entry.slNo}.</TableCell>
			<TableCell className="text-center text-sm">
				{entry.date ? format(new Date(entry.date), "dd/MM/yyyy") : "—"}
			</TableCell>
			<TableCell className="text-sm">{entry.patientName || "—"}</TableCell>
			<TableCell className="text-center text-sm">
				{entry.patientAge || "—"}
			</TableCell>
			<TableCell className="text-center text-sm">
				{entry.patientSex || "—"}
			</TableCell>
			<TableCell className="text-center text-sm font-mono">
				{entry.uhid || "—"}
			</TableCell>
			<TableCell className="text-sm max-w-48 truncate">
				{entry.completeDiagnosis || "—"}
			</TableCell>
			<TableCell className="text-center text-sm">
				{getCategoryLabel(entry.category)}
			</TableCell>
			<TableCell className="text-sm max-w-36 truncate">
				{entry.facultyRemark || "—"}
			</TableCell>
			<TableCell className="text-center text-sm">
				{getFacultyName(entry.facultyId)}
			</TableCell>
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
			</TableCell>
			<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-center gap-0.5">
					{canEdit && onSubmit && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-hospital-primary hover:text-hospital-primary"
							title="Submit for review"
							onClick={onSubmit}
							disabled={isPending}
						>
							<Send className="h-3.5 w-3.5" />
						</Button>
					)}
					{entry.status === "DRAFT" && onDelete && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-destructive hover:text-destructive"
							title="Delete"
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
