/**
 * @module AttendanceClient
 * @description Weekly attendance with inline cell editing.
 * Each card = one week. Click a row to edit day entries inline.
 * Follows the same inline editing pattern as RotationPostingsTab.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 * @see RotationPostingsTab.tsx — inline editing reference
 */

"use client";

import React, { useState, useTransition, useCallback, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
	CalendarIcon,
	Loader2,
	Plus,
	Trash2,
	Send,
	Check,
	X,
	ClipboardList,
	AlertTriangle,
	Search,
	Undo2,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ALL_ROTATION_NAMES } from "@/lib/constants/rotation-postings";
import {
	createAttendanceSheet,
	updateAttendanceSheet,
	submitAttendanceSheet,
	deleteAttendanceSheet,
	retractAttendanceSheet,
} from "@/actions/attendance";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

const DAYS_ORDERED = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
	MONDAY: "Monday",
	TUESDAY: "Tuesday",
	WEDNESDAY: "Wednesday",
	THURSDAY: "Thursday",
	FRIDAY: "Friday",
	SATURDAY: "Saturday",
	SUNDAY: "Sunday",
};

const ATTENDANCE_OPTIONS = [
	{ value: "Present", label: "Present" },
	{ value: "Absent", label: "Absent" },
	{ value: "Leave", label: "Leave" },
	{ value: "Holiday", label: "Holiday" },
];

interface AttendanceEntryData {
	id: string;
	attendanceSheetId: string;
	date: string | null;
	day: string;
	presentAbsent: string | null;
	hodName: string | null;
}

interface AttendanceSheetData {
	id: string;
	userId: string;
	weekStartDate: string;
	weekEndDate: string;
	batch: string | null;
	postedDepartment: string | null;
	status: string;
	facultyRemark: string | null;
	entries: AttendanceEntryData[];
	createdAt: string;
	updatedAt: string;
}

interface DayForm {
	date: Date | undefined;
	presentAbsent: string;
	hodName: string;
}

interface SheetHeaderForm {
	weekStartDate: Date | undefined;
	weekEndDate: Date | undefined;
	batch: string;
	postedDepartment: string;
}

interface AttendanceClientProps {
	sheets: AttendanceSheetData[];
	userBatch: string;
	facultyNames: string[];
}

// ======================== MAIN COMPONENT ========================

