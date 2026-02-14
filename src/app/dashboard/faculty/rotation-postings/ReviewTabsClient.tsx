/**
 * @module ReviewTabsClient
 * @description 3-tab layout for faculty/HOD rotation-postings review page.
 * Tab 1: Rotation Postings (sign/reject submissions)
 * Tab 2: Thesis (view student thesis records)
 * Tab 3: Training & Mentoring (evaluate students on 5-point scale)
 * HOD gets an "Auto Review" toggle per tab to auto-approve submissions.
 *
 * @see PG Logbook .md — Rotation Postings, Thesis, Training & Mentoring
 */

"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	RotateCcw,
	BookOpen,
	HeartHandshake,
	Loader2,
	ChevronsUpDown,
	Check,
} from "lucide-react";
import {
	RotationReviewClient,
	type RotationSubmission,
} from "./RotationReviewClient";
import {
	ThesisReviewClient,
	type ThesisForReview,
} from "../thesis-review/ThesisReviewClient";
import {
	FacultyTrainingForm,
	type Student,
	type ExistingRecord,
} from "../training-mentoring/FacultyTrainingForm";
import { toggleAutoReview } from "@/actions/auto-review";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface AutoReviewSettings {
	rotationPostings: boolean;
	thesis: boolean;
	trainingMentoring: boolean;
}

interface ReviewTabsClientProps {
	role: "faculty" | "hod";
	submissions: RotationSubmission[];
	theses: ThesisForReview[];
	trainingStudents: Student[];
	trainingRecords: ExistingRecord[];
	autoReviewSettings?: AutoReviewSettings;
}

