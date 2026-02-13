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
} from "@/actions/batch-management";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { BatchData, UserData } from "../ManageUsersClient";

interface BatchesTabProps {
	batches: BatchData[];
	facultyUsers: UserData[];
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

export function BatchesTab({ batches, facultyUsers }: BatchesTabProps) {
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
												<div className="flex items-center gap-1">
													<Users className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="font-medium">
														{batch.studentCount}
													</span>
												</div>
											</TableCell>
											<TableCell>
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
