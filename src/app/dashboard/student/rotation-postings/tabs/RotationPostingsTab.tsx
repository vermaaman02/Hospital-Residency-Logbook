/**
 * @module RotationPostingsTab
 * @description Rotation postings form + notebook-style display.
 * Features: Searchable department dropdown, date pickers, faculty assignment,
 * auto-duration calculation, core/elective separator, notebook-style table view.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

"use client";

import { useState, useTransition, useMemo } from "react";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	Plus,
	CalendarIcon,
	Loader2,
	Pencil,
	Trash2,
	Send,
	Search,
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

const EMPTY_FORM = {
	rotationName: "",
	startDate: undefined as Date | undefined,
	endDate: undefined as Date | undefined,
	totalDuration: "",
	facultyId: "",
};

export function RotationPostingsTab({
	postings,
	facultyList,
}: RotationPostingsTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	// Form state
	const [form, setForm] = useState(EMPTY_FORM);

	// Rotation search filter
	const [rotationSearch, setRotationSearch] = useState("");
	const filteredRotations = useMemo(() => {
		if (!rotationSearch) return ROTATION_POSTINGS;
		const q = rotationSearch.toLowerCase();
		return ROTATION_POSTINGS.filter((r) => r.name.toLowerCase().includes(q));
	}, [rotationSearch]);

	// Auto-calculate duration
	const calculatedDuration = useMemo(() => {
		if (!form.startDate || !form.endDate) return "";
		const days = differenceInDays(form.endDate, form.startDate);
		if (days < 0) return "Invalid";
		if (days < 7) return `${days} day${days !== 1 ? "s" : ""}`;
		if (days < 30) {
			const weeks = Math.floor(days / 7);
			const remainDays = days % 7;
			return remainDays > 0 ?
					`${weeks} week${weeks !== 1 ? "s" : ""} ${remainDays} day${remainDays !== 1 ? "s" : ""}`
				:	`${weeks} week${weeks !== 1 ? "s" : ""}`;
		}
		const months = Math.floor(days / 30);
		const remainDays = days % 30;
		return remainDays > 0 ?
				`${months} month${months !== 1 ? "s" : ""} ${remainDays} day${remainDays !== 1 ? "s" : ""}`
			:	`${months} month${months !== 1 ? "s" : ""}`;
	}, [form.startDate, form.endDate]);

	function openAddDialog() {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setRotationSearch("");
		setDialogOpen(true);
	}

	function openEditDialog(posting: RotationPostingData) {
		setEditingId(posting.id);
		setForm({
			rotationName: posting.rotationName,
			startDate: posting.startDate ? new Date(posting.startDate) : undefined,
			endDate: posting.endDate ? new Date(posting.endDate) : undefined,
			totalDuration: posting.totalDuration ?? "",
			facultyId: posting.facultyId ?? "",
		});
		setRotationSearch("");
		setDialogOpen(true);
	}

	function handleSave() {
		if (!form.rotationName) {
			toast.error("Please select a rotation posting");
			return;
		}

		const data = {
			rotationName: form.rotationName,
			isElective:
				ROTATION_POSTINGS.find((r) => r.name === form.rotationName)
					?.isElective ?? false,
			startDate: form.startDate,
			endDate: form.endDate,
			totalDuration: form.totalDuration || calculatedDuration || undefined,
			facultyId: form.facultyId || undefined,
		};

		startTransition(async () => {
			try {
				if (editingId) {
					await updateRotationPosting(editingId, data);
					toast.success("Rotation posting updated");
				} else {
					await createRotationPosting(data);
					toast.success("Rotation posting added");
				}
				setDialogOpen(false);
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
				toast.success("Submitted for faculty review");
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
				toast.success("Entry deleted");
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			}
		});
	}

	// Separate core and elective postings
	const corePostings = postings.filter((p) => !p.isElective);
	const electivePostings = postings.filter((p) => p.isElective);

	function getFacultyName(facultyId: string | null) {
		if (!facultyId) return "—";
		const f = facultyList.find((fl) => fl.id === facultyId);
		return f ? `${f.firstName} ${f.lastName}` : "—";
	}

	return (
		<div className="space-y-6">
			{/* Add Button */}
			<div className="flex justify-end">
				<Button onClick={openAddDialog}>
					<Plus className="h-4 w-4 mr-2" />
					Add Rotation
				</Button>
			</div>

			{/* Notebook-style Logbook Display */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-hospital-primary" />
						<CardTitle className="text-lg">
							LOG OF ROTATION POSTINGS DURING POST GRADUATION IN EM
						</CardTitle>
					</div>
					<CardDescription>
						7 core postings + 13 elective departments as per NMC guidelines
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-175">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-16 text-center font-bold">
										Sl. No.
									</TableHead>
									<TableHead className="font-bold">Rotation Posting</TableHead>
									<TableHead className="w-32 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="w-32 text-center font-bold">
										Total Duration
									</TableHead>
									<TableHead className="w-36 text-center font-bold">
										Faculty Signature
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Status
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{/* Core Postings */}
								{ROTATION_POSTINGS.filter((r) => !r.isElective).map(
									(config) => {
										const posting = corePostings.find(
											(p) => p.rotationName === config.name,
										);
										return (
											<PostingRow
												key={config.slNo}
												config={config}
												posting={posting}
												getFacultyName={getFacultyName}
												isPending={isPending}
												onEdit={openEditDialog}
												onSubmit={handleSubmit}
												onDelete={handleDelete}
											/>
										);
									},
								)}

								{/* Elective Separator */}
								<TableRow className="bg-muted/80 hover:bg-muted/80">
									<TableCell
										colSpan={7}
										className="py-2 px-4 font-semibold text-sm text-muted-foreground"
									>
										Electives:
									</TableCell>
								</TableRow>

								{/* Elective Postings */}
								{ROTATION_POSTINGS.filter((r) => r.isElective).map((config) => {
									const posting = electivePostings.find(
										(p) => p.rotationName === config.name,
									);
									return (
										<PostingRow
											key={config.slNo}
											config={config}
											posting={posting}
											getFacultyName={getFacultyName}
											isPending={isPending}
											onEdit={openEditDialog}
											onSubmit={handleSubmit}
											onDelete={handleDelete}
										/>
									);
								})}
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

			{/* Add/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingId ? "Edit Rotation Posting" : "Add Rotation Posting"}
						</DialogTitle>
						<DialogDescription>
							Fill in the rotation posting details as per your physical logbook
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Rotation Posting (searchable dropdown) */}
						<div>
							<label className="text-sm font-medium">
								Rotation Posting <span className="text-destructive">*</span>
							</label>
							<div className="mt-1.5 relative">
								<div className="relative mb-2">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search departments..."
										value={rotationSearch}
										onChange={(e) => setRotationSearch(e.target.value)}
										className="pl-9"
									/>
									{rotationSearch && (
										<Button
											variant="ghost"
											size="icon"
											className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
											onClick={() => setRotationSearch("")}
										>
											<X className="h-3 w-3" />
										</Button>
									)}
								</div>
								<div className="border rounded-md max-h-48 overflow-y-auto">
									{filteredRotations.length === 0 ?
										<div className="p-3 text-sm text-muted-foreground text-center">
											No departments found
										</div>
									:	filteredRotations.map((rotation) => (
											<button
												key={rotation.slNo}
												type="button"
												className={cn(
													"w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between",
													form.rotationName === rotation.name &&
														"bg-hospital-primary/10 text-hospital-primary font-medium",
												)}
												onClick={() =>
													setForm((prev) => ({
														...prev,
														rotationName: rotation.name,
													}))
												}
											>
												<span>
													<span className="text-muted-foreground mr-2">
														{rotation.slNo}.
													</span>
													{rotation.name}
												</span>
												<span
													className={cn(
														"text-xs px-1.5 py-0.5 rounded",
														rotation.isElective ?
															"bg-blue-100 text-blue-700"
														:	"bg-green-100 text-green-700",
													)}
												>
													{rotation.isElective ? "Elective" : "Core"}
												</span>
											</button>
										))
									}
								</div>
								{form.rotationName && (
									<div className="mt-2 text-sm text-muted-foreground">
										Selected:{" "}
										<span className="font-medium text-foreground">
											{form.rotationName}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Dates */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-sm font-medium">Start Date</label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full mt-1.5 justify-start text-left font-normal",
												!form.startDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{form.startDate ?
												format(form.startDate, "dd MMM yyyy")
											:	"Pick date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={form.startDate}
											onSelect={(date) =>
												setForm((prev) => ({ ...prev, startDate: date }))
											}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div>
								<label className="text-sm font-medium">End Date</label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full mt-1.5 justify-start text-left font-normal",
												!form.endDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{form.endDate ?
												format(form.endDate, "dd MMM yyyy")
											:	"Pick date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={form.endDate}
											onSelect={(date) =>
												setForm((prev) => ({ ...prev, endDate: date }))
											}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						{/* Duration */}
						<div>
							<label className="text-sm font-medium">Total Duration</label>
							<Input
								className="mt-1.5"
								placeholder={
									calculatedDuration ?
										`Auto: ${calculatedDuration}`
									:	"e.g., 3 months, 6 weeks"
								}
								value={form.totalDuration}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										totalDuration: e.target.value,
									}))
								}
								maxLength={100}
							/>
							{calculatedDuration && !form.totalDuration && (
								<p className="text-xs text-muted-foreground mt-1">
									Auto-calculated: {calculatedDuration}
								</p>
							)}
						</div>

						{/* Faculty Selection */}
						<div>
							<label className="text-sm font-medium">
								Faculty Signature (Assign Faculty)
							</label>
							<Select
								value={form.facultyId || "none"}
								onValueChange={(v) =>
									setForm((prev) => ({
										...prev,
										facultyId: v === "none" ? "" : v,
									}))
								}
							>
								<SelectTrigger className="mt-1.5">
									<SelectValue placeholder="Select faculty for signature" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No faculty assigned</SelectItem>
									{facultyList.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.firstName} {f.lastName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground mt-1">
								Selected faculty will see this entry for approval
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDialogOpen(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={isPending}>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{editingId ? "Update" : "Add Entry"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== SUB-COMPONENT: PostingRow ========================

interface PostingRowProps {
	config: RotationPostingConfig;
	posting: RotationPostingData | undefined;
	getFacultyName: (id: string | null) => string;
	isPending: boolean;
	onEdit: (posting: RotationPostingData) => void;
	onSubmit: (id: string) => void;
	onDelete: (id: string) => void;
}

function PostingRow({
	config,
	posting,
	getFacultyName,
	isPending,
	onEdit,
	onSubmit,
	onDelete,
}: PostingRowProps) {
	return (
		<TableRow
			className={cn(
				posting ? "" : "text-muted-foreground/60",
				posting?.status === "SIGNED" && "bg-green-50/50",
			)}
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
			<TableCell className="text-center">
				{posting ?
					<div className="flex items-center justify-center gap-0.5">
						{(posting.status === "DRAFT" ||
							posting.status === "NEEDS_REVISION") && (
							<>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									title="Edit"
									onClick={() => onEdit(posting)}
									disabled={isPending}
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									title="Submit"
									onClick={() => onSubmit(posting.id)}
									disabled={isPending}
								>
									<Send className="h-3.5 w-3.5" />
								</Button>
							</>
						)}
						{posting.status === "DRAFT" && (
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-destructive hover:text-destructive"
								title="Delete"
								onClick={() => onDelete(posting.id)}
								disabled={isPending}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
				:	<span className="text-xs">—</span>}
			</TableCell>
		</TableRow>
	);
}
