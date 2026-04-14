/**
 * @module RotationPostingConfigurationClient
 * @description HOD rotation configuration UI with 20 cards and filter-scoped toggles.
 * Supports both batch-wide config and specific-student override config.
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
	getStudentsForRotationPostingConfig,
	getRotationPostingConfigurationsForSpecificStudent,
	updateRotationPostingConfigForSpecificStudent,
} from "@/actions/rotation-posting-config";
import type {
	RotationConfigWithDetails,
	RotationConfigStudentOption,
} from "@/actions/rotation-posting-config";
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

const ALL_STUDENTS_KEY = "__ALL_STUDENTS__";

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
	const [selectedStudentId, setSelectedStudentId] =
		useState<string>(ALL_STUDENTS_KEY);

	const [configs, setConfigs] =
		useState<RotationConfigWithDetails[]>(initialConfigs);
	const [students, setStudents] = useState<RotationConfigStudentOption[]>([]);

	const [togglingSlNo, setTogglingSlNo] = useState<number | null>(null);
	const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
	const [isLoadingStudents, setIsLoadingStudents] = useState(false);

	const configFetchRef = useRef(0);
	const studentFetchRef = useRef(0);

	useEffect(() => {
		setSelectedStudentId(ALL_STUDENTS_KEY);
	}, [batchId, departmentId, semester]);

	useEffect(() => {
		if (!batchId || !departmentId) {
			setStudents([]);
			return;
		}

		let cancelled = false;
		const requestId = ++studentFetchRef.current;

		const fetchStudents = async () => {
			setIsLoadingStudents(true);
			try {
				const result = await getStudentsForRotationPostingConfig(
					batchId,
					semester,
					departmentId,
				);
				if (!cancelled && requestId === studentFetchRef.current) {
					setStudents(result);
				}
			} catch (error) {
				if (!cancelled && requestId === studentFetchRef.current) {
					console.error("[FETCH_ROTATION_CONFIG_STUDENTS]", error);
					toast.error("Failed to load students for selected filter");
					setStudents([]);
				}
			} finally {
				if (!cancelled && requestId === studentFetchRef.current) {
					setIsLoadingStudents(false);
				}
			}
		};

		fetchStudents();
		return () => {
			cancelled = true;
		};
	}, [batchId, departmentId, semester]);

	useEffect(() => {
		if (!batchId || !departmentId) {
			setConfigs([]);
			return;
		}

		let cancelled = false;
		const requestId = ++configFetchRef.current;

		const fetchConfigs = async () => {
			setIsLoadingConfigs(true);
			try {
				const result =
					selectedStudentId === ALL_STUDENTS_KEY ?
						await getRotationPostingConfigurations(
							batchId,
							semester,
							departmentId,
						)
					:	await getRotationPostingConfigurationsForSpecificStudent(
							batchId,
							semester,
							departmentId,
							selectedStudentId,
						);

				if (!cancelled && requestId === configFetchRef.current) {
					setConfigs(result);
				}
			} catch (error) {
				if (!cancelled && requestId === configFetchRef.current) {
					console.error("[FETCH_ROTATION_CONFIGS]", error);
					toast.error("Failed to load rotation configurations");
				}
			} finally {
				if (!cancelled && requestId === configFetchRef.current) {
					setIsLoadingConfigs(false);
				}
			}
		};

		fetchConfigs();
		return () => {
			cancelled = true;
		};
	}, [batchId, departmentId, semester, selectedStudentId]);

	const allRotations = useMemo(
		() => configs.slice().sort((a, b) => a.rotationSlNo - b.rotationSlNo),
		[configs],
	);
	const enabledCount = useMemo(
		() => configs.filter((config) => config.isEnabled).length,
		[configs],
	);
	const coreEnabledCount = useMemo(
		() =>
			configs.filter((config) => !config.isElective && config.isEnabled).length,
		[configs],
	);
	const electiveEnabledCount = useMemo(
		() =>
			configs.filter((config) => config.isElective && config.isEnabled).length,
		[configs],
	);
	const selectedStudentName = useMemo(() => {
		if (selectedStudentId === ALL_STUDENTS_KEY) {
			return "All students";
		}
		return (
			students.find((student) => student.id === selectedStudentId)?.name ??
			"Selected student"
		);
	}, [selectedStudentId, students]);

	const handleToggle = useCallback(
		async (rotationSlNo: number, currentIsEnabled: boolean) => {
			if (!batchId || !departmentId) {
				toast.error("Please select batch, semester, and department first");
				return;
			}

			setTogglingSlNo(rotationSlNo);
			try {
				if (selectedStudentId === ALL_STUDENTS_KEY) {
					await updateRotationPostingConfig(
						rotationSlNo,
						batchId,
						semester,
						departmentId,
						!currentIsEnabled,
					);
				} else {
					await updateRotationPostingConfigForSpecificStudent(
						rotationSlNo,
						batchId,
						semester,
						departmentId,
						selectedStudentId,
						!currentIsEnabled,
					);
				}

				const refreshed =
					selectedStudentId === ALL_STUDENTS_KEY ?
						await getRotationPostingConfigurations(
							batchId,
							semester,
							departmentId,
						)
					:	await getRotationPostingConfigurationsForSpecificStudent(
							batchId,
							semester,
							departmentId,
							selectedStudentId,
						);
				setConfigs(refreshed);

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
		[batchId, departmentId, onConfigChange, selectedStudentId, semester],
	);

	return (
		<div className="space-y-6 p-6">
			<div className="rounded-xl border border-hospital-border bg-linear-to-br from-hospital-background to-hospital-surface/40 p-5">
				<h2 className="mb-4 text-lg font-semibold text-hospital-text-primary">
					Batch/Semester/Department Filter
				</h2>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Batch
						</label>
						<Select value={batchId} onValueChange={setBatchId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{batches.map((batch) => (
									<SelectItem key={batch.id} value={batch.id}>
										{batch.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Semester
						</label>
						<Select
							value={semester.toString()}
							onValueChange={(value) => setSemester(parseInt(value, 10))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[1, 2, 3, 4, 5, 6].map((semesterValue) => (
									<SelectItem
										key={semesterValue}
										value={semesterValue.toString()}
									>
										Semester {semesterValue}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Department
						</label>
						<Select value={departmentId} onValueChange={setDepartmentId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{departments.map((department) => (
									<SelectItem key={department.id} value={department.id}>
										{department.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-hospital-text-secondary">
							Specific Student
						</label>
						<Select
							value={selectedStudentId}
							onValueChange={setSelectedStudentId}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										isLoadingStudents ? "Loading students..." : "All students"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_STUDENTS_KEY}>
									All students (batch-wide)
								</SelectItem>
								{students.map((student) => (
									<SelectItem key={student.id} value={student.id}>
										{student.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="rounded-lg border border-hospital-primary/20 bg-hospital-primary/5 p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-hospital-text-secondary">
							Enabled Cards
						</p>
						<p className="mt-1 text-2xl font-bold text-hospital-primary">
							{isLoadingConfigs ?
								"..."
							:	`${enabledCount}/${ROTATION_POSTINGS.length}`}
						</p>
						<p className="mt-2 text-xs text-hospital-text-secondary">
							Core: {coreEnabledCount}/7 | Elective: {electiveEnabledCount}/13
						</p>
						<p className="mt-1 text-xs text-hospital-text-secondary">
							Target: {selectedStudentName}
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
						Click a card to toggle the rotation flag for the selected filter and
						student scope.
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

			<div className="mt-2 flex items-center gap-1.5">
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
				{rotation.isOverridden && (
					<Badge variant="outline" className="text-[10px]">
						Override
					</Badge>
				)}
			</div>
		</button>
	);
}
