/**
 * @module RotationPostingConfigurationClient
 * @description HOD rotation configuration UI with 20 small cards and proper filtering.
 * Allows HOD to enable/disable rotation postings per batch, semester, and department.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
	updateRotationPostingConfig,
	getRotationPostingConfigurations,
} from "@/actions/rotation-posting-config";
import type { RotationConfigWithDetails } from "@/actions/rotation-posting-config";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";
import { cn } from "@/lib/utils";
import { Check, Loader2, X } from "lucide-react";

interface RotationPostingConfigurationClientProps {
	batches: Array<{ id: string; name: string }>;
	departments: Array<{ id: string; name: string }>;
	initialConfigs: RotationConfigWithDetails[];
	selectedBatchId: string;
	selectedDepartmentId: string;
	selectedSemester: number;
	onConfigChange?: () => void;
}

export function RotationPostingConfigurationClient({
	batches,
	departments,
	initialConfigs,
	selectedBatchId: initialBatchId,
	selectedDepartmentId: initialDepartmentId,
	selectedSemester: initialSemester,
	onConfigChange,
}: RotationPostingConfigurationClientProps) {
	const [batchId, setBatchId] = useState(initialBatchId);
	const [departmentId, setDepartmentId] = useState(initialDepartmentId);
	const [semester, setSemester] = useState(initialSemester);
	const [configs, setConfigs] =
		useState<RotationConfigWithDetails[]>(initialConfigs);
	const [togglingSlNo, setTogglingSlNo] = useState<number | null>(null);
	const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
	const fetchRequestRef = useRef(0);

	// Refetch configurations whenever batch, semester, or department changes.
	// The request id guard prevents stale responses from overwriting newer filter results.
	useEffect(() => {
		if (!batchId || !departmentId) {
			setConfigs([]);
			return;
		}

		let isCancelled = false;
		const requestId = ++fetchRequestRef.current;

		const fetchConfigs = async () => {
			setIsLoadingConfigs(true);
			try {
				const newConfigs = await getRotationPostingConfigurations(
					batchId,
					semester,
					departmentId,
				);

				if (!isCancelled && requestId === fetchRequestRef.current) {
					setConfigs(newConfigs);
				}
			} catch (error) {
				if (!isCancelled && requestId === fetchRequestRef.current) {
					console.error("[FETCH_CONFIGS]", error);
					toast.error("Failed to load rotation configurations");
				}
			} finally {
				if (!isCancelled && requestId === fetchRequestRef.current) {
					setIsLoadingConfigs(false);
				}
			}
		};

		fetchConfigs();

		return () => {
			isCancelled = true;
		};
	}, [batchId, departmentId, semester]);

	const allRotations = useMemo(
		() => configs.slice().sort((a, b) => a.rotationSlNo - b.rotationSlNo),
		[configs],
	);

	const enabledCount = useMemo(
		() => configs.filter((c) => c.isEnabled).length,
		[configs],
	);
	const coreEnabledCount = useMemo(
		() => configs.filter((c) => !c.isElective && c.isEnabled).length,
		[configs],
	);
	const electiveEnabledCount = useMemo(
		() => configs.filter((c) => c.isElective && c.isEnabled).length,
		[configs],
	);
	const totalCount = ROTATION_POSTINGS.length;

	const handleToggle = useCallback(
		async (rotationSlNo: number, currentIsEnabled: boolean) => {
			if (!batchId || !departmentId) {
				toast.error("Please select batch, semester, and department first");
				return;
			}

			setTogglingSlNo(rotationSlNo);
			try {
				await updateRotationPostingConfig(
					rotationSlNo,
					batchId,
					semester,
					departmentId,
					!currentIsEnabled, // Toggle
				);

				// Update local state
				setConfigs((prev) =>
					prev.map((c) =>
						c.rotationSlNo === rotationSlNo ?
							{ ...c, isEnabled: !currentIsEnabled }
						:	c,
					),
				);

				toast.success(
					`${!currentIsEnabled ? "Enabled" : "Disabled"} successfully`,
				);
				onConfigChange?.();
			} catch (error) {
				console.error("[TOGGLE_ROTATION]", error);
				toast.error("Failed to update rotation");
			} finally {
				setTogglingSlNo(null);
			}
		},
		[batchId, departmentId, onConfigChange, semester],
	);

	return (
		<div className="space-y-6 p-6">
			{/* Filter Panel */}
			<div className="rounded-xl border border-hospital-border bg-linear-to-br from-hospital-background to-hospital-surface/40 p-5">
				<h2 className="mb-4 text-lg font-semibold text-hospital-text-primary">
					Batch/Semester/Department Filter
				</h2>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{/* Batch Filter */}
					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Batch
						</label>
						<Select value={batchId} onValueChange={setBatchId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{batches.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Semester Filter */}
					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Semester
						</label>
						<Select
							value={semester.toString()}
							onValueChange={(v) => setSemester(parseInt(v, 10))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[1, 2, 3, 4, 5, 6].map((s) => (
									<SelectItem key={s} value={s.toString()}>
										Semester {s}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Department Filter */}
					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Department
						</label>
						<Select value={departmentId} onValueChange={setDepartmentId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{departments.map((d) => (
									<SelectItem key={d.id} value={d.id}>
										{d.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Summary */}
					<div className="rounded-lg border border-hospital-primary/20 bg-hospital-primary/5 p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-hospital-text-secondary">
							Enabled Cards
						</p>
						<p className="mt-1 text-2xl font-bold text-hospital-primary">
							{isLoadingConfigs ? "..." : `${enabledCount}/${totalCount}`}
						</p>
						<p className="mt-2 text-xs text-hospital-text-secondary">
							Core: {coreEnabledCount}/7 | Elective: {electiveEnabledCount}/13
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-base font-semibold text-hospital-text-primary">
						Rotation Cards (20)
					</h3>
					<p className="text-sm text-hospital-text-secondary">
						Click a card to toggle the rotation flag for the selected filter.
					</p>
				</div>
				{isLoadingConfigs && (
					<div className="flex items-center gap-2 text-sm text-hospital-text-secondary">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading...
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
				{allRotations.map((rotation) => (
					<RotationCard
						key={rotation.rotationSlNo}
						rotation={rotation}
						isToggling={togglingSlNo === rotation.rotationSlNo}
						onToggle={() =>
							handleToggle(rotation.rotationSlNo, rotation.isEnabled)
						}
					/>
				))}
			</div>
		</div>
	);
}

// ============== ROTATION CARD COMPONENT ==============

interface RotationCardProps {
	rotation: RotationConfigWithDetails;
	isToggling: boolean;
	onToggle: () => void;
}

function RotationCard({ rotation, isToggling, onToggle }: RotationCardProps) {
	return (
		<button
			onClick={onToggle}
			disabled={isToggling}
			className={cn(
				"relative overflow-hidden rounded-lg border p-3 text-left transition-all duration-200",
				"hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60",
				rotation.isEnabled ?
					"border-hospital-primary/30 bg-hospital-primary/5 hover:border-hospital-primary/60"
				:	"border-hospital-accent/30 bg-hospital-accent/5 hover:border-hospital-accent/60",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-xs font-semibold text-hospital-text-primary">
					{rotation.rotationSlNo}
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="h-5 px-1.5 text-[10px]">
						{rotation.isElective ? "Elective" : "Core"}
					</Badge>
					{isToggling ?
						<Loader2 className="h-3.5 w-3.5 animate-spin text-hospital-text-secondary" />
					: rotation.isEnabled ?
						<Check className="h-3.5 w-3.5 text-hospital-success" />
					:	<X className="h-3.5 w-3.5 text-hospital-accent" />}
				</div>
			</div>

			<p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-hospital-text-primary">
				{rotation.rotationName}
			</p>

			<div className="mt-2">
				<Badge
					variant={rotation.isEnabled ? "default" : "secondary"}
					className={cn(
						"text-[11px]",
						rotation.isEnabled ?
							"bg-hospital-success text-white hover:bg-hospital-success"
						:	"bg-hospital-accent text-white hover:bg-hospital-accent",
					)}
				>
					{rotation.isEnabled ? "Enabled" : "Disabled"}
				</Badge>
			</div>
		</button>
	);
}
