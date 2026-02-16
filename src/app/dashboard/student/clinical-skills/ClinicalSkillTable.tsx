/**
 * @module ClinicalSkillTable
 * @description Inline-editing table for Clinical Skill Training (Adult OR Pediatric).
 * Fixed 10 skills. Click row to edit. Columns: Sl.No (auto), Clinical Skill (read-only),
 * Representative Patient Clinical Diagnosis (textarea), Confidence Level (select VC/FC/SC/NC),
 * Observing Faculty Sign (searchable dropdown), Total No. of times performed/Tally (number),
 * Status, Actions.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Check, X, ChevronsUpDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	updateClinicalSkill,
	submitClinicalSkill,
	initializeClinicalSkills,
} from "@/actions/clinical-skills";
import { CONFIDENCE_LEVELS } from "@/lib/constants/clinical-skills";
import type { EntryStatus } from "@/types";

// ======================== TYPES ========================

export interface ClinicalSkillEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyId: string | null;
	facultyRemark: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

interface ClinicalSkillTableProps {
	entries: ClinicalSkillEntry[];
	facultyList: FacultyOption[];
	type: "adult" | "pediatric";
}

interface InlineForm {
	representativeDiagnosis: string;
	confidenceLevel: string;
	totalTimesPerformed: number;
	facultyId: string;
}

const emptyForm: InlineForm = {
	representativeDiagnosis: "",
	confidenceLevel: "",
	totalTimesPerformed: 0,
	facultyId: "",
};

// ======================== MAIN COMPONENT ========================

export function ClinicalSkillTable({
	entries,
	facultyList,
	type,
}: ClinicalSkillTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<InlineForm>(emptyForm);
	const [facultyPickerOpen, setFacultyPickerOpen] = useState(false);

	// Auto-initialize if empty
	useEffect(() => {
		if (entries.length === 0) {
			startTransition(async () => {
				try {
					const result = await initializeClinicalSkills(type);
					if (result.initialized) {
						router.refresh();
					}
				} catch {
					toast.error("Failed to initialize skills");
				}
			});
		}
	}, [entries.length, type, router]);

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

	const confidenceLabel = useCallback((val: string | null) => {
		if (!val) return "—";
		return CONFIDENCE_LEVELS.find((cl) => cl.value === val)?.label ?? val;
	}, []);

	// ---- Editing ----

	function startEditing(entry: ClinicalSkillEntry) {
		if (entry.status === "SUBMITTED" || entry.status === "SIGNED") return;
		setEditingId(entry.id);
		setForm({
			representativeDiagnosis: entry.representativeDiagnosis ?? "",
			confidenceLevel: entry.confidenceLevel ?? "",
			totalTimesPerformed: entry.totalTimesPerformed,
			facultyId: entry.facultyId ?? "",
		});
	}

	function cancelEdit() {
		setEditingId(null);
	}

	function handleSave(id: string) {
		startTransition(async () => {
			try {
				await updateClinicalSkill(type, id, {
					representativeDiagnosis: form.representativeDiagnosis || null,
					confidenceLevel: form.confidenceLevel || null,
					totalTimesPerformed: form.totalTimesPerformed,
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
			if (!entry.confidenceLevel) missing.push("Confidence Level");
			if (!entry.facultyId) missing.push("Observing Faculty");
			if (missing.length > 0) {
				toast.error(`Cannot submit — fill: ${missing.join(", ")}`);
				return;
			}
		}
		startTransition(async () => {
			try {
				await submitClinicalSkill(type, id);
				toast.success("Submitted for review");
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to submit",
				);
			}
		});
	}

	const label = type === "adult" ? "Adult Patient" : "Pediatric Patient";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">Clinical Skills — {label}</CardTitle>
						<CardDescription>
							{stats.signed} of {stats.total || 10} skills signed off
						</CardDescription>
					</div>
					<Badge variant="outline" className="text-sm">
						{stats.signed}/{stats.total || 10}
					</Badge>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-muted rounded-full h-2 mt-2">
					<div
						className="bg-hospital-secondary rounded-full h-2 transition-all"
						style={{
							width: `${(stats.signed / (stats.total || 10)) * 100}%`,
						}}
					/>
				</div>
			</CardHeader>
			<CardContent className="p-0 sm:p-6 overflow-x-auto">
				{entries.length === 0 ?
					<div className="text-center py-12 text-muted-foreground">
						{isPending ?
							"Initializing skills…"
						:	"No skills found. Refresh to initialize."}
					</div>
				:	<div className="border rounded-lg min-w-225">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-12 text-center font-bold">
										Sl.
									</TableHead>
									<TableHead className="min-w-48 font-bold">
										Clinical Skill ({label})
									</TableHead>
									<TableHead className="min-w-52 font-bold">
										Representative Patient Clinical Diagnosis
									</TableHead>
									<TableHead className="w-44 font-bold">
										Confidence Level (VC/FC/SC/NC)
									</TableHead>
									<TableHead className="w-48 font-bold">
										Observing Faculty Sign
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Total No. / Tally
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
								{entries.map((entry) =>
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
											isPending={isPending}
											getFacultyName={getFacultyName}
											confidenceLabel={confidenceLabel}
										/>,
								)}
							</TableBody>
						</Table>
					</div>
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
	entry: ClinicalSkillEntry;
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

			{/* Skill Name (read-only) */}
			<TableCell className="font-medium text-sm">{entry.skillName}</TableCell>

			{/* Representative Diagnosis (editable textarea) */}
			<TableCell>
				<Textarea
					value={form.representativeDiagnosis}
					onChange={(e) =>
						setForm((f) => ({
							...f,
							representativeDiagnosis: e.target.value,
						}))
					}
					placeholder="Enter diagnosis…"
					rows={2}
					className="min-w-44 text-sm resize-none"
				/>
			</TableCell>

			{/* Confidence Level (select) */}
			<TableCell>
				<Select
					value={form.confidenceLevel}
					onValueChange={(val) =>
						setForm((f) => ({ ...f, confidenceLevel: val }))
					}
				>
					<SelectTrigger className="w-36 text-xs">
						<SelectValue placeholder="Select…" />
					</SelectTrigger>
					<SelectContent>
						{CONFIDENCE_LEVELS.map((cl) => (
							<SelectItem key={cl.value} value={cl.value}>
								{cl.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			{/* Observing Faculty Sign (searchable dropdown) */}
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

			{/* Total Times / Tally (number input) */}
			<TableCell className="text-center">
				<Input
					type="number"
					min={0}
					value={form.totalTimesPerformed}
					onChange={(e) =>
						setForm((f) => ({
							...f,
							totalTimesPerformed: parseInt(e.target.value) || 0,
						}))
					}
					className="w-20 mx-auto text-center text-sm"
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
	isPending,
	getFacultyName,
	confidenceLabel,
}: {
	entry: ClinicalSkillEntry;
	onEdit: () => void;
	onSubmit: () => void;
	isPending: boolean;
	getFacultyName: (id: string | null) => string;
	confidenceLabel: (val: string | null) => string;
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

			{/* Skill Name */}
			<TableCell className="font-medium text-sm">{entry.skillName}</TableCell>

			{/* Representative Diagnosis */}
			<TableCell className="text-sm max-w-52">
				{entry.representativeDiagnosis ?
					<span className="line-clamp-2">{entry.representativeDiagnosis}</span>
				:	<span className="text-muted-foreground italic">Not filled</span>}
			</TableCell>

			{/* Confidence Level */}
			<TableCell>
				{entry.confidenceLevel ?
					<Badge variant="outline" className="text-xs">
						{confidenceLabel(entry.confidenceLevel)}
					</Badge>
				:	<span className="text-muted-foreground">—</span>}
			</TableCell>

			{/* Observing Faculty Sign */}
			<TableCell className="text-sm">
				{getFacultyName(entry.facultyId)}
			</TableCell>

			{/* Total Times / Tally */}
			<TableCell className="text-center font-mono">
				{entry.totalTimesPerformed}
			</TableCell>

			{/* Status */}
			<TableCell className="text-center">
				<div>
					<StatusBadge status={entry.status as EntryStatus} size="sm" />
					{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
						<p className="text-[10px] text-red-600 mt-0.5 line-clamp-1">
							Reason: {entry.facultyRemark}
						</p>
					)}
				</div>
			</TableCell>

			{/* Actions */}
			<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-center gap-0.5">
					{entry.status === "DRAFT" && entry.confidenceLevel && (
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
				</div>
			</TableCell>
		</TableRow>
	);
}
