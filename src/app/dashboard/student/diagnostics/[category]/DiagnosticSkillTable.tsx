/**
 * @module DiagnosticSkillTable
 * @description Inline-editing table for diagnostic skill entries (ABG/ECG/Other).
 * Students can add (inline row at bottom), edit (click row), submit, and delete entries.
 * Shows rejection remarks. No dialogs for add/edit — everything is inline in the table.
 *
 * @see PG Logbook .md — "ARTERIAL/ VENOUS BLOOD GAS ANALYSIS", "ELECTROCARDIOGRAPH (ECG) ANALYSIS", "OTHER DIAGNOSTIC ANALYSIS"
 * @see ClinicalSkillTable — Reference pattern for inline editing
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	Plus,
	Pencil,
	Trash2,
	Send,
	Save,
	X,
	Loader2,
	AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CloudinaryUpload, ImageGallery } from "@/components/shared/CloudinaryUpload";
import {
	createDiagnosticSkillEntry,
	updateDiagnosticSkillEntry,
	submitDiagnosticSkillEntry,
	deleteDiagnosticSkillEntry,
} from "@/actions/diagnostic-skills";
import {
	CONFIDENCE_LEVEL_OPTIONS,
	CONFIDENCE_LEVEL_LABELS,
} from "@/lib/constants/diagnostic-types";
import type { DiagnosticSkillConfig } from "@/lib/constants/diagnostic-types";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

interface DiagnosticEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyRemark: string | null;
	imageUrls: string[];
	status: string;
}

interface DiagnosticSkillTableProps {
	entries: DiagnosticEntry[];
	categoryEnum: "ABG_ANALYSIS" | "ECG_ANALYSIS" | "OTHER_DIAGNOSTIC";
	categoryLabel: string;
	skills: DiagnosticSkillConfig[];
}

// ======================== MAIN COMPONENT ========================

export function DiagnosticSkillTable({
	entries,
	categoryEnum,
	categoryLabel,
	skills,
}: DiagnosticSkillTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Edit state — inline editing of existing entries
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editData, setEditData] = useState({
		skillName: "",
		representativeDiagnosis: "",
		confidenceLevel: "",
		totalTimesPerformed: 0,
		imageUrls: [] as string[],
	});

	// Inline add row state — appears at bottom of table
	const [addingNew, setAddingNew] = useState(false);
	const [addData, setAddData] = useState({
		skillName: "",
		representativeDiagnosis: "",
		confidenceLevel: "NC",
		totalTimesPerformed: 0,
		imageUrls: [] as string[],
	});

	// Delete confirmation (only dialog kept)
	const [deleteId, setDeleteId] = useState<string | null>(null);

	// ─── Computed ────────────────────────────────────────────

	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const submittedCount = entries.filter((e) => e.status === "SUBMITTED").length;
	const totalCount = entries.length;

	// Skills not yet added
	const addedSkillNames = useMemo(
		() => new Set(entries.map((e) => e.skillName)),
		[entries],
	);
	const availableSkills = useMemo(
		() => skills.filter((s) => !addedSkillNames.has(s.name)),
		[skills, addedSkillNames],
	);

	const progressPercent =
		skills.length > 0 ? Math.round((signedCount / skills.length) * 100) : 0;

	// ─── Inline Add ──────────────────────────────────────────

	function startAddingNew() {
		setEditingId(null); // cancel any edit in progress
		setAddData({
			skillName: availableSkills[0]?.name ?? "",
			representativeDiagnosis: "",
			confidenceLevel: "NC",
			totalTimesPerformed: 0,
			imageUrls: [],
		});
		setAddingNew(true);
	}

	function cancelAdd() {
		setAddingNew(false);
	}

	function handleAdd() {
		if (!addData.skillName) {
			toast.error("Please select a skill");
			return;
		}
		startTransition(async () => {
			try {
				const result = await createDiagnosticSkillEntry({
					diagnosticCategory: categoryEnum,
					skillName: addData.skillName,
					representativeDiagnosis: addData.representativeDiagnosis || undefined,
					confidenceLevel: addData.confidenceLevel as "VC" | "FC" | "SC" | "NC",
					totalTimesPerformed: addData.totalTimesPerformed,
					imageUrls: addData.imageUrls,
				});
				toast.success(`Added: ${addData.skillName}`);
				setAddingNew(false);
				if (result.entry) router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to add entry",
				);
			}
		});
	}

	// ─── Edit ────────────────────────────────────────────────

	function startEdit(entry: DiagnosticEntry) {
		setAddingNew(false); // cancel any add in progress
		setEditingId(entry.id);
		setEditData({
			skillName: entry.skillName,
			representativeDiagnosis: entry.representativeDiagnosis ?? "",
			confidenceLevel: entry.confidenceLevel ?? "NC",
			totalTimesPerformed: entry.totalTimesPerformed,
			imageUrls: entry.imageUrls ?? [],
		});
	}

	function cancelEdit() {
		setEditingId(null);
	}

	function saveEdit(entry: DiagnosticEntry) {
		startTransition(async () => {
			try {
				await updateDiagnosticSkillEntry(entry.id, {
					diagnosticCategory: categoryEnum,
					skillName: editData.skillName,
					representativeDiagnosis:
						editData.representativeDiagnosis || undefined,
					confidenceLevel: editData.confidenceLevel as
						| "VC"
						| "FC"
						| "SC"
						| "NC",
					totalTimesPerformed: editData.totalTimesPerformed,
					imageUrls: editData.imageUrls,
				});
				toast.success("Entry updated (saved as Draft)");
				setEditingId(null);
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save");
			}
		});
	}

	// ─── Submit ──────────────────────────────────────────────

	function handleSubmit(id: string) {
		startTransition(async () => {
			try {
				const result = await submitDiagnosticSkillEntry(id);
				if (result.autoSigned) {
					toast.success("Submitted & auto-signed!");
				} else {
					toast.success("Submitted for review");
				}
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	// ─── Delete ──────────────────────────────────────────────

	function confirmDelete() {
		if (!deleteId) return;
		startTransition(async () => {
			try {
				await deleteDiagnosticSkillEntry(deleteId);
				toast.success("Entry deleted");
				setDeleteId(null);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to delete",
				);
			}
		});
	}

	// ─── Render ──────────────────────────────────────────────

	return (
		<div className="space-y-4">
			{/* Progress */}
			<Card>
				<CardContent className="py-4">
					<div className="flex items-center justify-between flex-wrap gap-3">
						<div className="flex items-center gap-4 text-sm">
							<span>
								<strong className="text-green-600">{signedCount}</strong> signed
							</span>
							<span>
								<strong className="text-amber-600">{submittedCount}</strong>{" "}
								pending
							</span>
							<span>
								<strong>{totalCount}</strong> / {skills.length} entries
							</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-32 bg-muted rounded-full h-2">
								<div
									className="bg-green-600 h-2 rounded-full transition-all"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
							<span className="text-xs text-muted-foreground">
								{progressPercent}%
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Table */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">{categoryLabel}</CardTitle>
						{availableSkills.length > 0 && !addingNew && (
							<Button onClick={startAddingNew} size="sm" variant="outline">
								<Plus className="h-4 w-4 mr-1" />
								Add Entry
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/40">
									<TableHead className="w-14 text-center">Sl.</TableHead>
									<TableHead className="min-w-48">Diagnostic Skill</TableHead>
									<TableHead className="min-w-44">
										Representative Diagnosis
									</TableHead>
									<TableHead className="w-36">Level of Confidence</TableHead>
									<TableHead className="w-20 text-center">Tally</TableHead>
									{(categoryEnum === "ECG_ANALYSIS" || categoryEnum === "ABG_ANALYSIS") && (
										<TableHead className="w-36">Images</TableHead>
									)}
									<TableHead className="min-w-36">Faculty Remark</TableHead>
									<TableHead className="w-28 text-center">Status</TableHead>
									<TableHead className="w-32 text-center">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.length === 0 && !addingNew && (
									<TableRow>
										<TableCell
											colSpan={8}
											className="text-center py-12 text-muted-foreground"
										>
											No entries yet. Click &quot;Add Entry&quot; to add your
											first skill inline.
										</TableCell>
									</TableRow>
								)}
								{entries.map((entry) =>
									editingId === entry.id ?
										<EditRow
											key={entry.id}
											entry={entry}
											editData={editData}
											setEditData={setEditData}
											onSave={() => saveEdit(entry)}
											onCancel={cancelEdit}
											isPending={isPending}
											categoryEnum={categoryEnum}
										/>
									:	<ReadRow
											key={entry.id}
											entry={entry}
											onEdit={() => startEdit(entry)}
											onSubmit={() => handleSubmit(entry.id)}
											onDelete={() => setDeleteId(entry.id)}
											isPending={isPending}
											categoryEnum={categoryEnum}
										/>,
								)}

								{/* Inline Add Row — at the bottom of the table */}
								{addingNew && (
									<InlineAddRow
										addData={addData}
										setAddData={setAddData}
										availableSkills={availableSkills}
										onSave={handleAdd}
										onCancel={cancelAdd}
										isPending={isPending}
										nextSlNo={totalCount + 1}
										categoryEnum={categoryEnum}
									/>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Delete Confirmation — only dialog kept */}
			<Dialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete Entry</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this entry? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteId(null)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDelete}
							disabled={isPending}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							:	<Trash2 className="h-4 w-4 mr-1" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== INLINE ADD ROW ========================

function InlineAddRow({
	addData,
	setAddData,
	availableSkills,
	onSave,
	onCancel,
	isPending,
	nextSlNo,
	categoryEnum,
}: {
	addData: {
		skillName: string;
		representativeDiagnosis: string;
		confidenceLevel: string;
		totalTimesPerformed: number;
		imageUrls: string[];
	};
	setAddData: React.Dispatch<
		React.SetStateAction<{
			skillName: string;
			representativeDiagnosis: string;
			confidenceLevel: string;
			totalTimesPerformed: number;
			imageUrls: string[];
		}>
	>;
	availableSkills: DiagnosticSkillConfig[];
	onSave: () => void;
	onCancel: () => void;
	isPending: boolean;
	nextSlNo: number;
	categoryEnum: string;
}) {
	return (
		<TableRow className="bg-emerald-50/50 border-t-2 border-emerald-200">
			<TableCell className="text-center font-medium text-muted-foreground">
				{nextSlNo}
			</TableCell>
			<TableCell>
				<Select
					value={addData.skillName}
					onValueChange={(val) =>
						setAddData((prev) => ({ ...prev, skillName: val }))
					}
				>
					<SelectTrigger className="w-full text-sm">
						<SelectValue placeholder="Select skill..." />
					</SelectTrigger>
					<SelectContent>
						{availableSkills.map((s) => (
							<SelectItem key={s.name} value={s.name}>
								{s.slNo}. {s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell>
				<Textarea
					value={addData.representativeDiagnosis}
					onChange={(e) =>
						setAddData((prev) => ({
							...prev,
							representativeDiagnosis: e.target.value,
						}))
					}
					placeholder="Diagnosis..."
					rows={2}
					className="text-sm"
				/>
			</TableCell>
			<TableCell>
				<Select
					value={addData.confidenceLevel}
					onValueChange={(val) =>
						setAddData((prev) => ({ ...prev, confidenceLevel: val }))
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{CONFIDENCE_LEVEL_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell>
				<Input
					type="number"
					min={0}
					value={addData.totalTimesPerformed}
					onChange={(e) =>
						setAddData((prev) => ({
							...prev,
							totalTimesPerformed: parseInt(e.target.value) || 0,
						}))
					}
					className="w-20 text-center"
				/>
			</TableCell>
			{(categoryEnum === "ECG_ANALYSIS" || categoryEnum === "ABG_ANALYSIS") && (
				<TableCell>
					<CloudinaryUpload
						value={addData.imageUrls}
						onChange={(urls) => setAddData((prev) => ({ ...prev, imageUrls: urls }))}
						maxFiles={3}
					/>
				</TableCell>
			)}
			<TableCell className="text-sm text-muted-foreground">—</TableCell>
			<TableCell className="text-center">
				<Badge variant="outline" className="text-xs bg-emerald-50">
					New
				</Badge>
			</TableCell>
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						onClick={onSave}
						disabled={isPending || !addData.skillName}
						title="Save new entry"
					>
						{isPending ?
							<Loader2 className="h-4 w-4 animate-spin" />
						:	<Save className="h-4 w-4 text-green-600" />}
					</Button>
					<Button
						size="icon"
						variant="ghost"
						onClick={onCancel}
						disabled={isPending}
						title="Cancel"
					>
						<X className="h-4 w-4 text-red-600" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

// ======================== EDIT ROW ========================

function EditRow({
	entry,
	editData,
	setEditData,
	onSave,
	onCancel,
	isPending,
	categoryEnum,
}: {
	entry: DiagnosticEntry;
	editData: {
		skillName: string;
		representativeDiagnosis: string;
		confidenceLevel: string;
		totalTimesPerformed: number;
		imageUrls: string[];
	};
	setEditData: React.Dispatch<
		React.SetStateAction<{
			skillName: string;
			representativeDiagnosis: string;
			confidenceLevel: string;
			totalTimesPerformed: number;
			imageUrls: string[];
		}>
	>;
	onSave: () => void;
	onCancel: () => void;
	isPending: boolean;
	categoryEnum: string;
}) {
	return (
		<TableRow className="bg-blue-50/40">
			<TableCell className="text-center font-medium text-muted-foreground">
				{entry.slNo}
			</TableCell>
			<TableCell className="text-sm font-medium">{entry.skillName}</TableCell>
			<TableCell>
				<Textarea
					value={editData.representativeDiagnosis}
					onChange={(e) =>
						setEditData((prev) => ({
							...prev,
							representativeDiagnosis: e.target.value,
						}))
					}
					placeholder="Diagnosis..."
					rows={2}
					className="text-sm"
				/>
			</TableCell>
			<TableCell>
				<Select
					value={editData.confidenceLevel}
					onValueChange={(val) =>
						setEditData((prev) => ({ ...prev, confidenceLevel: val }))
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{CONFIDENCE_LEVEL_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell>
				<Input
					type="number"
					min={0}
					value={editData.totalTimesPerformed}
					onChange={(e) =>
						setEditData((prev) => ({
							...prev,
							totalTimesPerformed: parseInt(e.target.value) || 0,
						}))
					}
					className="w-20 text-center"
				/>
			</TableCell>
			{(categoryEnum === "ECG_ANALYSIS" || categoryEnum === "ABG_ANALYSIS") && (
				<TableCell>
					<CloudinaryUpload
						value={editData.imageUrls}
						onChange={(urls) => setEditData((prev) => ({ ...prev, imageUrls: urls }))}
						maxFiles={3}
					/>
				</TableCell>
			)}
			<TableCell className="text-sm text-muted-foreground">
				{entry.facultyRemark || "—"}
			</TableCell>
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
			</TableCell>
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						onClick={onSave}
						disabled={isPending}
						title="Save"
					>
						{isPending ?
							<Loader2 className="h-4 w-4 animate-spin" />
						:	<Save className="h-4 w-4 text-green-600" />}
					</Button>
					<Button
						size="icon"
						variant="ghost"
						onClick={onCancel}
						disabled={isPending}
						title="Cancel"
					>
						<X className="h-4 w-4 text-red-600" />
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
	categoryEnum,
}: {
	entry: DiagnosticEntry;
	onEdit: () => void;
	onSubmit: () => void;
	onDelete: () => void;
	isPending: boolean;
	categoryEnum: string;
}) {
	const isEditable =
		entry.status === "DRAFT" || entry.status === "NEEDS_REVISION";
	const isSubmittable = entry.status === "DRAFT";
	const isDeletable = entry.status !== "SIGNED";
	const isRejected = entry.status === "NEEDS_REVISION";

	const confidenceLabel =
		CONFIDENCE_LEVEL_LABELS[entry.confidenceLevel ?? ""] ??
		entry.confidenceLevel ??
		"—";

	return (
		<TableRow
			className={cn(
				"cursor-pointer hover:bg-muted/30 transition-colors",
				entry.status === "SIGNED" && "bg-green-50/40",
				isRejected && "bg-amber-50/40",
				entry.status === "SUBMITTED" && "bg-blue-50/20",
			)}
			onClick={isEditable ? onEdit : undefined}
			title={isEditable ? "Click to edit" : undefined}
		>
			<TableCell className="text-center font-medium text-muted-foreground">
				{entry.slNo}
			</TableCell>
			<TableCell className="text-sm font-medium">{entry.skillName}</TableCell>
			<TableCell className="text-sm">
				{entry.representativeDiagnosis || (
					<span className="text-muted-foreground italic">Click to add...</span>
				)}
			</TableCell>
			<TableCell>
				{entry.confidenceLevel ?
					<Badge variant="outline" className="text-xs">
						{confidenceLabel}
					</Badge>
				:	<span className="text-muted-foreground">—</span>}
			</TableCell>
			<TableCell className="text-center font-mono">
				{entry.totalTimesPerformed}
			</TableCell>
			{(categoryEnum === "ECG_ANALYSIS" || categoryEnum === "ABG_ANALYSIS") && (
				<TableCell>
					{entry.imageUrls && entry.imageUrls.length > 0 ? (
						<ImageGallery urls={entry.imageUrls} maxDisplay={2} />
					) : (
						<span className="text-muted-foreground text-xs">No images</span>
					)}
				</TableCell>
			)}
			<TableCell className="text-sm">
				{isRejected && entry.facultyRemark ?
					<div className="flex items-start gap-1.5">
						<AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
						<span className="text-amber-700 text-xs leading-snug">
							{entry.facultyRemark}
						</span>
					</div>
				: entry.facultyRemark ?
					<span>{entry.facultyRemark}</span>
				:	<span className="text-muted-foreground">—</span>}
			</TableCell>
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
			</TableCell>
			<TableCell className="text-center">
				<div
					className="flex items-center justify-center gap-1"
					onClick={(e) => e.stopPropagation()}
				>
					{isEditable && (
						<Button
							size="icon"
							variant="ghost"
							onClick={onEdit}
							disabled={isPending}
							title="Edit"
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					)}
					{isSubmittable && (
						<Button
							size="icon"
							variant="ghost"
							onClick={onSubmit}
							disabled={isPending}
							title="Submit for review"
						>
							{isPending ?
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							:	<Send className="h-3.5 w-3.5 text-blue-600" />}
						</Button>
					)}
					{isDeletable && (
						<Button
							size="icon"
							variant="ghost"
							onClick={onDelete}
							disabled={isPending}
							title="Delete"
						>
							<Trash2 className="h-3.5 w-3.5 text-red-500" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}
