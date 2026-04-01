/**
 * @module DepartmentsTab
 * @description Department management — create, edit, delete departments,
 * assign batches, toggle forms. Card-based layout.
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
	Plus,
	Pencil,
	Trash2,
	Loader2,
	Building2,
	CheckCircle2,
	XCircle,
	Link2,
	Unlink,
	FileStack,
	Users,
	GraduationCap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
	DepartmentData,
	FormDefinitionData,
	BatchDataSimple,
} from "../ManageSystemClient";
import {
	createDepartment,
	updateDepartment,
	deleteDepartment,
	assignBatchToDepartment,
	removeBatchFromDepartment,
	toggleFormForDepartment,
	enableAllFormsForDepartment,
} from "@/actions/department-management";

interface DepartmentsTabProps {
	departments: DepartmentData[];
	batches: BatchDataSimple[];
	formDefinitions: FormDefinitionData[];
}

interface DeptFormState {
	name: string;
	code: string;
	description: string;
}

const emptyForm: DeptFormState = { name: "", code: "", description: "" };

export function DepartmentsTab({
	departments,
	batches,
	formDefinitions,
}: DepartmentsTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Create / Edit / Delete dialogs
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [formState, setFormState] = useState<DeptFormState>(emptyForm);
	const [editDeptId, setEditDeptId] = useState<string | null>(null);
	const [deleteDeptTarget, setDeleteDeptTarget] =
		useState<DepartmentData | null>(null);

	// Batch assignment dialog
	const [batchDialogOpen, setBatchDialogOpen] = useState(false);
	const [batchDeptId, setBatchDeptId] = useState<string | null>(null);
	const batchDeptTarget = departments.find((d) => d.id === batchDeptId) || null;

	// Forms management dialog
	const [formsDialogOpen, setFormsDialogOpen] = useState(false);
	const [formsDeptId, setFormsDeptId] = useState<string | null>(null);
	const formsDeptTarget = departments.find((d) => d.id === formsDeptId) || null;

	function updateForm(field: keyof DeptFormState, value: string) {
		setFormState((prev) => ({ ...prev, [field]: value }));
	}

	// ====== CREATE ======
	function openCreate() {
		setFormState(emptyForm);
		setCreateDialogOpen(true);
	}

	function handleCreate() {
		if (!formState.name || !formState.code) {
			toast.error("Name and code are required");
			return;
		}
		startTransition(async () => {
			try {
				const result = await createDepartment({
					name: formState.name,
					code: formState.code,
					description: formState.description || undefined,
				});
				if (result.success) {
					toast.success(`Department "${formState.name}" created`);
					setCreateDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to create");
				}
			} catch {
				toast.error("Failed to create department");
			}
		});
	}

	// ====== EDIT ======
	function openEdit(dept: DepartmentData) {
		setEditDeptId(dept.id);
		setFormState({
			name: dept.name,
			code: dept.code,
			description: dept.description ?? "",
		});
		setEditDialogOpen(true);
	}

	function handleEdit() {
		if (!editDeptId) return;
		startTransition(async () => {
			try {
				const result = await updateDepartment({
					id: editDeptId,
					name: formState.name || undefined,
					code: formState.code || undefined,
					description: formState.description || undefined,
				});
				if (result.success) {
					toast.success("Department updated");
					setEditDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to update");
				}
			} catch {
				toast.error("Failed to update department");
			}
		});
	}

	// ====== DELETE ======
	function openDelete(dept: DepartmentData) {
		setDeleteDeptTarget(dept);
		setDeleteDialogOpen(true);
	}

	function handleDelete() {
		if (!deleteDeptTarget) return;
		startTransition(async () => {
			try {
				const result = await deleteDepartment(deleteDeptTarget.id);
				if (result.success) {
					toast.success(`Department "${deleteDeptTarget.name}" deleted`);
					setDeleteDialogOpen(false);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to delete");
				}
			} catch {
				toast.error("Failed to delete department");
			}
		});
	}

	// ====== TOGGLE ACTIVE ======
	function handleToggleActive(dept: DepartmentData) {
		startTransition(async () => {
			try {
				const result = await updateDepartment({
					id: dept.id,
					isActive: !dept.isActive,
				});
				if (result.success) {
					toast.success(
						`Department "${dept.name}" ${dept.isActive ? "deactivated" : "activated"}`,
					);
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to update");
				}
			} catch {
				toast.error("Failed to update department");
			}
		});
	}

	function openBatchDialog(dept: DepartmentData) {
		setBatchDeptId(dept.id);
		setBatchDialogOpen(true);
	}

	function handleAssignBatch(batchId: string) {
		if (!batchDeptTarget) return;
		startTransition(async () => {
			try {
				const result = await assignBatchToDepartment(
					batchId,
					batchDeptTarget.id,
				);
				if (result.success) {
					toast.success("Batch assigned to department");
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to assign");
				}
			} catch {
				toast.error("Failed to assign batch");
			}
		});
	}

	function handleRemoveBatch(batchId: string) {
		if (!batchDeptTarget) return;
		startTransition(async () => {
			try {
				const result = await removeBatchFromDepartment(
					batchId,
					batchDeptTarget.id,
				);
				if (result.success) {
					toast.success("Batch removed from department");
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to remove");
				}
			} catch {
				toast.error("Failed to remove batch");
			}
		});
	}

	function openFormsDialog(dept: DepartmentData) {
		setFormsDeptId(dept.id);
		setFormsDialogOpen(true);
	}

	function handleToggleForm(formDefId: string, isActive: boolean) {
		if (!formsDeptTarget) return;
		startTransition(async () => {
			try {
				await toggleFormForDepartment(formsDeptTarget.id, formDefId, isActive);
				router.refresh();
			} catch {
				toast.error("Failed to toggle form");
			}
		});
	}

	function handleEnableAllForms() {
		if (!formsDeptTarget) return;
		startTransition(async () => {
			try {
				const result = await enableAllFormsForDepartment(formsDeptTarget.id);
				if (result.success) {
					toast.success(result.message);
					router.refresh();
				}
			} catch {
				toast.error("Failed to enable forms");
			}
		});
	}

	// Unassigned batches for the batch dialog
	const assignedBatchIds = batchDeptTarget
		? new Set(batchDeptTarget.batches.map((b) => b.id))
		: new Set<string>();
	const unassignedBatches = batches.filter((b) => !assignedBatchIds.has(b.id));

	// Active form slugs for the forms dialog
	const activeFormSlugsForDept = formsDeptTarget
		? new Set(formsDeptTarget.forms.filter((f) => f.isActive).map((f) => f.slug))
		: new Set<string>();

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">Departments</h3>
					<p className="text-sm text-muted-foreground">
						Create and manage departments. Assign batches and control form access.
					</p>
				</div>
				<Button onClick={openCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Create Department
				</Button>
			</div>

			{/* Department Cards Grid */}
			{departments.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<div className="flex flex-col items-center gap-3 text-muted-foreground">
							<Building2 className="h-10 w-10 opacity-40" />
							<p>No departments created yet</p>
							<Button variant="outline" size="sm" onClick={openCreate}>
								Create your first department
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{departments.map((dept) => (
						<Card
							key={dept.id}
							className={`relative overflow-hidden transition-all hover:shadow-md ${
								!dept.isActive ? "opacity-60" : ""
							}`}
						>
							{/* Color bar */}
							<div className="h-1 bg-red-500" />

							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="space-y-1">
										<CardTitle className="text-base flex items-center gap-2">
											{dept.name}
											<Badge variant="outline" className="text-[10px] font-mono">
												{dept.code}
											</Badge>
										</CardTitle>
										{dept.description && (
											<CardDescription className="text-xs line-clamp-2">
												{dept.description}
											</CardDescription>
										)}
									</div>
									<button
										onClick={() => handleToggleActive(dept)}
										disabled={isPending}
										className="cursor-pointer"
									>
										{dept.isActive ? (
											<Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-[10px]">
												<CheckCircle2 className="h-2.5 w-2.5" />
												Active
											</Badge>
										) : (
											<Badge
												variant="outline"
												className="text-muted-foreground gap-1 text-[10px]"
											>
												<XCircle className="h-2.5 w-2.5" />
												Inactive
											</Badge>
										)}
									</button>
								</div>
							</CardHeader>

							<CardContent className="space-y-3">
								{/* Stats */}
								<div className="grid grid-cols-3 gap-2 text-center">
									<div className="rounded-lg bg-orange-50 p-2">
										<p className="text-lg font-bold text-orange-700">
											{dept.batchCount}
										</p>
										<p className="text-[10px] text-orange-600 font-medium">
											Batches
										</p>
									</div>
									<div className="rounded-lg bg-yellow-50 p-2">
										<p className="text-lg font-bold text-yellow-700">
											{dept.forms.filter((f) => f.isActive).length}
										</p>
										<p className="text-[10px] text-yellow-600 font-medium">
											Forms
										</p>
									</div>
									<div className="rounded-lg bg-green-50 p-2">
										<p className="text-lg font-bold text-green-700">
											{dept.userCount}
										</p>
										<p className="text-[10px] text-green-600 font-medium">
											Users
										</p>
									</div>
								</div>

								{/* Assigned batches pills */}
								{dept.batches.length > 0 && (
									<div className="space-y-1">
										<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
											Linked Batches
										</p>
										<div className="flex flex-wrap gap-1">
											{dept.batches.map((b) => (
												<Badge
													key={b.id}
													variant="secondary"
													className="text-[10px] gap-1"
												>
													{b.name}
													<span className="text-muted-foreground">
														({b.studentCount}S / {b.facultyCount}F)
													</span>
												</Badge>
											))}
										</div>
									</div>
								)}

								{/* Actions */}
								<div className="flex items-center gap-1 pt-2 border-t">
									<Button
										variant="ghost"
										size="sm"
										className="h-7 gap-1 text-xs text-blue-600"
										onClick={() => openBatchDialog(dept)}
										disabled={isPending}
									>
										<Link2 className="h-3 w-3" />
										Batches
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 gap-1 text-xs text-yellow-600"
										onClick={() => openFormsDialog(dept)}
										disabled={isPending}
									>
										<FileStack className="h-3 w-3" />
										Forms
									</Button>
									<div className="flex-1" />
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-7 p-0"
										onClick={() => openEdit(dept)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-7 p-0 text-destructive hover:text-destructive"
										onClick={() => openDelete(dept)}
										disabled={
											dept.userCount > 0 || dept.batchCount > 0
										}
										title={
											dept.userCount > 0 || dept.batchCount > 0
												? "Remove all users and batches before deleting"
												: "Delete department"
										}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* ====== CREATE DIALOG ====== */}
			<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Building2 className="h-5 w-5 text-red-600" />
							Create Department
						</DialogTitle>
						<DialogDescription>
							Create a new department. You can assign batches and forms after creation.
						</DialogDescription>
					</DialogHeader>
					<DeptForm formState={formState} updateForm={updateForm} />
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={isPending || !formState.name || !formState.code}
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ====== EDIT DIALOG ====== */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="h-5 w-5 text-blue-600" />
							Edit Department
						</DialogTitle>
					</DialogHeader>
					<DeptForm formState={formState} updateForm={updateForm} />
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleEdit} disabled={isPending}>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ====== DELETE DIALOG ====== */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<Trash2 className="h-5 w-5" />
							Delete Department
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<strong>{deleteDeptTarget?.name}</strong>? This action cannot be
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

			{/* ====== BATCH ASSIGNMENT DIALOG ====== */}
			<Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Link2 className="h-5 w-5 text-orange-600" />
							Manage Batches — {batchDeptTarget?.name}
						</DialogTitle>
						<DialogDescription>
							Assign or remove batches for this department. Students in assigned
							batches will see forms enabled for this department.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{/* Currently assigned */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Assigned Batches</Label>
							{batchDeptTarget?.batches.length === 0 ? (
								<p className="text-sm text-muted-foreground italic py-2">
									No batches assigned yet
								</p>
							) : (
								<div className="space-y-1">
									{batchDeptTarget?.batches.map((b) => (
										<div
											key={b.id}
											className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
										>
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-orange-500" />
												<span className="text-sm font-medium">{b.name}</span>
												<Badge
													variant="secondary"
													className="text-[10px] gap-1"
												>
													<Users className="h-2.5 w-2.5" />
													{b.studentCount}
												</Badge>
												<Badge
													variant="secondary"
													className="text-[10px] gap-1"
												>
													<GraduationCap className="h-2.5 w-2.5" />
													{b.facultyCount}
												</Badge>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 gap-1 text-xs text-destructive"
												onClick={() => handleRemoveBatch(b.id)}
												disabled={isPending}
											>
												<Unlink className="h-3 w-3" />
												Remove
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Unassigned batches */}
						{unassignedBatches.length > 0 && (
							<div className="space-y-2">
								<Label className="text-sm font-medium">Available Batches</Label>
								<ScrollArea className="max-h-48">
									<div className="space-y-1">
										{unassignedBatches.map((b) => (
											<div
												key={b.id}
												className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30"
											>
												<div className="flex items-center gap-2">
													<span className="text-sm">{b.name}</span>
													<Badge
														variant="outline"
														className="text-[10px]"
													>
														Sem {b.currentSemester}
													</Badge>
												</div>
												<Button
													variant="outline"
													size="sm"
													className="h-6 gap-1 text-xs"
													onClick={() => handleAssignBatch(b.id)}
													disabled={isPending}
												>
													<Link2 className="h-3 w-3" />
													Assign
												</Button>
											</div>
										))}
									</div>
								</ScrollArea>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* ====== FORMS MANAGEMENT DIALOG ====== */}
			<Dialog open={formsDialogOpen} onOpenChange={setFormsDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileStack className="h-5 w-5 text-yellow-600" />
							Manage Forms — {formsDeptTarget?.name}
						</DialogTitle>
						<DialogDescription>
							Toggle which forms students in this department can access.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<Button
							variant="outline"
							size="sm"
							className="gap-1 text-xs"
							onClick={handleEnableAllForms}
							disabled={isPending}
						>
							{isPending && <Loader2 className="h-3 w-3 animate-spin" />}
							Enable All Forms
						</Button>
						<ScrollArea className="h-[400px] sm:max-h-[60vh] pr-4">
							<div className="space-y-1">
								{formDefinitions
									.filter((f) => f.isActive)
									.map((formDef) => {
										const isEnabled = activeFormSlugsForDept.has(formDef.slug);
										const deptForm = formsDeptTarget?.forms.find(
											(f) => f.formDefinitionId === formDef.id,
										);
										return (
											<div
												key={formDef.id}
												className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30"
											>
												<div className="flex items-center gap-2">
													<div
														className={`w-2 h-2 rounded-full ${
															isEnabled ? "bg-emerald-500" : "bg-gray-300"
														}`}
													/>
													<div>
														<p className="text-sm font-medium">
															{formDef.title}
														</p>
														<p className="text-[10px] text-muted-foreground">
															{formDef.category}
														</p>
													</div>
												</div>
												<Switch
													checked={isEnabled}
													onCheckedChange={(checked) =>
														handleToggleForm(formDef.id, checked)
													}
													disabled={isPending}
												/>
											</div>
										);
									})}
							</div>
						</ScrollArea>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== DEPARTMENT FORM FIELDS ========================

function DeptForm({
	formState,
	updateForm,
}: {
	formState: DeptFormState;
	updateForm: (field: keyof DeptFormState, value: string) => void;
}) {
	return (
		<div className="space-y-4 py-2">
			<div className="space-y-2">
				<Label htmlFor="dept-name">Department Name *</Label>
				<Input
					id="dept-name"
					value={formState.name}
					onChange={(e) => updateForm("name", e.target.value)}
					placeholder="e.g., Emergency Medicine"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="dept-code">Code * (max 10 chars, auto-uppercased)</Label>
				<Input
					id="dept-code"
					value={formState.code}
					onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
					placeholder="e.g., EM"
					maxLength={10}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="dept-desc">Description (optional)</Label>
				<Textarea
					id="dept-desc"
					value={formState.description}
					onChange={(e) => updateForm("description", e.target.value)}
					placeholder="Brief description of the department"
					rows={3}
				/>
			</div>
		</div>
	);
}
