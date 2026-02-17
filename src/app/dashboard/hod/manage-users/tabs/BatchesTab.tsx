/**
 * @module BatchesTab
 * @description Batch management — create, edit, delete batches.
 * Shown in the "Batches" tab of the Manage Users page.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	createBatch,
	updateBatch,
	deleteBatch,
	assignFacultyToBatch,
	removeFacultyFromBatch,
	bulkAssignStudentsToBatch,
	bulkAssignFacultyToBatch,
} from "@/actions/batch-management";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
	Plus,
	Pencil,
	Trash2,
	Users,
	Calendar,
	Loader2,
	FolderPlus,
	CheckCircle2,
	XCircle,
	UserCog,
	X,
	UserPlus,
	Search,
	ListFilter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { BatchData, UserData } from "../ManageUsersClient";

interface BatchesTabProps {
	batches: BatchData[];
	facultyUsers: UserData[];
	studentUsers: UserData[];
}

interface BatchFormState {
	name: string;
	startDate: string;
	endDate: string;
	description: string;
	currentSemester: string;
}

const emptyForm: BatchFormState = {
	name: "",
	startDate: "",
	endDate: "",
	description: "",
	currentSemester: "1",
};

export function BatchesTab({
	batches,
	facultyUsers,
	studentUsers,
}: BatchesTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [formState, setFormState] = useState<BatchFormState>(emptyForm);
	const [editBatchId, setEditBatchId] = useState<string | null>(null);
	const [deleteBatchTarget, setDeleteBatchTarget] = useState<BatchData | null>(
		null,
	);

	// Faculty assignment dialog
	const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
	const [facultyBatchTarget, setFacultyBatchTarget] =
		useState<BatchData | null>(null);
	const [selectedFacultyId, setSelectedFacultyId] = useState("");

	// Bulk assign students dialog
	const [bulkStudentDialogOpen, setBulkStudentDialogOpen] = useState(false);
	const [bulkStudentBatchTarget, setBulkStudentBatchTarget] =
		useState<BatchData | null>(null);
	const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
		new Set(),
	);
	const [studentSearchQuery, setStudentSearchQuery] = useState("");
	const [studentBatchFilter, setStudentBatchFilter] = useState<string>("all");
	const [studentSemesterFilter, setStudentSemesterFilter] =
		useState<string>("all");
	const [studentAssignmentFilter, setStudentAssignmentFilter] =
		useState<string>("all");

	// Bulk assign faculty dialog
	const [bulkFacultyDialogOpen, setBulkFacultyDialogOpen] = useState(false);
	const [bulkFacultyBatchTarget, setBulkFacultyBatchTarget] =
		useState<BatchData | null>(null);
	const [selectedFacultyIds, setSelectedFacultyIds] = useState<Set<string>>(
		new Set(),
	);
	const [facultySearchQuery, setFacultySearchQuery] = useState("");
	const [facultyAssignmentFilter, setFacultyAssignmentFilter] =
		useState<string>("all");

	function updateForm(field: keyof BatchFormState, value: string) {
		setFormState((prev) => ({ ...prev, [field]: value }));
	}

	function openCreate() {
		setFormState(emptyForm);
		setCreateDialogOpen(true);
	}

	function openEdit(batch: BatchData) {
		setEditBatchId(batch.id);
		setFormState({
			name: batch.name,
			startDate: batch.startDate.split("T")[0] ?? "",
			endDate: batch.endDate?.split("T")[0] ?? "",
			description: batch.description ?? "",
			currentSemester: batch.currentSemester.toString(),
		});
		setEditDialogOpen(true);
	}

	function openDelete(batch: BatchData) {
		setDeleteBatchTarget(batch);
		setDeleteDialogOpen(true);
	}

	function handleCreate() {
		if (!formState.name || !formState.startDate) {
			toast.error("Batch name and start date are required");
			return;
		}
		startTransition(async () => {
			try {
				const result = await createBatch({
					name: formState.name,
					startDate: formState.startDate,
					endDate: formState.endDate || undefined,
					description: formState.description || undefined,
					currentSemester: parseInt(formState.currentSemester),
				});
				if (result.success) {
					toast.success(`Batch "${formState.name}" created`);
					setCreateDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to create batch");
				}
			} catch {
				toast.error("Failed to create batch");
			}
		});
	}

	function handleEdit() {
		if (!editBatchId) return;
		startTransition(async () => {
			try {
				const result = await updateBatch({
					id: editBatchId,
					name: formState.name || undefined,
					startDate: formState.startDate || undefined,
					endDate: formState.endDate || undefined,
					description: formState.description || undefined,
					currentSemester: parseInt(formState.currentSemester),
				});
				if (result.success) {
					toast.success("Batch updated");
					setEditDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to update batch");
				}
			} catch {
				toast.error("Failed to update batch");
			}
		});
	}

	function handleDelete() {
		if (!deleteBatchTarget) return;
		startTransition(async () => {
			try {
				const result = await deleteBatch(deleteBatchTarget.id);
				if (result.success) {
					toast.success(`Batch "${deleteBatchTarget.name}" deleted`);
					setDeleteDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to delete batch");
				}
			} catch {
				toast.error("Failed to delete batch");
			}
		});
	}

	function handleToggleActive(batch: BatchData) {
		startTransition(async () => {
			try {
				const result = await updateBatch({
					id: batch.id,
					isActive: !batch.isActive,
				});
				if (result.success) {
					toast.success(
						`Batch "${batch.name}" ${batch.isActive ? "deactivated" : "activated"}`,
					);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to update batch");
				}
			} catch {
				toast.error("Failed to update batch");
			}
		});
	}

	function openFacultyDialog(batch: BatchData) {
		setFacultyBatchTarget(batch);
		setSelectedFacultyId("");
		setFacultyDialogOpen(true);
	}

	function handleAssignFaculty() {
		if (!facultyBatchTarget || !selectedFacultyId) return;
		startTransition(async () => {
			try {
				const result = await assignFacultyToBatch(
					selectedFacultyId,
					facultyBatchTarget.id,
				);
				if (result.success) {
					toast.success("Faculty assigned to batch");
					setSelectedFacultyId("");
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to assign faculty");
				}
			} catch {
				toast.error("Failed to assign faculty");
			}
		});
	}

	function handleRemoveFaculty(facultyId: string, batchId: string) {
		startTransition(async () => {
			try {
				const result = await removeFacultyFromBatch(facultyId, batchId);
				if (result.success) {
					toast.success("Faculty removed from batch");
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to remove faculty");
				}
			} catch {
				toast.error("Failed to remove faculty");
			}
		});
	}

	// Faculty not already assigned to the target batch
	const availableFaculty =
		facultyBatchTarget ?
			facultyUsers.filter(
				(f) => !facultyBatchTarget.assignedFaculty.some((af) => af.id === f.id),
			)
		:	[];

	// ====== Bulk assign students helpers ======

	function openBulkStudentDialog(batch: BatchData) {
		setBulkStudentBatchTarget(batch);
		setSelectedStudentIds(new Set());
		setStudentSearchQuery("");
		setStudentBatchFilter("all");
		setStudentSemesterFilter("all");
		setStudentAssignmentFilter("all");
		setBulkStudentDialogOpen(true);
	}

	// Students not in this batch (available to assign)
	const availableStudentsForBulk =
		bulkStudentBatchTarget ?
			studentUsers.filter((s) => s.batchId !== bulkStudentBatchTarget.id)
		:	[];

	// Unique batch names and semesters for filter dropdowns
	const studentBatchOptions = Array.from(
		new Set(availableStudentsForBulk.map((s) => s.batch).filter(Boolean)),
	) as string[];
	const studentSemesterOptions = Array.from(
		new Set(
			availableStudentsForBulk
				.map((s) => s.currentSemester)
				.filter((v): v is number => v !== null),
		),
	).sort((a, b) => a - b);

	const filteredBulkStudents = availableStudentsForBulk.filter((s) => {
		// Search filter
		if (studentSearchQuery) {
			const q = studentSearchQuery.toLowerCase();
			const matchesSearch =
				s.firstName.toLowerCase().includes(q) ||
				s.lastName.toLowerCase().includes(q) ||
				s.email.toLowerCase().includes(q) ||
				(s.batch ?? "").toLowerCase().includes(q);
			if (!matchesSearch) return false;
		}
		// Batch filter
		if (studentBatchFilter !== "all") {
			if (studentBatchFilter === "unassigned") {
				if (s.batchId !== null) return false;
			} else {
				if (s.batch !== studentBatchFilter) return false;
			}
		}
		// Semester filter
		if (studentSemesterFilter !== "all") {
			if (s.currentSemester !== parseInt(studentSemesterFilter)) return false;
		}
		// Assignment filter
		if (studentAssignmentFilter !== "all") {
			if (studentAssignmentFilter === "unassigned" && s.batchId !== null)
				return false;
			if (studentAssignmentFilter === "assigned" && s.batchId === null)
				return false;
		}
		return true;
	});

	function toggleStudent(id: string) {
		setSelectedStudentIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAllStudents() {
		if (selectedStudentIds.size === filteredBulkStudents.length) {
			setSelectedStudentIds(new Set());
		} else {
			setSelectedStudentIds(new Set(filteredBulkStudents.map((s) => s.id)));
		}
	}

	function handleBulkAssignStudents() {
		if (!bulkStudentBatchTarget || selectedStudentIds.size === 0) return;
		startTransition(async () => {
			try {
				const result = await bulkAssignStudentsToBatch(
					Array.from(selectedStudentIds),
					bulkStudentBatchTarget.id,
				);
				if (result.success) {
					toast.success(result.message);
					setBulkStudentDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to assign students");
				}
			} catch {
				toast.error("Failed to assign students");
			}
		});
	}

	// ====== Bulk assign faculty helpers ======

	function openBulkFacultyDialog(batch: BatchData) {
		setBulkFacultyBatchTarget(batch);
		setSelectedFacultyIds(new Set());
		setFacultySearchQuery("");
		setFacultyAssignmentFilter("all");
		setBulkFacultyDialogOpen(true);
	}

	// Faculty not already assigned to this batch
	const availableFacultyForBulk =
		bulkFacultyBatchTarget ?
			facultyUsers.filter(
				(f) =>
					!bulkFacultyBatchTarget.assignedFaculty.some((af) => af.id === f.id),
			)
		:	[];

	// Check if a faculty is assigned to any batch (for filter)
	const facultyBatchMap = new Map<string, string[]>();
	for (const b of batches) {
		for (const af of b.assignedFaculty) {
			const existing = facultyBatchMap.get(af.id) ?? [];
			existing.push(b.name);
			facultyBatchMap.set(af.id, existing);
		}
	}

	const filteredBulkFaculty = availableFacultyForBulk.filter((f) => {
		// Search filter
		if (facultySearchQuery) {
			const q = facultySearchQuery.toLowerCase();
			const matchesSearch =
				f.firstName.toLowerCase().includes(q) ||
				f.lastName.toLowerCase().includes(q) ||
				f.email.toLowerCase().includes(q);
			if (!matchesSearch) return false;
		}
		// Assignment filter
		if (facultyAssignmentFilter !== "all") {
			const hasAnyBatch = facultyBatchMap.has(f.id);
			if (facultyAssignmentFilter === "unassigned" && hasAnyBatch) return false;
			if (facultyAssignmentFilter === "assigned" && !hasAnyBatch) return false;
		}
		return true;
	});

	function toggleFaculty(id: string) {
		setSelectedFacultyIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAllFaculty() {
		if (selectedFacultyIds.size === filteredBulkFaculty.length) {
			setSelectedFacultyIds(new Set());
		} else {
			setSelectedFacultyIds(new Set(filteredBulkFaculty.map((f) => f.id)));
		}
	}

	function handleBulkAssignFaculty() {
		if (!bulkFacultyBatchTarget || selectedFacultyIds.size === 0) return;
		startTransition(async () => {
			try {
				const result = await bulkAssignFacultyToBatch(
					Array.from(selectedFacultyIds),
					bulkFacultyBatchTarget.id,
				);
				if (result.success) {
					toast.success(result.message);
					setBulkFacultyDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to assign faculty");
				}
			} catch {
				toast.error("Failed to assign faculty");
			}
		});
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">Batch Management</h3>
					<p className="text-sm text-muted-foreground">
						Create and manage student batches (cohorts). Each batch tracks
						semester progression.
					</p>
				</div>
				<Button onClick={openCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Create Batch
				</Button>
			</div>

			{/* Batches Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						All Batches ({batches.length})
					</CardTitle>
					<CardDescription>
						Click edit to modify batch details or toggle active status.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Batch Name</TableHead>
									<TableHead>Semester</TableHead>
									<TableHead>Start Date</TableHead>
									<TableHead>End Date</TableHead>
									<TableHead>Students</TableHead>
									<TableHead>Faculty</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{batches.length === 0 ?
									<TableRow>
										<TableCell colSpan={8} className="text-center py-12">
											<div className="flex flex-col items-center gap-2 text-muted-foreground">
												<FolderPlus className="h-8 w-8 opacity-50" />
												<p>No batches created yet</p>
												<Button
													variant="outline"
													size="sm"
													onClick={openCreate}
												>
													Create your first batch
												</Button>
											</div>
										</TableCell>
									</TableRow>
								:	batches.map((batch) => (
										<TableRow key={batch.id}>
											<TableCell>
												<div>
													<p className="font-medium">{batch.name}</p>
													{batch.description && (
														<p className="text-xs text-muted-foreground truncate max-w-48">
															{batch.description}
														</p>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													Sem {batch.currentSemester}
												</Badge>
											</TableCell>
											<TableCell className="text-sm">
												<div className="flex items-center gap-1 text-muted-foreground">
													<Calendar className="h-3 w-3" />
													{new Date(batch.startDate).toLocaleDateString()}
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{batch.endDate ?
													new Date(batch.endDate).toLocaleDateString()
												:	"—"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="flex items-center gap-1">
														<Users className="h-3.5 w-3.5 text-muted-foreground" />
														<span className="font-medium">
															{batch.studentCount}
														</span>
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-1.5 text-xs gap-1 text-blue-600 hover:text-blue-700"
														onClick={() => openBulkStudentDialog(batch)}
														disabled={isPending}
														title="Bulk assign students"
													>
														<UserPlus className="h-3 w-3" />
														Assign
													</Button>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<button
														onClick={() => openFacultyDialog(batch)}
														className="flex items-center gap-1 text-sm hover:underline cursor-pointer"
														disabled={isPending}
													>
														<UserCog className="h-3.5 w-3.5 text-muted-foreground" />
														<span className="font-medium">
															{batch.facultyCount}
														</span>
													</button>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-1.5 text-xs gap-1 text-purple-600 hover:text-purple-700"
														onClick={() => openBulkFacultyDialog(batch)}
														disabled={isPending}
														title="Bulk assign faculty"
													>
														<UserPlus className="h-3 w-3" />
														Assign
													</Button>
												</div>
											</TableCell>
											<TableCell>
												<button
													onClick={() => handleToggleActive(batch)}
													disabled={isPending}
													className="cursor-pointer"
												>
													{batch.isActive ?
														<Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 hover:bg-emerald-200 transition-colors">
															<CheckCircle2 className="h-3 w-3" />
															Active
														</Badge>
													:	<Badge
															variant="outline"
															className="text-muted-foreground gap-1 hover:bg-muted transition-colors"
														>
															<XCircle className="h-3 w-3" />
															Inactive
														</Badge>
													}
												</button>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="sm"
														className="h-7 w-7 p-0"
														onClick={() => openEdit(batch)}
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-7 w-7 p-0 text-destructive hover:text-destructive"
														onClick={() => openDelete(batch)}
														disabled={batch.studentCount > 0}
														title={
															batch.studentCount > 0 ?
																"Remove all students before deleting"
															:	"Delete batch"
														}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Create Batch Dialog */}
			<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FolderPlus className="h-5 w-5 text-blue-600" />
							Create New Batch
						</DialogTitle>
						<DialogDescription>
							Create a new student batch/cohort. Students can be assigned to
							this batch later.
						</DialogDescription>
					</DialogHeader>
					<BatchForm formState={formState} updateForm={updateForm} />
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={isPending || !formState.name || !formState.startDate}
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Create Batch
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Batch Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="h-5 w-5 text-blue-600" />
							Edit Batch
						</DialogTitle>
						<DialogDescription>
							Update batch details. Semester changes will not auto-update
							existing students.
						</DialogDescription>
					</DialogHeader>
					<BatchForm formState={formState} updateForm={updateForm} />
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEdit} disabled={isPending}>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<Trash2 className="h-5 w-5" />
							Delete Batch
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<strong>{deleteBatchTarget?.name}</strong>? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isPending}
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Faculty Assignment Dialog */}
			<Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserCog className="h-5 w-5 text-blue-600" />
							Manage Faculty — {facultyBatchTarget?.name}
						</DialogTitle>
						<DialogDescription>
							Assign or remove faculty members for this batch. Assigned faculty
							can view all students and their activity within this batch.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{/* Currently assigned faculty */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Assigned Faculty</Label>
							{facultyBatchTarget?.assignedFaculty?.length === 0 ?
								<p className="text-sm text-muted-foreground italic py-2">
									No faculty assigned to this batch yet.
								</p>
							:	<div className="space-y-1.5 max-h-40 overflow-y-auto">
									{facultyBatchTarget?.assignedFaculty?.map((faculty) => (
										<div
											key={faculty.id}
											className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50"
										>
											<div>
												<p className="text-sm font-medium">
													{faculty.firstName} {faculty.lastName}
												</p>
												<p className="text-xs text-muted-foreground">
													{faculty.email}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 w-7 p-0 text-destructive hover:text-destructive"
												onClick={() =>
													handleRemoveFaculty(faculty.id, facultyBatchTarget.id)
												}
												disabled={isPending}
												title="Remove from batch"
											>
												<X className="h-3.5 w-3.5" />
											</Button>
										</div>
									))}
								</div>
							}
						</div>

						{/* Add new faculty */}
						{availableFaculty.length > 0 && (
							<div className="space-y-2 border-t pt-4">
								<Label className="text-sm font-medium">Add Faculty</Label>
								<div className="flex gap-2">
									<Select
										value={selectedFacultyId}
										onValueChange={setSelectedFacultyId}
									>
										<SelectTrigger className="flex-1">
											<SelectValue placeholder="Select faculty member..." />
										</SelectTrigger>
										<SelectContent>
											{availableFaculty.map((f) => (
												<SelectItem key={f.id} value={f.id}>
													{f.firstName} {f.lastName} ({f.email})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										onClick={handleAssignFaculty}
										disabled={isPending || !selectedFacultyId}
										size="sm"
									>
										{isPending ?
											<Loader2 className="h-4 w-4 animate-spin" />
										:	<Plus className="h-4 w-4" />}
									</Button>
								</div>
							</div>
						)}

						{availableFaculty.length === 0 && facultyUsers.length > 0 && (
							<p className="text-xs text-muted-foreground border-t pt-3">
								All available faculty are already assigned to this batch.
							</p>
						)}

						{facultyUsers.length === 0 && (
							<p className="text-xs text-muted-foreground border-t pt-3">
								No faculty users found. Create users with the Faculty role
								first.
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setFacultyDialogOpen(false)}
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bulk Assign Students Dialog */}
			<Dialog
				open={bulkStudentDialogOpen}
				onOpenChange={setBulkStudentDialogOpen}
			>
				<DialogContent className="sm:max-w-lg max-h-[90vh]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Users className="h-5 w-5 text-blue-600" />
							Assign Students — {bulkStudentBatchTarget?.name}
						</DialogTitle>
						<DialogDescription>
							Select students to assign to this batch. Students already in this
							batch are excluded.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search students by name, email, or batch..."
								value={studentSearchQuery}
								onChange={(e) => setStudentSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Filters */}
						<div className="flex flex-wrap gap-2">
							<div className="flex items-center gap-1.5">
								<ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<span className="text-xs text-muted-foreground shrink-0">
									Filters:
								</span>
							</div>
							<Select
								value={studentAssignmentFilter}
								onValueChange={setStudentAssignmentFilter}
							>
								<SelectTrigger className="h-7 text-xs w-32.5">
									<SelectValue placeholder="Assignment" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Students</SelectItem>
									<SelectItem value="unassigned">No Batch</SelectItem>
									<SelectItem value="assigned">Has Batch</SelectItem>
								</SelectContent>
							</Select>
							{studentBatchOptions.length > 0 && (
								<Select
									value={studentBatchFilter}
									onValueChange={setStudentBatchFilter}
								>
									<SelectTrigger className="h-7 text-xs w-32.5">
										<SelectValue placeholder="Batch" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Batches</SelectItem>
										<SelectItem value="unassigned">No Batch</SelectItem>
										{studentBatchOptions.map((b) => (
											<SelectItem key={b} value={b}>
												{b}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{studentSemesterOptions.length > 0 && (
								<Select
									value={studentSemesterFilter}
									onValueChange={setStudentSemesterFilter}
								>
									<SelectTrigger className="h-7 text-xs w-28">
										<SelectValue placeholder="Semester" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Semesters</SelectItem>
										{studentSemesterOptions.map((sem) => (
											<SelectItem key={sem} value={sem.toString()}>
												Semester {sem}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{(studentBatchFilter !== "all" ||
								studentSemesterFilter !== "all" ||
								studentAssignmentFilter !== "all") && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-xs text-muted-foreground"
									onClick={() => {
										setStudentBatchFilter("all");
										setStudentSemesterFilter("all");
										setStudentAssignmentFilter("all");
									}}
								>
									<X className="h-3 w-3 mr-1" />
									Clear
								</Button>
							)}
						</div>

						{/* Select all / count */}
						<div className="flex items-center justify-between px-1">
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox
									checked={
										filteredBulkStudents.length > 0 &&
										selectedStudentIds.size === filteredBulkStudents.length
									}
									onCheckedChange={toggleAllStudents}
								/>
								Select All
							</label>
							<span className="text-xs text-muted-foreground">
								{selectedStudentIds.size} of {filteredBulkStudents.length}{" "}
								selected
							</span>
						</div>

						{/* Student list */}
						<ScrollArea className="h-64 border rounded-md">
							{filteredBulkStudents.length === 0 ?
								<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
									<Users className="h-6 w-6 opacity-50 mb-2" />
									<p className="text-sm">
										{availableStudentsForBulk.length === 0 ?
											"All students are already in this batch"
										:	"No students match your search"}
									</p>
								</div>
							:	<div className="divide-y">
									{filteredBulkStudents.map((student) => (
										<label
											key={student.id}
											className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
										>
											<Checkbox
												checked={selectedStudentIds.has(student.id)}
												onCheckedChange={() => toggleStudent(student.id)}
											/>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{student.firstName} {student.lastName}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{student.email}
												</p>
											</div>
											{student.batch && (
												<Badge variant="outline" className="text-xs shrink-0">
													{student.batch}
												</Badge>
											)}
											{student.currentSemester && (
												<Badge variant="secondary" className="text-xs shrink-0">
													Sem {student.currentSemester}
												</Badge>
											)}
										</label>
									))}
								</div>
							}
						</ScrollArea>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setBulkStudentDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkAssignStudents}
							disabled={isPending || selectedStudentIds.size === 0}
							className="gap-2"
						>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Assign{" "}
							{selectedStudentIds.size > 0 ? selectedStudentIds.size : ""}{" "}
							Student{selectedStudentIds.size !== 1 ? "s" : ""}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bulk Assign Faculty Dialog */}
			<Dialog
				open={bulkFacultyDialogOpen}
				onOpenChange={setBulkFacultyDialogOpen}
			>
				<DialogContent className="sm:max-w-lg max-h-[90vh]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserCog className="h-5 w-5 text-purple-600" />
							Assign Faculty — {bulkFacultyBatchTarget?.name}
						</DialogTitle>
						<DialogDescription>
							Select faculty members to assign to this batch. Already-assigned
							faculty are excluded.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search faculty by name or email..."
								value={facultySearchQuery}
								onChange={(e) => setFacultySearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Filters */}
						<div className="flex flex-wrap items-center gap-2">
							<div className="flex items-center gap-1.5">
								<ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<span className="text-xs text-muted-foreground shrink-0">
									Filter:
								</span>
							</div>
							<Select
								value={facultyAssignmentFilter}
								onValueChange={setFacultyAssignmentFilter}
							>
								<SelectTrigger className="h-7 text-xs w-40">
									<SelectValue placeholder="Assignment" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Faculty</SelectItem>
									<SelectItem value="unassigned">No Batches Yet</SelectItem>
									<SelectItem value="assigned">Has Other Batches</SelectItem>
								</SelectContent>
							</Select>
							{facultyAssignmentFilter !== "all" && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-xs text-muted-foreground"
									onClick={() => setFacultyAssignmentFilter("all")}
								>
									<X className="h-3 w-3 mr-1" />
									Clear
								</Button>
							)}
						</div>

						{/* Select all / count */}
						<div className="flex items-center justify-between px-1">
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox
									checked={
										filteredBulkFaculty.length > 0 &&
										selectedFacultyIds.size === filteredBulkFaculty.length
									}
									onCheckedChange={toggleAllFaculty}
								/>
								Select All
							</label>
							<span className="text-xs text-muted-foreground">
								{selectedFacultyIds.size} of {filteredBulkFaculty.length}{" "}
								selected
							</span>
						</div>

						{/* Faculty list */}
						<ScrollArea className="h-64 border rounded-md">
							{filteredBulkFaculty.length === 0 ?
								<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
									<UserCog className="h-6 w-6 opacity-50 mb-2" />
									<p className="text-sm">
										{availableFacultyForBulk.length === 0 ?
											"All faculty are already assigned to this batch"
										:	"No faculty match your search"}
									</p>
								</div>
							:	<div className="divide-y">
									{filteredBulkFaculty.map((faculty) => (
										<label
											key={faculty.id}
											className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
										>
											<Checkbox
												checked={selectedFacultyIds.has(faculty.id)}
												onCheckedChange={() => toggleFaculty(faculty.id)}
											/>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{faculty.firstName} {faculty.lastName}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{faculty.email}
												</p>
											</div>
											{facultyBatchMap.has(faculty.id) && (
												<Badge variant="outline" className="text-xs shrink-0">
													{facultyBatchMap.get(faculty.id)!.length} batch
													{facultyBatchMap.get(faculty.id)!.length !== 1 ?
														"es"
													:	""}
												</Badge>
											)}
										</label>
									))}
								</div>
							}
						</ScrollArea>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setBulkFacultyDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkAssignFaculty}
							disabled={isPending || selectedFacultyIds.size === 0}
							className="gap-2"
						>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Assign{" "}
							{selectedFacultyIds.size > 0 ? selectedFacultyIds.size : ""}{" "}
							Faculty
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== BATCH FORM (Shared) ========================

function BatchForm({
	formState,
	updateForm,
}: {
	formState: BatchFormState;
	updateForm: (field: keyof BatchFormState, value: string) => void;
}) {
	return (
		<div className="space-y-4 py-2">
			<div className="space-y-2">
				<Label>
					Batch Name <span className="text-destructive">*</span>
				</Label>
				<Input
					value={formState.name}
					onChange={(e) => updateForm("name", e.target.value)}
					placeholder='e.g., "July 2024", "January 2025"'
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>
						Start Date <span className="text-destructive">*</span>
					</Label>
					<Input
						type="date"
						value={formState.startDate}
						onChange={(e) => updateForm("startDate", e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label>End Date</Label>
					<Input
						type="date"
						value={formState.endDate}
						onChange={(e) => updateForm("endDate", e.target.value)}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Current Semester</Label>
				<Select
					value={formState.currentSemester}
					onValueChange={(v) => updateForm("currentSemester", v)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select semester" />
					</SelectTrigger>
					<SelectContent>
						{[1, 2, 3, 4, 5, 6].map((sem) => (
							<SelectItem key={sem} value={sem.toString()}>
								Semester {sem}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					value={formState.description}
					onChange={(e) => updateForm("description", e.target.value)}
					placeholder="Optional description for this batch..."
					rows={2}
				/>
			</div>
		</div>
	);
}
