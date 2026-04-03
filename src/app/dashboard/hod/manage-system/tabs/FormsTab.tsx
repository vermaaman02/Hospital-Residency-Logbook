/**
 * @module FormsTab
 * @description Form definitions management — view all forms,
 * toggle globally, and see per-department status.
 */

"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { FormDefinitionData, DepartmentData } from "../ManageSystemClient";
import { toggleFormDefinition } from "@/actions/form-definitions";
import { toggleFormForDepartment } from "@/actions/department-management";

interface FormsTabProps {
	formDefinitions: FormDefinitionData[];
	departments: DepartmentData[];
}

export function FormsTab({ formDefinitions, departments }: FormsTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	// Group forms by category
	const categories = Array.from(
		new Set(formDefinitions.map((f) => f.category).filter(Boolean)),
	) as string[];

	const filteredForms =
		categoryFilter === "all"
			? formDefinitions
			: formDefinitions.filter((f) => f.category === categoryFilter);

	function handleGlobalToggle(formId: string, isActive: boolean) {
		startTransition(async () => {
			try {
				await toggleFormDefinition(formId, isActive);
				toast.success(
					isActive ? "Form enabled globally" : "Form disabled globally",
				);
				router.refresh();
			} catch {
				toast.error("Failed to toggle form");
			}
		});
	}

	function handleDeptToggle(
		deptId: string,
		formDefId: string,
		isActive: boolean,
	) {
		startTransition(async () => {
			try {
				await toggleFormForDepartment(deptId, formDefId, isActive);
				router.refresh();
			} catch {
				toast.error("Failed to toggle form for department");
			}
		});
	}

	// Build a lookup: formDefId → { deptId → isActive }
	const formDeptStatusMap = new Map<string, Map<string, boolean>>();
	for (const dept of departments) {
		for (const df of dept.forms) {
			if (!formDeptStatusMap.has(df.formDefinitionId)) {
				formDeptStatusMap.set(df.formDefinitionId, new Map());
			}
			formDeptStatusMap.get(df.formDefinitionId)!.set(dept.id, df.isActive);
		}
	}

	const categoryColors: Record<string, string> = {
		Academic: "bg-blue-100 text-blue-800",
		Clinical: "bg-green-100 text-green-800",
		Professional: "bg-purple-100 text-purple-800",
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div>
				<h3 className="text-lg font-semibold">Form Definitions</h3>
				<p className="text-sm text-muted-foreground">
					View all {formDefinitions.length} form types. Toggle globally or per-department.
				</p>
			</div>

			{/* Category filter */}
			<div className="flex items-center gap-2">
				<button
					onClick={() => setCategoryFilter("all")}
					className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
						categoryFilter === "all"
							? "bg-gray-900 text-white"
							: "bg-gray-100 text-gray-600 hover:bg-gray-200"
					}`}
				>
					All ({formDefinitions.length})
				</button>
				{categories.map((cat) => (
					<button
						key={cat}
						onClick={() => setCategoryFilter(cat)}
						className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
							categoryFilter === cat
								? "bg-gray-900 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{cat} (
						{formDefinitions.filter((f) => f.category === cat).length})
					</button>
				))}
			</div>

			{/* Forms Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						{categoryFilter === "all" ? "All Forms" : categoryFilter} (
						{filteredForms.length})
					</CardTitle>
					<CardDescription>
						Toggle the &quot;Global&quot; switch to enable/disable a form system-wide.
						Per-department columns show individual access control.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="min-w-[200px]">Form</TableHead>
									<TableHead>Category</TableHead>
									<TableHead className="text-center">Global</TableHead>
									{departments.map((dept) => (
										<TableHead key={dept.id} className="text-center min-w-[100px]">
											<div className="flex flex-col items-center gap-0.5">
												<span className="text-[10px] font-mono text-muted-foreground">
													{dept.code}
												</span>
												<span className="text-xs truncate max-w-[90px]">
													{dept.name}
												</span>
											</div>
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredForms.map((formDef) => (
									<TableRow key={formDef.id}>
										<TableCell>
											<div>
												<p className="font-medium text-sm">{formDef.title}</p>
												<p className="text-[10px] text-muted-foreground font-mono">
													{formDef.slug}
												</p>
											</div>
										</TableCell>
										<TableCell>
											{formDef.category && (
												<Badge
													className={`text-[10px] ${
														categoryColors[formDef.category] ?? "bg-gray-100 text-gray-800"
													}`}
												>
													{formDef.category}
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-center">
											<Switch
												checked={formDef.isActive}
												onCheckedChange={(checked) =>
													handleGlobalToggle(formDef.id, checked)
												}
												disabled={isPending}
											/>
										</TableCell>
										{departments.map((dept) => {
											const deptStatus =
												formDeptStatusMap.get(formDef.id)?.get(dept.id) ?? false;
											return (
												<TableCell key={dept.id} className="text-center">
													<Switch
														checked={deptStatus}
														onCheckedChange={(checked) =>
															handleDeptToggle(dept.id, formDef.id, checked)
														}
														disabled={isPending || !formDef.isActive}
													/>
												</TableCell>
											);
										})}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