export function AttendanceClient({
	sheets,
	userBatch,
	facultyNames,
}: AttendanceClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// UI state
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [showNewSheet, setShowNewSheet] = useState(false);
	const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	// Form state
	const [headerForm, setHeaderForm] = useState<SheetHeaderForm>({
		weekStartDate: undefined,
		weekEndDate: undefined,
		batch: userBatch,
		postedDepartment: "",
	});
	const [dayForms, setDayForms] = useState<DayForm[]>(
		DAYS_ORDERED.map(() => ({
			date: undefined,
			presentAbsent: "",
			hodName: "",
		})),
	);

	// Filter sheets
	const filteredSheets = useMemo(() => {
		let result = sheets;
		if (statusFilter !== "ALL") {
			result = result.filter((s) => s.status === statusFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(s) =>
					(s.postedDepartment ?? "").toLowerCase().includes(q) ||
					(s.batch ?? "").toLowerCase().includes(q) ||
					format(new Date(s.weekStartDate), "dd/MM/yyyy").includes(q),
			);
		}
		return result;
	}, [sheets, statusFilter, searchQuery]);

	// Stats
	const stats = useMemo(
		() => ({
			total: sheets.length,
			draft: sheets.filter((s) => s.status === "DRAFT").length,
			submitted: sheets.filter((s) => s.status === "SUBMITTED").length,
			signed: sheets.filter((s) => s.status === "SIGNED").length,
			revision: sheets.filter((s) => s.status === "NEEDS_REVISION").length,
		}),
		[sheets],
	);

	// ======================== HELPERS ========================

	const resetForms = useCallback(() => {
		setHeaderForm({
			weekStartDate: undefined,
			weekEndDate: undefined,
			batch: userBatch,
			postedDepartment: "",
		});
		setDayForms(
			DAYS_ORDERED.map(() => ({
				date: undefined,
				presentAbsent: "",
				hodName: "",
			})),
		);
		setEditingSheetId(null);
		setShowNewSheet(false);
	}, [userBatch]);

	const populateFormsFromSheet = useCallback(
		(sheet: AttendanceSheetData) => {
			setHeaderForm({
				weekStartDate: new Date(sheet.weekStartDate),
				weekEndDate: new Date(sheet.weekEndDate),
				batch: sheet.batch ?? userBatch,
				postedDepartment: sheet.postedDepartment ?? "",
			});
			const arr: DayForm[] = DAYS_ORDERED.map((day) => {
				const entry = sheet.entries.find((e) => e.day === day);
				return {
					date: entry?.date ? new Date(entry.date) : undefined,
					presentAbsent: entry?.presentAbsent ?? "",
					hodName: entry?.hodName ?? "",
				};
			});
			setDayForms(arr);
		},
		[userBatch],
	);

	const autoFillDates = useCallback((weekStart: Date) => {
		const end = endOfWeek(weekStart, { weekStartsOn: 1 });
		setHeaderForm((prev) => ({
			...prev,
			weekStartDate: weekStart,
			weekEndDate: end,
		}));
		setDayForms((prev) =>
			prev.map((d, i) => ({
				...d,
				date: addDays(weekStart, i),
			})),
		);
	}, []);

	const buildPayload = useCallback(() => {
		if (!headerForm.weekStartDate || !headerForm.weekEndDate) {
			toast.error("Please select the week start date");
			return null;
		}
		return {
			weekStartDate: headerForm.weekStartDate,
			weekEndDate: headerForm.weekEndDate,
			batch: headerForm.batch || undefined,
			postedDepartment: headerForm.postedDepartment || undefined,
			entries: DAYS_ORDERED.map((day, i) => ({
				day,
				date: dayForms[i].date,
				presentAbsent: dayForms[i].presentAbsent || undefined,
				hodName: dayForms[i].hodName || undefined,
			})),
		};
	}, [headerForm, dayForms]);

	// ======================== ACTIONS ========================

	function handleStartNew() {
		resetForms();
		const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
		autoFillDates(monday);
		setShowNewSheet(true);
	}

	function startEditing(sheet: AttendanceSheetData) {
		if (sheet.status === "SUBMITTED" || sheet.status === "SIGNED") return;
		populateFormsFromSheet(sheet);
		setEditingSheetId(sheet.id);
	}

	function handleSave(existingId?: string) {
		const payload = buildPayload();
		if (!payload) return;

		startTransition(async () => {
			try {
				if (existingId) {
					await updateAttendanceSheet(existingId, payload);
					toast.success("Attendance sheet updated");
				} else {
					await createAttendanceSheet(payload);
					toast.success("Attendance sheet created");
				}
				resetForms();
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save");
			}
		});
	}

	function handleSubmit(sheetId: string) {
		startTransition(async () => {
			try {
				await submitAttendanceSheet(sheetId);
				toast.success("Submitted for review");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	function handleRetract(sheetId: string) {
		startTransition(async () => {
			try {
				await retractAttendanceSheet(sheetId);
				toast.success("Submission retracted — you can now edit");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to retract",
				);
			}
		});
	}

	function handleDelete() {
		if (!deleteTarget) return;
		startTransition(async () => {
			try {
				await deleteAttendanceSheet(deleteTarget);
				toast.success("Sheet deleted");
				setDeleteTarget(null);
				resetForms();
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to delete",
				);
			}
		});
	}

	// ======================== EXPORT ========================

	async function handleExportPdf() {
		const { exportAttendancePdf } = await import("@/lib/export/export-pdf");
		exportAttendancePdf(sheets);
	}

	async function handleExportExcel() {
		const { exportAttendanceExcel } = await import("@/lib/export/export-excel");
		exportAttendanceExcel(sheets);
	}

	// ======================== RENDER ========================

	return (
		<div className="space-y-6">
			{/* Stats Row */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
				<MiniStat label="Total" value={stats.total} />
				<MiniStat label="Draft" value={stats.draft} color="text-gray-600" />
				<MiniStat
					label="Submitted"
					value={stats.submitted}
					color="text-amber-600"
				/>
				<MiniStat label="Signed" value={stats.signed} color="text-green-600" />
				<MiniStat
					label="Revision"
					value={stats.revision}
					color="text-red-600"
				/>
			</div>

			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
				<div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
					<div className="relative flex-1 sm:max-w-xs">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by department, batch, date..."
							className="pl-8 h-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-36 h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Status</SelectItem>
							<SelectItem value="DRAFT">Draft</SelectItem>
							<SelectItem value="SUBMITTED">Submitted</SelectItem>
							<SelectItem value="SIGNED">Signed</SelectItem>
							<SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex gap-2">
					<ExportDropdown
						onExportPdf={handleExportPdf}
						onExportExcel={handleExportExcel}
					/>
					<Button size="sm" onClick={handleStartNew}>
						<Plus className="h-4 w-4 mr-1" /> New Week
					</Button>
				</div>
			</div>

			{/* New Sheet Form */}
			{showNewSheet && (
				<SheetCard
					isNew
					headerForm={headerForm}
					setHeaderForm={setHeaderForm}
					dayForms={dayForms}
					setDayForms={setDayForms}
					isPending={isPending}
					onSave={() => handleSave()}
					onCancel={resetForms}
					onAutoFillDates={autoFillDates}
					facultyNames={facultyNames}
				/>
			)}

			{/* Existing Sheets */}
			{filteredSheets.length === 0 && !showNewSheet && (
				<Card>
					<CardContent className="py-12 text-center text-muted-foreground">
						<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
						<p className="text-sm">No attendance sheets found.</p>
						<p className="text-xs mt-1">
							Click &quot;New Week&quot; to add your first weekly attendance.
						</p>
					</CardContent>
				</Card>
			)}

			{filteredSheets.map((sheet) => {
				const isEditing = editingSheetId === sheet.id;
				const canEdit =
					sheet.status === "DRAFT" || sheet.status === "NEEDS_REVISION";
				const showRemark =
					sheet.status === "NEEDS_REVISION" && sheet.facultyRemark;

				if (isEditing) {
					return (
						<div key={sheet.id}>
							{showRemark && <RevisionBanner remark={sheet.facultyRemark!} />}
							<SheetCard
								isNew={false}
								headerForm={headerForm}
								setHeaderForm={setHeaderForm}
								dayForms={dayForms}
								setDayForms={setDayForms}
								isPending={isPending}
								onSave={() => handleSave(sheet.id)}
								onCancel={resetForms}
								onAutoFillDates={autoFillDates}
								onDelete={() => setDeleteTarget(sheet.id)}
								sheetStatus={sheet.status as EntryStatus}
								facultyNames={facultyNames}
							/>
						</div>
					);
				}

				return (
					<ReadOnlySheet
						key={sheet.id}
						sheet={sheet}
						canEdit={canEdit}
						isPending={isPending}
						onEdit={() => startEditing(sheet)}
						onSubmit={() => handleSubmit(sheet.id)}
						onRetract={
							sheet.status === "SUBMITTED" ?
								() => handleRetract(sheet.id)
							:	undefined
						}
						onDelete={
							sheet.status === "DRAFT" ?
								() => setDeleteTarget(sheet.id)
							:	undefined
						}
					/>
				);
			})}

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Attendance Sheet</DialogTitle>
						<DialogDescription>
							This will permanently delete this weekly attendance sheet and all
							its entries. This action cannot be undone.
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
							onClick={handleDelete}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	null}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== MINI STAT ========================

function MiniStat({
	label,
	value,
	color = "text-foreground",
}: {
	label: string;
	value: number;
	color?: string;
}) {
	return (
		<div className="bg-white border rounded-lg px-4 py-3 text-center">
			<div className={cn("text-2xl font-bold", color)}>{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}

// ======================== REVISION BANNER ========================

function RevisionBanner({ remark }: { remark: string }) {
	return (
		<div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
			<AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
			<div>
				<p className="text-sm font-semibold text-amber-800">
					Revision Required
				</p>
				<p className="text-sm text-amber-700 mt-0.5">{remark}</p>
			</div>
		</div>
	);
}

// ======================== SHEET CARD (EDITABLE) ========================

interface SheetCardProps {
	isNew: boolean;
	headerForm: SheetHeaderForm;
	setHeaderForm: React.Dispatch<React.SetStateAction<SheetHeaderForm>>;
	dayForms: DayForm[];
	setDayForms: React.Dispatch<React.SetStateAction<DayForm[]>>;
	isPending: boolean;
	onSave: () => void;
	onCancel: () => void;
	onAutoFillDates: (weekStart: Date) => void;
	onDelete?: () => void;
	sheetStatus?: EntryStatus;
	facultyNames: string[];
}

const HOD_OTHER_VALUE = "__OTHER__";

function SheetCard({
	isNew,
	headerForm,
	setHeaderForm,
	dayForms,
	setDayForms,
	isPending,
	onSave,
	onCancel,
	onAutoFillDates,
	onDelete,
	sheetStatus,
	facultyNames,
}: SheetCardProps) {
	// Track which rows have "Other" selected for custom HoD name input
	const [otherHodFlags, setOtherHodFlags] = useState<boolean[]>(
		DAYS_ORDERED.map((_, i) => {
			const name = dayForms[i]?.hodName ?? "";
			// If name is set and not in the faculty list, show custom input
			return name !== "" && !facultyNames.includes(name);
		}),
	);

	function updateDay(index: number, field: keyof DayForm, value: unknown) {
		setDayForms((prev) => {
			const copy = [...prev];
			copy[index] = { ...copy[index], [field]: value };
			return copy;
		});
	}

	function handleHodSelect(index: number, value: string) {
		if (value === HOD_OTHER_VALUE) {
			// Mark this row as "Other" — clear hodName so they type it
			setOtherHodFlags((prev) => {
				const copy = [...prev];
				copy[index] = true;
				return copy;
			});
			updateDay(index, "hodName", "");
		} else {
			setOtherHodFlags((prev) => {
				const copy = [...prev];
				copy[index] = false;
				return copy;
			});
			updateDay(index, "hodName", value === "none" ? "" : value);
		}
	}

	return (
		<Card className="ring-2 ring-blue-200 bg-blue-50/30">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ClipboardList className="h-5 w-5 text-hospital-primary" />
						<CardTitle className="text-lg">
							{isNew ? "New Attendance Sheet" : "Editing Attendance Sheet"}
						</CardTitle>
						{sheetStatus && <StatusBadge status={sheetStatus} size="sm" />}
					</div>
					<div className="flex gap-1">
						<Button
							size="sm"
							variant="ghost"
							onClick={onCancel}
							disabled={isPending}
						>
							<X className="h-4 w-4 mr-1" /> Cancel
						</Button>
						{onDelete && (
							<Button
								size="sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								onClick={onDelete}
								disabled={isPending}
							>
								<Trash2 className="h-4 w-4 mr-1" /> Delete
							</Button>
						)}
						<Button size="sm" onClick={onSave} disabled={isPending}>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							:	<Check className="h-4 w-4 mr-1" />}
							Save
						</Button>
					</div>
				</div>
				<CardDescription>
					Fill in the week dates, posted department, and daily attendance.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Header Fields */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
					{/* Week Start */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1 block">
							Week Start (Monday)
						</label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full h-9 justify-start text-sm",
										!headerForm.weekStartDate && "text-muted-foreground",
									)}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{headerForm.weekStartDate ?
										format(headerForm.weekStartDate, "dd/MM/yyyy")
									:	"Select Monday"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={headerForm.weekStartDate}
									onSelect={(d) => {
										if (d) onAutoFillDates(d);
									}}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* Week End */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1 block">
							Week End (Sunday)
						</label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full h-9 justify-start text-sm",
										!headerForm.weekEndDate && "text-muted-foreground",
									)}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{headerForm.weekEndDate ?
										format(headerForm.weekEndDate, "dd/MM/yyyy")
									:	"Auto-filled"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={headerForm.weekEndDate}
									onSelect={(d) =>
										setHeaderForm((prev) => ({ ...prev, weekEndDate: d }))
									}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* Batch */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1 block">
							Batch
						</label>
						<Input
							className="h-9"
							placeholder="e.g., July 2023"
							value={headerForm.batch}
							onChange={(e) =>
								setHeaderForm((prev) => ({ ...prev, batch: e.target.value }))
							}
						/>
					</div>

					{/* Posted Department */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1 block">
							Posted Department
						</label>
						<Select
							value={headerForm.postedDepartment || "none"}
							onValueChange={(v) =>
								setHeaderForm((prev) => ({
									...prev,
									postedDepartment: v === "none" ? "" : v,
								}))
							}
						>
							<SelectTrigger className="h-9">
								<SelectValue placeholder="Department" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{ALL_ROTATION_NAMES.map((name) => (
									<SelectItem key={name} value={name}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Day Entries Table — All rows editable at once */}
				<div className="border rounded-lg overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead className="w-12 text-center font-bold">#</TableHead>
								<TableHead className="w-28 font-bold">Day</TableHead>
								<TableHead className="w-32 text-center font-bold">
									Date
								</TableHead>
								<TableHead className="w-36 text-center font-bold">
									Present / Absent
								</TableHead>
								<TableHead className="font-bold">
									Name of HoD / Consultant
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{DAYS_ORDERED.map((day, index) => {
								const form = dayForms[index];
								const isOther = otherHodFlags[index];
								const dropdownValue =
									isOther ? HOD_OTHER_VALUE
									: form.hodName && facultyNames.includes(form.hodName) ?
										form.hodName
									: form.hodName ? HOD_OTHER_VALUE
									: "none";

								return (
									<TableRow key={day} className="bg-blue-50/30">
										<TableCell className="text-center font-medium">
											{index + 1}
										</TableCell>
										<TableCell className="font-medium text-hospital-primary">
											{DAY_LABELS[day]}
										</TableCell>
										<TableCell className="text-center">
											<Popover>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														className={cn(
															"h-8 text-xs w-28",
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
														onSelect={(d) => updateDay(index, "date", d)}
														initialFocus
													/>
												</PopoverContent>
											</Popover>
										</TableCell>
										<TableCell className="text-center">
											<Select
												value={form.presentAbsent || "none"}
												onValueChange={(v) =>
													updateDay(
														index,
														"presentAbsent",
														v === "none" ? "" : v,
													)
												}
											>
												<SelectTrigger className="h-8 text-xs w-32 mx-auto">
													<SelectValue placeholder="Select" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">—</SelectItem>
													{ATTENDANCE_OPTIONS.map((opt) => (
														<SelectItem key={opt.value} value={opt.value}>
															{opt.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Select
													value={dropdownValue}
													onValueChange={(v) => handleHodSelect(index, v)}
												>
													<SelectTrigger
														className={cn(
															"h-8 text-xs",
															isOther ? "w-28" : "flex-1",
														)}
													>
														<SelectValue placeholder="Select HoD" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">—</SelectItem>
														{facultyNames.map((name) => (
															<SelectItem key={name} value={name}>
																{name}
															</SelectItem>
														))}
														<SelectItem value={HOD_OTHER_VALUE}>
															Other (type name)
														</SelectItem>
													</SelectContent>
												</Select>
												{isOther && (
													<Input
														className="h-8 text-xs flex-1"
														placeholder="Enter name..."
														value={form.hodName}
														onChange={(e) =>
															updateDay(index, "hodName", e.target.value)
														}
														autoFocus
													/>
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

// ======================== READ-ONLY SHEET ========================

interface ReadOnlySheetProps {
	sheet: AttendanceSheetData;
	canEdit: boolean;
	isPending: boolean;
	onEdit: () => void;
	onSubmit: () => void;
	onRetract?: () => void;
	onDelete?: () => void;
}

function ReadOnlySheet({
	sheet,
	canEdit,
	isPending,
	onEdit,
	onSubmit,
	onRetract,
	onDelete,
}: ReadOnlySheetProps) {
	const weekLabel =
		format(new Date(sheet.weekStartDate), "dd MMM") +
		" – " +
		format(new Date(sheet.weekEndDate), "dd MMM yyyy");

	const showRemark = sheet.status === "NEEDS_REVISION" && sheet.facultyRemark;

	return (
		<div>
			{showRemark && <RevisionBanner remark={sheet.facultyRemark!} />}
			<Card
				className={cn(
					"transition-colors",
					canEdit && "cursor-pointer hover:ring-1 hover:ring-blue-200",
					sheet.status === "SIGNED" && "bg-green-50/30",
				)}
			>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-3">
							<CardTitle className="text-base">{weekLabel}</CardTitle>
							<StatusBadge status={sheet.status as EntryStatus} size="sm" />
						</div>
						<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
							{canEdit && (
								<>
									<Button
										size="sm"
										variant="outline"
										onClick={onEdit}
										disabled={isPending}
									>
										Edit
									</Button>
									<Button
										size="sm"
										variant="default"
										onClick={onSubmit}
										disabled={isPending}
									>
										<Send className="h-3.5 w-3.5 mr-1" /> Submit
									</Button>
								</>
							)}
							{onRetract && (
								<Button
									size="sm"
									variant="outline"
									className="text-amber-600 border-amber-300 hover:bg-amber-50"
									onClick={onRetract}
									disabled={isPending}
								>
									{isPending ?
										<Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
									:	<Undo2 className="h-3.5 w-3.5 mr-1" />}
									Retract
								</Button>
							)}
							{onDelete && (
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
									onClick={onDelete}
									disabled={isPending}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>
					{(sheet.postedDepartment || sheet.batch) && (
						<CardDescription>
							{sheet.postedDepartment && `Dept: ${sheet.postedDepartment}`}
							{sheet.postedDepartment && sheet.batch && " · "}
							{sheet.batch && `Batch: ${sheet.batch}`}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent className="pt-0">
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-12 text-center font-bold">
										#
									</TableHead>
									<TableHead className="w-28 font-bold">Day</TableHead>
									<TableHead className="w-32 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="w-36 text-center font-bold">
										Present / Absent
									</TableHead>
									<TableHead className="font-bold">
										Name of HoD / Consultant
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{DAYS_ORDERED.map((day, index) => {
									const entry = sheet.entries.find((e) => e.day === day);
									return (
										<TableRow
											key={day}
											className={cn(
												canEdit && "cursor-pointer hover:bg-blue-50/40",
											)}
											onClick={canEdit ? onEdit : undefined}
										>
											<TableCell className="text-center font-medium text-sm">
												{index + 1}
											</TableCell>
											<TableCell className="font-medium text-sm">
												{DAY_LABELS[day]}
											</TableCell>
											<TableCell className="text-center text-sm">
												{entry?.date ?
													format(new Date(entry.date), "dd/MM/yy")
												:	"—"}
											</TableCell>
											<TableCell className="text-center text-sm">
												{entry?.presentAbsent ?
													<span
														className={cn(
															"px-2 py-0.5 rounded text-xs font-medium",
															entry.presentAbsent === "Present" &&
																"bg-green-100 text-green-700",
															entry.presentAbsent === "Absent" &&
																"bg-red-100 text-red-700",
															entry.presentAbsent === "Leave" &&
																"bg-amber-100 text-amber-700",
															entry.presentAbsent === "Holiday" &&
																"bg-blue-100 text-blue-700",
														)}
													>
														{entry.presentAbsent}
													</span>
												:	"—"}
											</TableCell>
											<TableCell className="text-sm">
												{entry?.hodName || "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
