/**
 * @module SystemCanvas
 * @description React Flow canvas visualization of the Department → Batch → User hierarchy.
 * Shows interactive nodes for Departments, Batches, Faculty, Students, and Forms
 * with edges representing relationships.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	type Node,
	type Edge,
	type NodeTypes,
	Handle,
	Position,
	MarkerType,
	Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	Building2,
	Users,
	GraduationCap,
	FileText,
	UserCircle,
	AlertTriangle,
	RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
	DepartmentData,
	BatchDataSimple,
	FormDefinitionData,
} from "../ManageSystemClient";

// ======================== NODE COLORS (from stitch DESIGN.md) ========================
const NODE_COLORS = {
	department: { bg: "#fef2f2", border: "#fecaca", accent: "#ef4444", text: "#dc2626" },
	batch: { bg: "#fffbeb", border: "#fed7aa", accent: "#f59e0b", text: "#d97706" },
	faculty: { bg: "#eff6ff", border: "#bfdbfe", accent: "#3b82f6", text: "#2563eb" },
	student: { bg: "#ecfdf5", border: "#a7f3d0", accent: "#10b981", text: "#059669" },
	form: { bg: "#fefce8", border: "#fde68a", accent: "#eab308", text: "#ca8a04" },
	unassigned: { bg: "#fef3c7", border: "#fde68a", accent: "#f59e0b", text: "#92400e" },
};

// ======================== CUSTOM NODES ========================

function DepartmentNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-lg overflow-hidden bg-white min-w-[200px] transition-all hover:shadow-xl"
			style={{ borderTop: `3px solid ${NODE_COLORS.department.accent}` }}
		>
			<Handle type="source" position={Position.Bottom} className="!bg-red-500 !w-2 !h-2" />
			<div className="p-3">
				<div className="flex items-center gap-2">
					<div
						className="w-8 h-8 rounded-lg flex items-center justify-center"
						style={{ backgroundColor: NODE_COLORS.department.bg }}
					>
						<Building2 className="h-4 w-4" style={{ color: NODE_COLORS.department.accent }} />
					</div>
					<div>
						<p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NODE_COLORS.department.text }}>
							Department
						</p>
						<p className="text-sm font-bold text-gray-900">{data.label as string}</p>
					</div>
				</div>
				<div className="flex gap-2 mt-2">
					<Badge variant="outline" className="text-[9px] gap-0.5 px-1">
						<Users className="h-2.5 w-2.5" /> {data.batchCount as number} batches
					</Badge>
					<Badge variant="outline" className="text-[9px] gap-0.5 px-1">
						<FileText className="h-2.5 w-2.5" /> {data.formCount as number} forms
					</Badge>
				</div>
			</div>
		</div>
	);
}

function BatchNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-md overflow-hidden bg-white min-w-[180px] transition-all hover:shadow-lg"
			style={{ borderTop: `3px solid ${NODE_COLORS.batch.accent}` }}
		>
			<Handle type="target" position={Position.Top} className="!bg-orange-500 !w-2 !h-2" />
			<Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-2 !h-2" />
			<div className="p-3">
				<div className="flex items-center gap-2">
					<div
						className="w-7 h-7 rounded-lg flex items-center justify-center"
						style={{ backgroundColor: NODE_COLORS.batch.bg }}
					>
						<GraduationCap className="h-3.5 w-3.5" style={{ color: NODE_COLORS.batch.accent }} />
					</div>
					<div>
						<p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: NODE_COLORS.batch.text }}>
							Batch
						</p>
						<p className="text-xs font-bold text-gray-900">{data.label as string}</p>
					</div>
				</div>
				<div className="flex gap-2 mt-1.5">
					<span className="text-[9px] text-gray-500">
						Sem {data.semester as number} · {data.studentCount as number}S / {data.facultyCount as number}F
					</span>
				</div>
			</div>
		</div>
	);
}

function FacultyNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-sm overflow-hidden bg-white min-w-[160px] transition-all hover:shadow-md"
			style={{ borderTop: `3px solid ${NODE_COLORS.faculty.accent}` }}
		>
			<Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2 !h-2" />
			<div className="p-2.5">
				<div className="flex items-center gap-2">
					<div
						className="w-6 h-6 rounded-lg flex items-center justify-center"
						style={{ backgroundColor: NODE_COLORS.faculty.bg }}
					>
						<UserCircle className="h-3 w-3" style={{ color: NODE_COLORS.faculty.accent }} />
					</div>
					<div>
						<p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: NODE_COLORS.faculty.text }}>
							Faculty
						</p>
						<p className="text-[11px] font-semibold text-gray-900">{data.label as string}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function StudentNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-sm overflow-hidden bg-white min-w-[150px] transition-all hover:shadow-md"
			style={{ borderTop: `3px solid ${NODE_COLORS.student.accent}` }}
		>
			<Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2 !h-2" />
			<div className="p-2.5">
				<div className="flex items-center gap-2">
					<div
						className="w-6 h-6 rounded-lg flex items-center justify-center"
						style={{ backgroundColor: NODE_COLORS.student.bg }}
					>
						<UserCircle className="h-3 w-3" style={{ color: NODE_COLORS.student.accent }} />
					</div>
					<div>
						<p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: NODE_COLORS.student.text }}>
							Student
						</p>
						<p className="text-[11px] font-semibold text-gray-900">{data.label as string}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function FormNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-sm overflow-hidden bg-white min-w-[140px] transition-all hover:shadow-md"
			style={{ borderTop: `3px solid ${NODE_COLORS.form.accent}` }}
		>
			<Handle type="target" position={Position.Left} className="!bg-yellow-500 !w-2 !h-2" />
			<div className="p-2">
				<div className="flex items-center gap-1.5">
					<div
						className="w-5 h-5 rounded flex items-center justify-center"
						style={{ backgroundColor: NODE_COLORS.form.bg }}
					>
						<FileText className="h-2.5 w-2.5" style={{ color: NODE_COLORS.form.accent }} />
					</div>
					<div>
						<p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: NODE_COLORS.form.text }}>
							Form
						</p>
						<p className="text-[10px] font-medium text-gray-800 max-w-[120px] truncate">
							{data.label as string}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function UnassignedNode({ data }: { data: Record<string, unknown> }) {
	return (
		<div
			className="rounded-xl shadow-md overflow-hidden bg-amber-50 border-2 border-dashed border-amber-300 min-w-[200px]"
		>
			<div className="p-3">
				<div className="flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 text-amber-500" />
					<div>
						<p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
							Unassigned
						</p>
						<p className="text-xs font-semibold text-amber-900">
							{data.count as number} user(s) without department
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

// ======================== NODE TYPES ========================
const nodeTypes: NodeTypes = {
	department: DepartmentNode,
	batch: BatchNode,
	faculty: FacultyNode,
	student: StudentNode,
	form: FormNode,
	unassigned: UnassignedNode,
};

// ======================== LAYOUT ENGINE ========================

function buildCanvasData(
	departments: DepartmentData[],
	allBatches: BatchDataSimple[],
	unassignedCount: number,
): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = [];
	const edges: Edge[] = [];

	const DEPT_SPACING_X = 500;
	const BATCH_SPACING_X = 280;
	const DEPT_START_X = 100;
	const DEPT_Y = 50;
	const BATCH_Y = 220;
	const PEOPLE_Y = 400;
	const FORM_START_X_OFFSET = 50;
	const FORM_Y_OFFSET = -30;
	const FORM_SPACING_Y = 50;

	departments.forEach((dept, deptIdx) => {
		const deptX = DEPT_START_X + deptIdx * DEPT_SPACING_X;

		// Department node
		nodes.push({
			id: `dept-${dept.id}`,
			type: "department",
			position: { x: deptX, y: DEPT_Y },
			data: {
				label: dept.name,
				code: dept.code,
				batchCount: dept.batchCount,
				formCount: dept.forms.filter((f) => f.isActive).length,
			},
		});

		// Form nodes (right side of department)
		const activeForms = dept.forms.filter((f) => f.isActive);
		const formStartX = deptX + 250;
		activeForms.slice(0, 6).forEach((form, fIdx) => {
			const formNodeId = `form-${dept.id}-${form.formDefinitionId}`;
			nodes.push({
				id: formNodeId,
				type: "form",
				position: { x: formStartX, y: DEPT_Y + FORM_Y_OFFSET + fIdx * FORM_SPACING_Y },
				data: { label: form.title },
			});
			edges.push({
				id: `e-dept-form-${dept.id}-${form.formDefinitionId}`,
				source: `dept-${dept.id}`,
				target: formNodeId,
				animated: false,
				style: { stroke: NODE_COLORS.form.accent, strokeWidth: 1, strokeDasharray: "4 4" },
				markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.form.accent, width: 12, height: 12 },
				type: "smoothstep",
			});
		});
		if (activeForms.length > 6) {
			nodes.push({
				id: `form-more-${dept.id}`,
				type: "form",
				position: { x: formStartX, y: DEPT_Y + FORM_Y_OFFSET + 6 * FORM_SPACING_Y },
				data: { label: `+${activeForms.length - 6} more` },
			});
		}

		// Batch nodes
		dept.batches.forEach((batch, batchIdx) => {
			const batchX = deptX - ((dept.batches.length - 1) * BATCH_SPACING_X) / 2 + batchIdx * BATCH_SPACING_X;
			const batchNodeId = `batch-${batch.id}`;

			nodes.push({
				id: batchNodeId,
				type: "batch",
				position: { x: batchX, y: BATCH_Y },
				data: {
					label: batch.name,
					semester: batch.currentSemester,
					studentCount: batch.studentCount,
					facultyCount: batch.facultyCount,
				},
			});

			// Edge: Department → Batch
			edges.push({
				id: `e-dept-batch-${dept.id}-${batch.id}`,
				source: `dept-${dept.id}`,
				target: batchNodeId,
				animated: true,
				style: { stroke: NODE_COLORS.department.accent, strokeWidth: 2 },
				markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.department.accent, width: 15, height: 15 },
				label: "MANAGES",
				labelStyle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 600, fill: "#6b7280" },
				labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
				labelBgPadding: [4, 4] as [number, number],
				labelBgBorderRadius: 4,
			});

			// Faculty nodes from the batch (get from allBatches for richer data)
			const fullBatch = allBatches.find((b) => b.id === batch.id);
			if (fullBatch) {
				fullBatch.assignedFaculty.slice(0, 3).forEach((fac, facIdx) => {
					const facNodeId = `fac-${fac.id}-${batch.id}`;
					// Avoid duplicate nodes
					if (!nodes.some((n) => n.id === facNodeId)) {
						nodes.push({
							id: facNodeId,
							type: "faculty",
							position: {
								x: batchX - 80 + facIdx * 180,
								y: PEOPLE_Y,
							},
							data: { label: `${fac.firstName} ${fac.lastName}` },
						});
					}
					edges.push({
						id: `e-batch-fac-${batch.id}-${fac.id}`,
						source: batchNodeId,
						target: facNodeId,
						style: { stroke: NODE_COLORS.faculty.accent, strokeWidth: 1.5 },
						markerEnd: { type: MarkerType.ArrowClosed, color: NODE_COLORS.faculty.accent, width: 12, height: 12 },
					});
				});
			}
		});
	});

	// Unassigned users node
	if (unassignedCount > 0) {
		nodes.push({
			id: "unassigned",
			type: "unassigned",
			position: { x: DEPT_START_X + departments.length * DEPT_SPACING_X + 50, y: DEPT_Y },
			data: { count: unassignedCount },
		});
	}

	return { nodes, edges };
}

// ======================== MAIN COMPONENT ========================

interface SystemCanvasProps {
	departments: DepartmentData[];
	batches: BatchDataSimple[];
	unassignedUserCount: number;
}

export function SystemCanvas({
	departments,
	batches,
	unassignedUserCount,
}: SystemCanvasProps) {
	const { nodes: initialNodes, edges: initialEdges } = useMemo(
		() => buildCanvasData(departments, batches, unassignedUserCount),
		[departments, batches, unassignedUserCount],
	);

	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, , onEdgesChange] = useEdgesState(initialEdges);
	const [showLabels, setShowLabels] = useState(true);

	const minimapNodeColor = useCallback((node: Node) => {
		const colors: Record<string, string> = {
			department: NODE_COLORS.department.accent,
			batch: NODE_COLORS.batch.accent,
			faculty: NODE_COLORS.faculty.accent,
			student: NODE_COLORS.student.accent,
			form: NODE_COLORS.form.accent,
			unassigned: "#f59e0b",
		};
		return colors[node.type ?? ""] ?? "#94a3b8";
	}, []);

	if (departments.length === 0) {
		return (
			<div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
				<Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
				<p className="text-gray-500 font-medium">No departments to visualize</p>
				<p className="text-sm text-gray-400 mt-1">
					Create a department in the Departments tab to see the hierarchy canvas
				</p>
			</div>
		);
	}

	return (
		<div className="w-full h-[600px] rounded-xl border border-gray-200 overflow-hidden bg-gray-50/50">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.3 }}
				minZoom={0.3}
				maxZoom={2}
				attributionPosition="bottom-left"
				proOptions={{ hideAttribution: true }}
			>
				<Background color="#e2e8f0" gap={32} size={1.5} />
				<Controls
					showInteractive={false}
					className="!bg-white/90 !backdrop-blur-sm !border-gray-200 !shadow-lg !rounded-xl"
				/>
				<MiniMap
					nodeColor={minimapNodeColor}
					className="!bg-white/80 !backdrop-blur-sm !border-gray-200 !rounded-xl !shadow-md"
					maskColor="rgb(0 79 168 / 0.08)"
					pannable
					zoomable
				/>

				{/* Legend Panel */}
				<Panel position="top-left" className="!m-3">
					<div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-md space-y-1.5">
						<p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
							Legend
						</p>
						{[
							{ label: "Department", color: NODE_COLORS.department.accent },
							{ label: "Batch", color: NODE_COLORS.batch.accent },
							{ label: "Faculty", color: NODE_COLORS.faculty.accent },
							{ label: "Form", color: NODE_COLORS.form.accent },
						].map((item) => (
							<div key={item.label} className="flex items-center gap-2">
								<div
									className="w-3 h-3 rounded-sm"
									style={{ backgroundColor: item.color }}
								/>
								<span className="text-[10px] font-medium text-gray-600">
									{item.label}
								</span>
							</div>
						))}
					</div>
				</Panel>
			</ReactFlow>
		</div>
	);
}
