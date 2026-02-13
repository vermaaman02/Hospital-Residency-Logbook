/**
 * @module RotationPostingsTab
 * @description Rotation postings with inline cell editing.
 * Click directly on any row to edit — no separate dialog needed.
 * Features: inline date pickers, auto-duration, faculty dropdown,
 * core/elective separator, notebook-style table.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING PG IN EM"
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	CalendarIcon,
	Loader2,
	Trash2,
	Send,
	Check,
	X,
	BookOpen,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	ROTATION_POSTINGS,
	type RotationPostingConfig,
} from "@/lib/constants/rotation-postings";
import {
	createRotationPosting,
	updateRotationPosting,
	submitRotationPosting,
	deleteRotationPosting,
} from "@/actions/rotation-postings";
import type {
	RotationPostingData,
	FacultyOption,
} from "../RotationPostingsClient";
import type { EntryStatus } from "@/types";

interface RotationPostingsTabProps {
	postings: RotationPostingData[];
	facultyList: FacultyOption[];
}

interface InlineForm {
	startDate: Date | undefined;
	endDate: Date | undefined;
	totalDuration: string;
	facultyId: string;
}

function calcDuration(start: Date | undefined, end: Date | undefined): string {
	if (!start || !end) return "";
	const days = differenceInDays(end, start);
	if (days < 0) return "Invalid";
	if (days < 7) return `${days} day${days !== 1 ? "s" : ""}`;
	if (days < 30) {
		const weeks = Math.floor(days / 7);
		const rem = days % 7;
		return rem > 0 ?
				`${weeks}w ${rem}d`
			:	`${weeks} week${weeks !== 1 ? "s" : ""}`;
	}
	const months = Math.floor(days / 30);
	const rem = days % 30;
	return rem > 0 ?
			`${months}m ${rem}d`
		:	`${months} month${months !== 1 ? "s" : ""}`;
}

export function RotationPostingsTab({
	postings,
	facultyList,
}: RotationPostingsTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Which rotation row (by slNo) is in edit mode
	const [editingSlNo, setEditingSlNo] = useState<number | null>(null);
	const [form, setForm] = useState<InlineForm>({
		startDate: undefined,
		endDate: undefined,
		totalDuration: "",
		facultyId: "",
	});

	const corePostings = postings.filter((p) => !p.isElective);
	const electivePostings = postings.filter((p) => p.isElective);

	const autoDuration = useMemo(
		() => calcDuration(form.startDate, form.endDate),
		[form.startDate, form.endDate],
	);

	const getFacultyName = useCallback(
		(facultyId: string | null) => {
			if (!facultyId) return "—";
			const f = facultyList.find((fl) => fl.id === facultyId);
			return f ? `${f.firstName} ${f.lastName}` : "—";
		},
		[facultyList],
	);

	function startEditing(
		config: RotationPostingConfig,
		posting?: RotationPostingData,
	) {
		if (
			posting &&
			(posting.status === "SUBMITTED" || posting.status === "SIGNED")
		) {
			return;
		}
		setEditingSlNo(config.slNo);
		setForm({
			startDate: posting?.startDate ? new Date(posting.startDate) : undefined,
			endDate: posting?.endDate ? new Date(posting.endDate) : undefined,
			totalDuration: posting?.totalDuration ?? "",
			facultyId: posting?.facultyId ?? "",
		});
	}

	function cancelEditing() {
		setEditingSlNo(null);
	}

	function handleSave(config: RotationPostingConfig, existingId?: string) {
		const data = {
			rotationName: config.name,
			isElective: config.isElective,
			startDate: form.startDate,
			endDate: form.endDate,
			totalDuration: form.totalDuration || autoDuration || undefined,
			facultyId: form.facultyId || undefined,
		};

		startTransition(async () => {
			try {
				if (existingId) {
					await updateRotationPosting(existingId, data);
					toast.success("Updated");
				} else {
					await createRotationPosting(data);
					toast.success("Saved");
				}
				setEditingSlNo(null);
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save");
			}
		});
	}

	function handleSubmit(id: string) {
		startTransition(async () => {
			try {
				await submitRotationPosting(id);
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
				await deleteRotationPosting(id);
				toast.success("Deleted");
				setEditingSlNo(null);
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			}
		});
	}

	function renderRows(
		configs: RotationPostingConfig[],
		postingsList: RotationPostingData[],
	) {
		return configs.map((config) => {
			const posting = postingsList.find((p) => p.rotationName === config.name);
			const isEditing = editingSlNo === config.slNo;
			const canEdit =
				!posting ||
				posting.status === "DRAFT" ||
				posting.status === "NEEDS_REVISION";

			if (isEditing) {
				return (
					<InlineEditRow
						key={config.slNo}
						config={config}
						form={form}
						setForm={setForm}
						autoDuration={autoDuration}
						facultyList={facultyList}
						isPending={isPending}
						onSave={() => handleSave(config, posting?.id)}
						onCancel={cancelEditing}
						onDelete={
							posting?.status === "DRAFT" ?
								() => handleDelete(posting.id)
							:	undefined
						}
					/>
				);
			}

			return (
				<ReadOnlyRow
					key={config.slNo}
					config={config}
					posting={posting}
					getFacultyName={getFacultyName}
					canEdit={canEdit}
					isPending={isPending}
					onClick={() => canEdit && startEditing(config, posting)}
					onSubmit={
						posting && canEdit ? () => handleSubmit(posting.id) : undefined
					}
					onDelete={
						posting?.status === "DRAFT" ?
							() => handleDelete(posting.id)
						:	undefined
					}
				/>
			);
		});
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-hospital-primary" />
						<CardTitle className="text-lg">
							LOG OF ROTATION POSTINGS DURING POST GRADUATION IN EM
						</CardTitle>
					</div>
					<CardDescription>
						Click on any row to fill in details. 7 core + 13 elective as per NMC
						guidelines.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-200">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-14 text-center font-bold">
										Sl. No.
									</TableHead>
									<TableHead className="font-bold min-w-44">
										Rotation Posting
									</TableHead>
									<TableHead className="w-44 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Duration
									</TableHead>
									<TableHead className="w-40 text-center font-bold">
										Faculty Signature
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Status
									</TableHead>
									<TableHead className="w-32 text-center font-bold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{renderRows(
									ROTATION_POSTINGS.filter((r) => !r.isElective),
									corePostings,
								)}

								<TableRow className="bg-muted/80 hover:bg-muted/80">
									<TableCell
										colSpan={7}
										className="py-2 px-4 font-semibold text-sm text-muted-foreground"
									>
										Electives:
									</TableCell>
								</TableRow>

								{renderRows(
									ROTATION_POSTINGS.filter((r) => r.isElective),
									electivePostings,
								)}
							</TableBody>
						</Table>
					</div>

					{/* Summary */}
					<div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground px-2 sm:px-0">
						<div>
							Core filled:{" "}
							<span className="font-medium text-foreground">
								{corePostings.length}/7
							</span>
						</div>
						<div>
							Elective filled:{" "}
							<span className="font-medium text-foreground">
								{electivePostings.length}/13
							</span>
						</div>
						<div>
							Signed:{" "}
							<span className="font-medium text-green-600">
								{postings.filter((p) => p.status === "SIGNED").length}
							</span>
						</div>
						<div>
							Pending:{" "}
							<span className="font-medium text-amber-600">
								{postings.filter((p) => p.status === "SUBMITTED").length}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ==================== INLINE EDIT ROW ====================

