/**
 * @module FacultyTrainingForm
 * @description Faculty evaluates assigned students using 5-domain scoring (1-5 each):
 * Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Star, Target } from "lucide-react";
import { upsertTrainingRecord } from "@/actions/training-mentoring";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Student {
	id: string;
	clerkId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
}

interface ExistingRecord {
	id: string;
	userId: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	remarks: string | null;
	status: string;
}

interface FacultyTrainingFormProps {
	students: Student[];
	existingRecords: ExistingRecord[];
}

const DOMAINS = [
	{ key: "knowledgeScore", label: "Knowledge", color: "#0066CC" },
	{ key: "clinicalSkillScore", label: "Clinical Skills", color: "#00897B" },
	{ key: "proceduralSkillScore", label: "Procedural Skills", color: "#D32F2F" },
	{ key: "softSkillScore", label: "Soft Skills", color: "#F59E0B" },
	{ key: "researchScore", label: "Research", color: "#7C3AED" },
] as const;

const SCORE_OPTIONS = [
	{ value: "5", label: "5 — Exceptional" },
	{ value: "4", label: "4 — Exceeds expected standards" },
	{ value: "3", label: "3 — Meets expected standards" },
	{ value: "2", label: "2 — Inconsistent Performance" },
	{ value: "1", label: "1 — Requires remedial training" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];

export function FacultyTrainingForm({
	students,
	existingRecords,
}: FacultyTrainingFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedStudent, setSelectedStudent] = useState<string>("");
	const [selectedSemester, setSelectedSemester] = useState<string>("");
	const [remarks, setRemarks] = useState("");

	// 5-domain scores
	const [scores, setScores] = useState<Record<string, string>>({
		knowledgeScore: "",
		clinicalSkillScore: "",
		proceduralSkillScore: "",
		softSkillScore: "",
		researchScore: "",
	});

	// Pre-fill if editing existing record
	function handleStudentChange(studentId: string) {
		setSelectedStudent(studentId);
		setSelectedSemester("");
		resetScores();
	}

	function resetScores() {
		setScores({
			knowledgeScore: "",
			clinicalSkillScore: "",
			proceduralSkillScore: "",
			softSkillScore: "",
			researchScore: "",
		});
		setRemarks("");
	}

	function handleSemesterChange(sem: string) {
		setSelectedSemester(sem);
		const existing = existingRecords.find(
			(r) => r.userId === selectedStudent && r.semester === parseInt(sem),
		);
		if (existing) {
			setScores({
				knowledgeScore: existing.knowledgeScore?.toString() ?? "",
				clinicalSkillScore: existing.clinicalSkillScore?.toString() ?? "",
				proceduralSkillScore: existing.proceduralSkillScore?.toString() ?? "",
				softSkillScore: existing.softSkillScore?.toString() ?? "",
				researchScore: existing.researchScore?.toString() ?? "",
			});
			setRemarks(existing.remarks ?? "");
		} else {
			resetScores();
		}
	}

	// Calculate live overall
	const overallScore = useMemo(() => {
		const vals = Object.values(scores)
			.map((v) => parseInt(v))
			.filter((v) => !isNaN(v));
		if (vals.length === 0) return null;
		return (
			Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
		);
	}, [scores]);

	const hasAnyScore = Object.values(scores).some((v) => v !== "");

	function handleSave() {
		if (!selectedStudent || !selectedSemester) {
			toast.error("Please select a student and semester");
			return;
		}
		if (!hasAnyScore) {
			toast.error("Please assign at least one domain score");
			return;
		}

		const payload: Record<string, number | string | undefined> = {
			semester: parseInt(selectedSemester),
			remarks: remarks || undefined,
		};
		for (const domain of DOMAINS) {
			const val = scores[domain.key];
			if (val) payload[domain.key] = parseInt(val);
		}

		startTransition(async () => {
			try {
				await upsertTrainingRecord(
					selectedStudent,
					payload as Parameters<typeof upsertTrainingRecord>[1],
				);
				toast.success("Training evaluation saved");
				router.refresh();
			} catch {
				toast.error("Failed to save evaluation");
			}
		});
	}

	if (students.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Star className="h-12 w-12 mx-auto mb-3 opacity-40" />
				<p className="text-lg font-medium">No assigned students</p>
				<p className="text-sm mt-1">
					Ask the HOD to assign students to you from the Manage Users page.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Student & Semester Selection */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Target className="h-5 w-5 text-hospital-primary" />
						<CardTitle>5-Domain Evaluation</CardTitle>
					</div>
					<CardDescription>
						Select a student and semester, then score each domain (1-5)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Student</label>
							<Select
								value={selectedStudent}
								onValueChange={handleStudentChange}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select student..." />
								</SelectTrigger>
								<SelectContent>
									{students.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.firstName} {s.lastName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Semester</label>
							<Select
								value={selectedSemester}
								onValueChange={handleSemesterChange}
								disabled={!selectedStudent}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select semester..." />
								</SelectTrigger>
								<SelectContent>
									{SEMESTERS.map((sem) => {
										const existing = existingRecords.find(
											(r) => r.userId === selectedStudent && r.semester === sem,
										);
										return (
											<SelectItem key={sem} value={sem.toString()}>
												Semester {sem}
												{existing ?
													` (Overall: ${existing.overallScore?.toFixed(1) ?? "—"})`
												:	""}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* 5-Domain Score Grid */}
					{selectedSemester && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
								{DOMAINS.map((domain) => (
									<div
										key={domain.key}
										className="space-y-2 p-3 border rounded-lg"
										style={{
											borderColor:
												scores[domain.key] ? `${domain.color}40` : undefined,
										}}
									>
										<label className="text-xs font-medium flex items-center gap-1.5">
											<span
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: domain.color }}
											/>
											{domain.label}
										</label>
										<Select
											value={scores[domain.key] || "none"}
											onValueChange={(v) =>
												setScores((prev) => ({
													...prev,
													[domain.key]: v === "none" ? "" : v,
												}))
											}
										>
											<SelectTrigger className="h-9 text-sm">
												<SelectValue placeholder="Score" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">—</SelectItem>
												{SCORE_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{scores[domain.key] && (
											<div className="flex gap-0.5">
												{[1, 2, 3, 4, 5].map((i) => (
													<div
														key={i}
														className={cn("h-1.5 flex-1 rounded-full")}
														style={{
															backgroundColor:
																i <= parseInt(scores[domain.key]) ?
																	domain.color
																:	"#E5E7EB",
														}}
													/>
												))}
											</div>
										)}
									</div>
								))}
							</div>

							{/* Overall Score */}
							{overallScore !== null && (
								<div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
									<span className="text-sm font-medium">Overall Score:</span>
									<Badge
										variant="default"
										className="bg-hospital-primary text-white"
									>
										{overallScore.toFixed(1)} / 5
									</Badge>
									<span className="text-xs text-muted-foreground">
										(average of filled domains)
									</span>
								</div>
							)}

							{/* Remarks */}
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Remarks (Optional)
								</label>
								<Textarea
									placeholder="Add remarks about the student's performance across domains..."
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									rows={3}
									maxLength={1000}
								/>
							</div>

							{/* Save Button */}
							<div className="flex justify-end">
								<Button
									onClick={handleSave}
									disabled={isPending || !hasAnyScore}
								>
									{isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									<Save className="h-4 w-4 mr-2" />
									Save Evaluation
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Existing Records Summary */}
			{selectedStudent && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Evaluation History</CardTitle>
						<CardDescription>
							Previous evaluations for this student
						</CardDescription>
					</CardHeader>
					<CardContent>
						{(
							existingRecords.filter((r) => r.userId === selectedStudent)
								.length > 0
						) ?
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{existingRecords
									.filter((r) => r.userId === selectedStudent)
									.sort((a, b) => a.semester - b.semester)
									.map((record) => (
										<div
											key={record.id}
											className="border rounded-lg p-3 text-sm space-y-2"
										>
											<div className="flex items-center justify-between">
												<span className="font-medium">
													Semester {record.semester}
												</span>
												<Badge
													variant={
														record.status === "SIGNED" ? "default" : "outline"
													}
													className={
														record.status === "SIGNED" ?
															"bg-green-100 text-green-700 hover:bg-green-100"
														:	""
													}
												>
													{record.status}
												</Badge>
											</div>
											{DOMAINS.map((d) => {
												const score = record[d.key as keyof ExistingRecord] as
													| number
													| null;
												return (
													<div
														key={d.key}
														className="flex items-center justify-between text-xs"
													>
														<span className="text-muted-foreground">
															{d.label}
														</span>
														<span className="font-medium">{score ?? "—"}</span>
													</div>
												);
											})}
											{record.overallScore && (
												<div className="pt-1 border-t flex items-center justify-between text-xs">
													<span className="font-medium">Overall</span>
													<span className="font-bold">
														{record.overallScore.toFixed(1)}
													</span>
												</div>
											)}
										</div>
									))}
							</div>
						:	<p className="text-sm text-muted-foreground text-center py-4">
								No evaluations recorded yet for this student
							</p>
						}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
