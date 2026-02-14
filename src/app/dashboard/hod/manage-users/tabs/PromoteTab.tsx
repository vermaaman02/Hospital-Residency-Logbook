/**
 * @module PromoteTab
 * @description Bulk semester promotion for students.
 * HOD can select students (with filters) and promote to next semester.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { promoteStudents, demoteStudents } from "@/actions/user-management";
import { toast } from "sonner";
import {
	Search,
	ArrowUp,
	ArrowDown,
	GraduationCap,
	Loader2,
	CheckCircle2,
	AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserData, BatchData } from "../ManageUsersClient";

interface PromoteTabProps {
	students: UserData[];
	batches: BatchData[];
}

export function PromoteTab({ students, batches }: PromoteTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [mode, setMode] = useState<"promote" | "demote">("promote");
	const [searchQuery, setSearchQuery] = useState("");
	const [batchFilter, setBatchFilter] = useState<string>("all");
	const [semesterFilter, setSemesterFilter] = useState<string>("all");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	// Eligible students based on mode
	const eligibleStudents = useMemo(() => {
		let result = students.filter((s) => {
			if (s.status !== "ACTIVE") return false;
			if (mode === "promote") return (s.currentSemester ?? 1) < 6;
			return (s.currentSemester ?? 1) > 1; // demote: must be > 1
		});

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(s) =>
					s.firstName.toLowerCase().includes(q) ||
					s.lastName.toLowerCase().includes(q) ||
					s.email.toLowerCase().includes(q),
			);
		}

		if (batchFilter !== "all") {
			result = result.filter((s) => s.batchId === batchFilter);
		}

		if (semesterFilter !== "all") {
			result = result.filter(
				(s) => (s.currentSemester ?? 1).toString() === semesterFilter,
			);
		}

		return result;
	}, [students, searchQuery, batchFilter, semesterFilter, mode]);

	const maxSemStudents = students.filter((s) => (s.currentSemester ?? 1) >= 6);
	const minSemStudents = students.filter((s) => (s.currentSemester ?? 1) <= 1);

	function toggleSelect(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function selectAll() {
		if (selectedIds.size === eligibleStudents.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(eligibleStudents.map((s) => s.id)));
		}
	}

	function handlePromote() {
		if (selectedIds.size === 0) {
			toast.error("No students selected");
			return;
		}
		setConfirmDialogOpen(true);
	}

	function confirmAction() {
		startTransition(async () => {
			try {
				const ids = Array.from(selectedIds);
				const result =
					mode === "promote" ?
						await promoteStudents(ids)
					:	await demoteStudents(ids);
				if (result.success) {
					toast.success(result.message);
					setSelectedIds(new Set());
					setConfirmDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? `Failed to ${mode}`);
				}
			} catch {
				toast.error(`Failed to ${mode} students`);
			}
		});
	}

	function switchMode(newMode: "promote" | "demote") {
		setMode(newMode);
		setSelectedIds(new Set());
	}

	const selectedStudents = eligibleStudents.filter((s) =>
		selectedIds.has(s.id),
	);

	const uniqueBatches = useMemo(() => {
		const batchIds = new Set(students.map((s) => s.batchId).filter(Boolean));
		return batches.filter((b) => batchIds.has(b.id));
	}, [students, batches]);

	return (
		<div className="space-y-4">
			{/* Mode Toggle + Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h3 className="text-lg font-semibold">
						{mode === "promote" ? "Promote" : "Demote"} Students
					</h3>
					<p className="text-sm text-muted-foreground">
						{mode === "promote" ?
							"Select students and promote them to the next semester in bulk."
						:	"Undo accidental promotions by demoting students to the previous semester."
						}
					</p>
				</div>
				<div className="flex gap-2">
					<div className="inline-flex rounded-lg border p-1 gap-1">
						<Button
							variant={mode === "promote" ? "default" : "ghost"}
							size="sm"
							onClick={() => switchMode("promote")}
							className="gap-1.5 text-xs"
						>
							<ArrowUp className="h-3.5 w-3.5" />
							Promote
						</Button>
						<Button
							variant={mode === "demote" ? "default" : "ghost"}
							size="sm"
							onClick={() => switchMode("demote")}
							className="gap-1.5 text-xs"
						>
							<ArrowDown className="h-3.5 w-3.5" />
							Demote
						</Button>
					</div>
					<Button
						onClick={handlePromote}
						disabled={selectedIds.size === 0 || isPending}
						className="gap-2"
						variant={mode === "demote" ? "destructive" : "default"}
					>
						{mode === "promote" ?
							<ArrowUp className="h-4 w-4" />
						:	<ArrowDown className="h-4 w-4" />}
						{mode === "promote" ? "Promote" : "Demote"} Selected (
						{selectedIds.size})
					</Button>
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
				<div className="rounded-lg border bg-blue-50 border-blue-200 p-3">
					<p className="text-xs text-blue-600 font-medium">
						Eligible for {mode === "promote" ? "Promotion" : "Demotion"}
					</p>
					<p className="text-xl font-bold text-blue-700">
						{eligibleStudents.length}
					</p>
				</div>
				<div className="rounded-lg border bg-green-50 border-green-200 p-3">
					<p className="text-xs text-green-600 font-medium">Selected</p>
					<p className="text-xl font-bold text-green-700">{selectedIds.size}</p>
				</div>
				<div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
					<p className="text-xs text-amber-600 font-medium">
						{mode === "promote" ?
							"Already at Semester 6"
						:	"Already at Semester 1"}
					</p>
					<p className="text-xl font-bold text-amber-700">
						{mode === "promote" ? maxSemStudents.length : minSemStudents.length}
					</p>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search students..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={batchFilter} onValueChange={setBatchFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Batch" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Batches</SelectItem>
						{uniqueBatches.map((b) => (
							<SelectItem key={b.id} value={b.id}>
								{b.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={semesterFilter} onValueChange={setSemesterFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Semester" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Semesters</SelectItem>
						{[1, 2, 3, 4, 5].map((sem) => (
							<SelectItem key={sem} value={sem.toString()}>
								Semester {sem}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Students Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						Students ({eligibleStudents.length})
					</CardTitle>
					<CardDescription>
						{mode === "promote" ?
							"Select students to promote to the next semester. Students at Semester 6 are excluded."
						:	"Select students to demote to the previous semester. Students at Semester 1 are excluded."
						}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										<Checkbox
											checked={
												eligibleStudents.length > 0 &&
												selectedIds.size === eligibleStudents.length
											}
											onCheckedChange={selectAll}
										/>
									</TableHead>
									<TableHead>Student</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Batch</TableHead>
									<TableHead>Current Sem</TableHead>
									<TableHead>
										After {mode === "promote" ? "Promotion" : "Demotion"}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{eligibleStudents.length === 0 ?
									<TableRow>
										<TableCell colSpan={6} className="text-center py-12">
											<div className="flex flex-col items-center gap-2 text-muted-foreground">
												<GraduationCap className="h-8 w-8 opacity-50" />
												<p>No eligible students found</p>
											</div>
										</TableCell>
									</TableRow>
								:	eligibleStudents.map((student) => (
										<TableRow
											key={student.id}
											className={
												selectedIds.has(student.id) ? "bg-blue-50/50" : (
													undefined
												)
											}
										>
											<TableCell>
												<Checkbox
													checked={selectedIds.has(student.id)}
													onCheckedChange={() => toggleSelect(student.id)}
												/>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-3">
													<Avatar className="h-7 w-7">
														<AvatarImage src={student.imageUrl} />
														<AvatarFallback className="text-xs">
															{student.firstName[0]}
															{student.lastName[0]}
														</AvatarFallback>
													</Avatar>
													<span className="font-medium text-sm">
														{student.firstName} {student.lastName}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{student.email}
											</TableCell>
											<TableCell>
												{student.batchName ?
													<Badge variant="secondary" className="text-xs">
														{student.batchName}
													</Badge>
												:	<span className="text-xs text-muted-foreground">
														Unassigned
													</span>
												}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													Sem {student.currentSemester ?? 1}
												</Badge>
											</TableCell>
											<TableCell>
												{mode === "promote" ?
													<Badge className="bg-green-100 text-green-800 border-green-200">
														<ArrowUp className="h-3 w-3 mr-1" />
														Sem {(student.currentSemester ?? 1) + 1}
													</Badge>
												:	<Badge className="bg-red-100 text-red-800 border-red-200">
														<ArrowDown className="h-3 w-3 mr-1" />
														Sem {(student.currentSemester ?? 1) - 1}
													</Badge>
												}
											</TableCell>
										</TableRow>
									))
								}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Confirm Dialog */}
			<Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-amber-500" />
							Confirm {mode === "promote" ? "Promotion" : "Demotion"}
						</DialogTitle>
						<DialogDescription>
							You are about to {mode}{" "}
							<strong>{selectedIds.size} student(s)</strong> to the{" "}
							{mode === "promote" ? "next" : "previous"} semester.
							{mode === "promote" ?
								" This can be undone using Demote."
							:	" This can be undone using Promote."}
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<div className="max-h-48 overflow-y-auto space-y-1">
							{selectedStudents.map((s) => (
								<div
									key={s.id}
									className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
								>
									<span>
										{s.firstName} {s.lastName}
									</span>
									<span className="text-muted-foreground">
										Sem {s.currentSemester ?? 1} →{" "}
										<strong
											className={
												mode === "promote" ? "text-green-600" : "text-red-600"
											}
										>
											Sem{" "}
											{mode === "promote" ?
												(s.currentSemester ?? 1) + 1
											:	(s.currentSemester ?? 1) - 1}
										</strong>
									</span>
								</div>
							))}
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setConfirmDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={confirmAction}
							disabled={isPending}
							className="gap-2"
							variant={mode === "demote" ? "destructive" : "default"}
						>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin" />
							:	<CheckCircle2 className="h-4 w-4" />}
							{mode === "promote" ? "Promote" : "Demote"} {selectedIds.size}{" "}
							Student(s)
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