interface InlineEditRowProps {
	config: RotationPostingConfig;
	form: InlineForm;
	setForm: React.Dispatch<React.SetStateAction<InlineForm>>;
	autoDuration: string;
	facultyList: FacultyOption[];
	isPending: boolean;
	onSave: () => void;
	onCancel: () => void;
	onDelete?: () => void;
}

function InlineEditRow({
	config,
	form,
	setForm,
	autoDuration,
	facultyList,
	isPending,
	onSave,
	onCancel,
	onDelete,
}: InlineEditRowProps) {
	return (
		<TableRow className="bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800">
			<TableCell className="text-center font-medium">{config.slNo}.</TableCell>
			<TableCell className="font-medium text-hospital-primary">
				{config.name}
			</TableCell>

			{/* Date pickers */}
			<TableCell className="text-center">
				<div className="flex items-center gap-1 justify-center">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className={cn(
									"h-8 text-xs px-2 w-24",
									!form.startDate && "text-muted-foreground",
								)}
							>
								<CalendarIcon className="mr-1 h-3 w-3" />
								{form.startDate ? format(form.startDate, "dd/MM/yy") : "Start"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={form.startDate}
								onSelect={(d) => setForm((p) => ({ ...p, startDate: d }))}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
					<span className="text-muted-foreground text-xs">–</span>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className={cn(
									"h-8 text-xs px-2 w-24",
									!form.endDate && "text-muted-foreground",
								)}
							>
								<CalendarIcon className="mr-1 h-3 w-3" />
								{form.endDate ? format(form.endDate, "dd/MM/yy") : "End"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={form.endDate}
								onSelect={(d) => setForm((p) => ({ ...p, endDate: d }))}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
				</div>
			</TableCell>

			{/* Duration */}
			<TableCell className="text-center">
				<Input
					className="h-8 text-xs text-center w-24 mx-auto"
					placeholder={autoDuration || "Duration"}
					value={form.totalDuration}
					onChange={(e) =>
						setForm((p) => ({ ...p, totalDuration: e.target.value }))
					}
				/>
				{autoDuration && !form.totalDuration && (
					<p className="text-[10px] text-muted-foreground mt-0.5">
						{autoDuration}
					</p>
				)}
			</TableCell>

			{/* Faculty dropdown */}
			<TableCell className="text-center">
				<Select
					value={form.facultyId || "none"}
					onValueChange={(v) =>
						setForm((p) => ({ ...p, facultyId: v === "none" ? "" : v }))
					}
				>
					<SelectTrigger className="h-8 text-xs w-36 mx-auto">
						<SelectValue placeholder="Faculty" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{facultyList.map((f) => (
							<SelectItem key={f.id} value={f.id}>
								{f.firstName} {f.lastName}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* Status (editing indicator) */}
			<TableCell className="text-center">
				<span className="text-xs text-blue-600 font-medium">Editing</span>
			</TableCell>

			{/* Actions: Save / Cancel / Delete */}
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

// ==================== READ-ONLY ROW ====================

interface ReadOnlyRowProps {
	config: RotationPostingConfig;
	posting: RotationPostingData | undefined;
	getFacultyName: (id: string | null) => string;
	canEdit: boolean;
	isPending: boolean;
	onClick: () => void;
	onSubmit?: () => void;
	onDelete?: () => void;
}

function ReadOnlyRow({
	config,
	posting,
	getFacultyName,
	canEdit,
	isPending,
	onClick,
	onSubmit,
	onDelete,
}: ReadOnlyRowProps) {
	const isClickable = canEdit && !isPending;

	return (
		<TableRow
			className={cn(
				"transition-colors",
				posting ? "" : "text-muted-foreground/60",
				posting?.status === "SIGNED" && "bg-green-50/50",
				isClickable && "cursor-pointer hover:bg-blue-50/40",
			)}
			onClick={isClickable ? onClick : undefined}
		>
			<TableCell className="text-center font-medium">{config.slNo}.</TableCell>
			<TableCell className="font-medium">{config.name}</TableCell>
			<TableCell className="text-center text-sm">
				{posting?.startDate ?
					format(new Date(posting.startDate), "dd/MM/yy")
				:	"—"}
				{posting?.endDate ?
					` – ${format(new Date(posting.endDate), "dd/MM/yy")}`
				:	""}
			</TableCell>
			<TableCell className="text-center text-sm">
				{posting?.totalDuration ?? "—"}
			</TableCell>
			<TableCell className="text-center text-sm">
				{posting ? getFacultyName(posting.facultyId) : "—"}
			</TableCell>
			<TableCell className="text-center">
				{posting ?
					<StatusBadge status={posting.status as EntryStatus} size="sm" />
				:	<span className="text-xs text-muted-foreground">—</span>}
			</TableCell>
			<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
				{posting ?
					<div className="flex items-center justify-center gap-0.5">
						{(posting.status === "DRAFT" ||
							posting.status === "NEEDS_REVISION") &&
							onSubmit && (
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
						{posting.status === "DRAFT" && onDelete && (
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
				:	<span className="text-xs text-muted-foreground italic">
						Click to fill
					</span>
				}
			</TableCell>
		</TableRow>
	);
}