export function ReviewTabsClient({
	role,
	submissions,
	theses,
	trainingStudents,
	trainingRecords,
	autoReviewSettings,
}: ReviewTabsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("rotations");
	const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
	const [studentPickerOpen, setStudentPickerOpen] = useState(false);
	const [settings, setSettings] = useState<AutoReviewSettings>(
		autoReviewSettings ?? {
			rotationPostings: false,
			thesis: false,
			trainingMentoring: false,
		},
	);

	// Build unique student list from all data sources
	const studentOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of submissions) {
			map.set(s.user.id, `${s.user.firstName} ${s.user.lastName}`.trim());
		}
		for (const t of theses) {
			map.set(
				t.user.id,
				`${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim(),
			);
		}
		for (const s of trainingStudents) {
			map.set(s.id, `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim());
		}
		return Array.from(map.entries())
			.map(([id, name]) => ({ id, name: name || "Unknown" }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [submissions, theses, trainingStudents]);

	// ======================== EXPORT HANDLERS ========================

	const buildReviewExportData = useCallback(() => {
		// Filter by selected student
		const filteredSubmissions =
			selectedStudentId === "all" ? submissions : (
				submissions.filter((s) => s.user.id === selectedStudentId)
			);
		const filteredTheses =
			selectedStudentId === "all" ? theses : (
				theses.filter((t) => t.user.id === selectedStudentId)
			);
		const filteredTraining =
			selectedStudentId === "all" ? trainingRecords : (
				trainingRecords.filter((r) => {
					// Match training records to students by userId
					const student = trainingStudents.find(
						(s) => s.id === selectedStudentId,
					);
					return student ? r.userId === student.id : false;
				})
			);

		const rotationExportRows = filteredSubmissions.map((s) => ({
			slNo: s.slNo,
			rotationName: s.rotationName,
			isElective: s.isElective,
			startDate: s.startDate,
			endDate: s.endDate,
			totalDuration: s.totalDuration,
			durationDays: s.durationDays,
			status: s.status,
			facultyRemark: s.facultyRemark,
			studentName: `${s.user.firstName} ${s.user.lastName}`.trim(),
			batch: s.user.batchRelation?.name ?? "—",
			semester: s.user.currentSemester ?? 0,
		}));

		const thesisExportRows = filteredTheses.map((t) => ({
			topic: t.topic,
			chiefGuide: t.chiefGuide,
			semesterRecords: t.semesterRecords.map((sr) => ({
				semester: sr.semester,
				srJrMember: sr.srJrMember,
				srMember: sr.srMember,
				facultyMember: sr.facultyMember,
			})),
			studentName: `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim(),
			status: t.status,
			facultyRemark: t.facultyRemark,
		}));

		// Build student name lookup for training records
		const studentMap = new Map(
			trainingStudents.map((s) => [
				s.id,
				`${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
			]),
		);

		const trainingExportRows = filteredTraining.map((r) => ({
			semester: r.semester,
			knowledgeScore: r.knowledgeScore,
			clinicalSkillScore: r.clinicalSkillScore,
			proceduralSkillScore: r.proceduralSkillScore,
			softSkillScore: r.softSkillScore,
			researchScore: r.researchScore,
			overallScore: r.overallScore,
			remarks: r.remarks,
			status: r.status,
			studentName: studentMap.get(r.userId) ?? "Unknown",
			evaluatedBy: role === "hod" ? "HOD" : "Faculty",
		}));

		return { rotationExportRows, thesisExportRows, trainingExportRows };
	}, [
		submissions,
		theses,
		trainingRecords,
		trainingStudents,
		role,
		selectedStudentId,
	]);

	const handleExportPdf = useCallback(async () => {
		const { exportReviewDataToPdf } = await import("@/lib/export/export-pdf");
		const { rotationExportRows, thesisExportRows, trainingExportRows } =
			buildReviewExportData();
		await exportReviewDataToPdf(
			rotationExportRows,
			thesisExportRows,
			trainingExportRows,
			role,
		);
	}, [buildReviewExportData, role]);

	const handleExportExcel = useCallback(async () => {
		const { exportReviewDataToExcel } =
			await import("@/lib/export/export-excel");
		const { rotationExportRows, thesisExportRows, trainingExportRows } =
			buildReviewExportData();
		exportReviewDataToExcel(
			rotationExportRows,
			thesisExportRows,
			trainingExportRows,
			role,
		);
	}, [buildReviewExportData, role]);

	// ======================== AUTO-REVIEW TOGGLE ========================

	function handleToggle(
		category: "rotationPostings" | "thesis" | "trainingMentoring",
		enabled: boolean,
	) {
		setSettings((prev) => ({ ...prev, [category]: enabled }));
		startTransition(async () => {
			try {
				await toggleAutoReview(category, enabled);
				toast.success(
					`Auto review ${enabled ? "enabled" : "disabled"} for ${
						category === "rotationPostings" ? "Rotation Postings"
						: category === "thesis" ? "Thesis"
						: "Training & Mentoring"
					}`,
				);
				router.refresh();
			} catch {
				setSettings((prev) => ({ ...prev, [category]: !enabled }));
				toast.error("Failed to update auto review setting");
			}
		});
	}

	const autoReviewKey =
		activeTab === "rotations" ? "rotationPostings"
		: activeTab === "thesis" ? "thesis"
		: "trainingMentoring";
	const autoReviewLabel =
		activeTab === "rotations" ? "Rotation Postings"
		: activeTab === "thesis" ? "Thesis"
		: "Training & Mentoring";

	return (
		<Tabs
			defaultValue="rotations"
			className="space-y-4"
			onValueChange={setActiveTab}
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
				<TabsList className="grid w-full sm:w-auto grid-cols-3">
					<TabsTrigger
						value="rotations"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<RotateCcw className="h-4 w-4" />
						<span className="hidden sm:inline">Rotation Postings</span>
						<span className="sm:hidden">Rotations</span>
					</TabsTrigger>
					<TabsTrigger
						value="thesis"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<BookOpen className="h-4 w-4" />
						<span>Thesis</span>
					</TabsTrigger>
					<TabsTrigger
						value="training"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<HeartHandshake className="h-4 w-4" />
						<span className="hidden sm:inline">Training & Mentoring</span>
						<span className="sm:hidden">Training</span>
					</TabsTrigger>
				</TabsList>

				{/* HOD Auto-Review Toggle */}
				{role === "hod" && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
						{isPending && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						<Label
							htmlFor="auto-review-toggle"
							className="text-xs font-medium text-muted-foreground cursor-pointer"
						>
							Auto Review ({autoReviewLabel})
						</Label>
						<Switch
							id="auto-review-toggle"
							checked={settings[autoReviewKey]}
							onCheckedChange={(checked) =>
								handleToggle(autoReviewKey, checked)
							}
							disabled={isPending}
						/>
					</div>
				)}

				<div className="flex items-center gap-2">
					{/* Searchable Student Selector for Export */}
					<Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								role="combobox"
								aria-expanded={studentPickerOpen}
								className="w-48 justify-between text-xs"
							>
								{selectedStudentId === "all" ?
									"All Students"
								:	(studentOptions.find((s) => s.id === selectedStudentId)
										?.name ?? "Select student...")
								}
								<ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-56 p-0" align="end">
							<Command>
								<CommandInput placeholder="Search student..." />
								<CommandList>
									<CommandEmpty>No student found.</CommandEmpty>
									<CommandGroup>
										<CommandItem
											value="all"
											onSelect={() => {
												setSelectedStudentId("all");
												setStudentPickerOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													selectedStudentId === "all" ? "opacity-100" : (
														"opacity-0"
													),
												)}
											/>
											All Students
										</CommandItem>
										{studentOptions.map((s) => (
											<CommandItem
												key={s.id}
												value={s.name}
												onSelect={() => {
													setSelectedStudentId(s.id);
													setStudentPickerOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedStudentId === s.id ?
															"opacity-100"
														:	"opacity-0",
													)}
												/>
												{s.name}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					<ExportDropdown
						onExportPdf={handleExportPdf}
						onExportExcel={handleExportExcel}
						label={selectedStudentId === "all" ? "Download All" : "Download"}
					/>
				</div>
			</div>

			<TabsContent value="rotations">
				<RotationReviewClient submissions={submissions} role={role} />
			</TabsContent>

			<TabsContent value="thesis">
				<ThesisReviewClient theses={theses} role={role} />
			</TabsContent>

			<TabsContent value="training">
				<FacultyTrainingForm
					students={trainingStudents}
					existingRecords={trainingRecords}
					role={role}
				/>
			</TabsContent>
		</Tabs>
	);
}
