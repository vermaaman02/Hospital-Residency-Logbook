/**
 * @module JournalClubTable
 * @description Inline-editing table for Journal Club Discussion / Critical Appraisal.
 * Same inline cell-editing pattern as SeminarDiscussionTable / CasePresentationTable.
 * Click any row to edit. "Insert New Row" to add unlimited entries.
 * Columns: Sl.No (auto), Date (datepicker), Journal Article (MD editor),
 * Type of Study (MD editor), Faculty Remark (MD editor, disabled),
 * Faculty Sign (searchable dropdown).
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 */

"use client";

import {
	useState,
	useTransition,
	useCallback,
	useMemo,
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
import {
	MarkdownEditor,
	renderMarkdown,
} from "@/components/shared/MarkdownEditor";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	CalendarIcon,
	Loader2,
	Trash2,
	Send,
	Check,
	X,
	Plus,
	FileText,
	ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	createJournalClub,
	updateJournalClub,
	submitJournalClub,
	deleteJournalClub,
} from "@/actions/journal-clubs";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface JournalClubData {
	id: string;
	slNo: number;
	date: Date | string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	facultyId: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

interface JournalClubTableProps {
	entries: JournalClubData[];
	facultyList: FacultyOption[];
}

interface InlineForm {
	date: Date | undefined;
	journalArticle: string;
	typeOfStudy: string;
	facultyRemark: string;
	facultyId: string;
}

const emptyForm: InlineForm = {
	date: undefined,
	journalArticle: "",
	typeOfStudy: "",
	facultyRemark: "",
	facultyId: "",
};

// ======================== MAIN COMPONENT ========================

export function JournalClubTable({
	entries,
	facultyList,
}: JournalClubTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [form, setForm] = useState<InlineForm>(emptyForm);
	const [facultyPickerOpen, setFacultyPickerOpen] = useState(false);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Clear validation errors when form changes
	useEffect(() => {
		if (Object.keys(validationErrors).length > 0) {
			setValidationErrors({});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form]);

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

	// ---- Editing ----

	function startEditing(entry: JournalClubData) {
		if (entry.status === "SUBMITTED" || entry.status === "SIGNED") return;
		setIsAddingNew(false);
		setEditingId(entry.id);
		setForm({
			date: entry.date ? new Date(entry.date) : undefined,
			journalArticle: entry.journalArticle ?? "",
			typeOfStudy: entry.typeOfStudy ?? "",
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

	function validateForm(): Record<string, string> {
		const errors: Record<string, string> = {};
		if (!form.date) errors.date = "Date is required";
		if (!form.journalArticle.trim())
			errors.journalArticle = "Journal article is required";
		if (!form.typeOfStudy.trim())
			errors.typeOfStudy = "Type of study is required";
		if (!form.facultyId) errors.facultyId = "Faculty is required";
		return errors;
	}

	function handleSave(existingId?: string) {
		const errors = validateForm();
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			toast.error("Please fill all required fields");
			return;
		}

		const data = {
			date: form.date ?? null,
			journalArticle: form.journalArticle || null,
			typeOfStudy: form.typeOfStudy || null,
			facultyRemark: form.facultyRemark || null,
			facultyId: form.facultyId || null,
		};

		startTransition(async () => {
			try {
				if (existingId) {
					await updateJournalClub(existingId, data);
					toast.success("Updated");
				} else {
					await createJournalClub(data);
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
		const entry = entries.find((e) => e.id === id);
		if (entry) {
			const missing: string[] = [];
			if (!entry.date) missing.push("Date");
			if (!entry.journalArticle) missing.push("Journal Article");
			if (!entry.typeOfStudy) missing.push("Type of Study");
			if (!entry.facultyId) missing.push("Faculty Sign");
			if (missing.length > 0) {
				toast.error(`Cannot submit — fill: ${missing.join(", ")}`);
				return;
			}
		}
		startTransition(async () => {
			try {
				await submitJournalClub(id);
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
				await deleteJournalClub(id);
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
			journalArticle: e.journalArticle,
			typeOfStudy: e.typeOfStudy,
			facultyRemark: e.facultyRemark,
			status: e.status,
		}));
	}, [entries]);

	const handleExportPdf = useCallback(async () => {
		const { exportJournalClubsToPdf } = await import("@/lib/export/export-pdf");
		await exportJournalClubsToPdf(buildStudentExportData(), "Student");
	}, [buildStudentExportData]);

	const handleExportExcel = useCallback(async () => {
		const { exportJournalClubsToExcel } =
			await import("@/lib/export/export-excel");
		exportJournalClubsToExcel(buildStudentExportData(), "Student");
	}, [buildStudentExportData]);

	// ======================== RENDER ========================

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-hospital-primary" />
							<div>
								<CardTitle className="text-lg">
									JOURNAL CLUB DISCUSSION / CRITICAL APPRAISAL OF LITERATURE
									PRESENTED
								</CardTitle>
								<CardDescription>
									Click any row to edit. Target: 10 entries.
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
				<CardContent className="px-0 sm:px-6 pb-4 sm:pb-6 pt-0">
					<div className="border rounded-lg overflow-x-auto">
						<div className="min-w-225">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-16 text-center font-bold">
											Sl. No.
										</TableHead>
										<TableHead className="w-30 text-center font-bold">
											Date
										</TableHead>
										<TableHead className="min-w-48 font-bold">
											Journal Article
										</TableHead>
										<TableHead className="min-w-40 font-bold">
											Type of Study
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
													validationErrors={validationErrors}
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
											validationErrors={validationErrors}
											onSave={() => handleSave()}
											onCancel={cancelEdit}
											isNew
										/>
									)}

									{/* Empty state */}
									{entries.length === 0 && !isAddingNew && (
										<TableRow>
											<TableCell
												colSpan={8}
												className="text-center py-10 text-muted-foreground"
											>
												No entries yet. Click &quot;Insert New Row&quot; to add
												your first journal club discussion entry.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					</div>

					{/* Summary */}
					<div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground px-2 sm:px-0">
						<div>
							Total:{" "}
							<span className="font-medium text-foreground">
								{stats.total}/10
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
	validationErrors: Record<string, string>;
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
	validationErrors,
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
								validationErrors.date && "border-red-500 ring-1 ring-red-500",
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

			{/* Journal Article — MD Editor */}
			<TableCell className="pt-2">
				<div
					className={cn(
						validationErrors.journalArticle && "ring-1 ring-red-500 rounded-md",
					)}
				>
					<MarkdownEditor
						value={form.journalArticle}
						onChange={(v) => setForm((p) => ({ ...p, journalArticle: v }))}
						placeholder="Journal article title / details..."
						minRows={2}
						compact
						spellCheck
					/>
				</div>
			</TableCell>

			{/* Type of Study — MD Editor */}
			<TableCell className="pt-2">
				<div
					className={cn(
						validationErrors.typeOfStudy && "ring-1 ring-red-500 rounded-md",
					)}
				>
					<MarkdownEditor
						value={form.typeOfStudy}
						onChange={(v) => setForm((p) => ({ ...p, typeOfStudy: v }))}
						placeholder="Type of study..."
						minRows={2}
						compact
						spellCheck
					/>
				</div>
			</TableCell>

			{/* Faculty Remark — MD Editor (disabled for student) */}
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
							className={cn(
								"h-8 text-xs w-36 justify-between",
								validationErrors.facultyId &&
									"border-red-500 ring-1 ring-red-500",
							)}
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
	entry: JournalClubData;
	getFacultyName: (id: string | null) => string;
	canEdit: boolean;
	isPending: boolean;
	onClick: () => void;
	onSubmit?: () => void;
	onDelete?: () => void;
}

function ReadRow({
	entry,
	getFacultyName,
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
			<TableCell className="text-sm max-w-48">
				{entry.journalArticle ?
					<span
						dangerouslySetInnerHTML={{
							__html: renderMarkdown(entry.journalArticle),
						}}
					/>
				:	"—"}
			</TableCell>
			<TableCell className="text-sm max-w-40">
				{entry.typeOfStudy ?
					<span
						dangerouslySetInnerHTML={{
							__html: renderMarkdown(entry.typeOfStudy),
						}}
					/>
				:	"—"}
			</TableCell>
			<TableCell className="text-sm max-w-36">
				{entry.facultyRemark ?
					<span
						dangerouslySetInnerHTML={{
							__html: renderMarkdown(entry.facultyRemark),
						}}
					/>
				:	"—"}
			</TableCell>
			<TableCell className="text-center text-sm">
				{getFacultyName(entry.facultyId)}
			</TableCell>
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
				{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
					<div className="mt-1 text-[10px] text-muted-foreground text-left">
						<span className="font-medium">Reason:</span>{" "}
						<span
							dangerouslySetInnerHTML={{
								__html: renderMarkdown(entry.facultyRemark),
							}}
						/>
					</div>
				)}
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
