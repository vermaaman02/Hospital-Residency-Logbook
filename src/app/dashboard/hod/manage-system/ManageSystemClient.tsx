/**
 * @module ManageSystemClient
 * @description Tab-based client component for system management.
 * Tabs: Departments (with React Flow canvas), Forms.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileStack, Network } from "lucide-react";
import { DepartmentsTab } from "./tabs/DepartmentsTab";
import { FormsTab } from "./tabs/FormsTab";
import { SystemCanvas } from "./tabs/SystemCanvas";

// ======================== TYPES ========================

export interface DepartmentBatchData {
	id: string;
	name: string;
	isActive: boolean;
	currentSemester: number;
	studentCount: number;
	facultyCount: number;
}

export interface DepartmentFormData {
	id: string;
	formDefinitionId: string;
	slug: string;
	title: string;
	category: string | null;
	icon: string | null;
	isActive: boolean;
}

export interface DepartmentData {
	id: string;
	name: string;
	code: string;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	batchCount: number;
	formCount: number;
	userCount: number;
	batches: DepartmentBatchData[];
	forms: DepartmentFormData[];
}

export interface FormDefinitionData {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	category: string | null;
	icon: string | null;
	route: string;
	isActive: boolean;
	sortOrder: number;
	departmentCount: number;
}

export interface BatchDataSimple {
	id: string;
	name: string;
	currentSemester: number;
	startDate: string;
	endDate: string | null;
	isActive: boolean;
	description: string | null;
	studentCount: number;
	facultyCount: number;
	assignedFaculty: { id: string; firstName: string; lastName: string; email: string }[];
	createdAt: string;
}

interface ManageSystemClientProps {
	departments: DepartmentData[];
	formDefinitions: FormDefinitionData[];
	batches: BatchDataSimple[];
}

export function ManageSystemClient({
	departments,
	formDefinitions,
	batches,
}: ManageSystemClientProps) {
	return (
		<div className="space-y-6">
			{/* Stats Row */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<StatCard
					label="Departments"
					value={departments.length}
					color="red"
				/>
				<StatCard
					label="Active Forms"
					value={formDefinitions.filter((f) => f.isActive).length}
					color="yellow"
				/>
				<StatCard
					label="Total Batches"
					value={batches.length}
					color="orange"
				/>
				<StatCard
					label="Dept-Batch Links"
					value={departments.reduce((sum, d) => sum + d.batchCount, 0)}
					color="blue"
				/>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="canvas" className="space-y-4">
				<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
					<TabsTrigger value="canvas" className="gap-2 text-xs sm:text-sm">
						<Network className="h-4 w-4 hidden sm:block" />
						Canvas
					</TabsTrigger>
					<TabsTrigger value="departments" className="gap-2 text-xs sm:text-sm">
						<Building2 className="h-4 w-4 hidden sm:block" />
						Departments
					</TabsTrigger>
					<TabsTrigger value="forms" className="gap-2 text-xs sm:text-sm">
						<FileStack className="h-4 w-4 hidden sm:block" />
						Forms
					</TabsTrigger>
				</TabsList>

				<TabsContent value="canvas">
					<SystemCanvas
						departments={departments}
						batches={batches}
						unassignedUserCount={0}
					/>
				</TabsContent>

				<TabsContent value="departments">
					<DepartmentsTab
						departments={departments}
						batches={batches}
						formDefinitions={formDefinitions}
					/>
				</TabsContent>

				<TabsContent value="forms">
					<FormsTab
						formDefinitions={formDefinitions}
						departments={departments}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ======================== STAT CARD ========================

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: "blue" | "red" | "yellow" | "orange";
}) {
	const colorMap = {
		blue: "bg-blue-50 border-blue-200 text-blue-700",
		red: "bg-red-50 border-red-200 text-red-700",
		yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
		orange: "bg-orange-50 border-orange-200 text-orange-700",
	};

	return (
		<div className={`rounded-lg border p-4 ${colorMap[color]}`}>
			<p className="text-sm font-medium opacity-80">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
