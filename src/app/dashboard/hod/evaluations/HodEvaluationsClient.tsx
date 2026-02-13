/**
 * @module HodEvaluationsClient
 * @description Client component for HOD to manage all student evaluations.
 * Reuses FacultyEvaluationsClient's pattern but with ALL students.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 */

"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { StatusBadge } from "@/components/shared/StatusBadge";
import dynamic from "next/dynamic";

const EvaluationGraph = dynamic(
	() =>
		import("@/components/charts/EvaluationGraph").then(
			(mod) => mod.EvaluationGraph,
		),
	{
		ssr: false,
		loading: () => (
			<div className="h-80 flex items-center justify-center text-muted-foreground">
				Loading chart…
			</div>
		),
	},
);
import { REVIEW_SCHEDULE, SCORE_LABELS } from "@/lib/constants";
import {
	setEvaluationScores,
	setEndSemesterAssessment,
	signEvaluation,
	rejectEvaluation,
	getEvaluationGraphData,
} from "@/actions/evaluations";
import type { EntryStatus } from "@/types";
import {
	CheckCircle,
	XCircle,
	BarChart3,
	ClipboardList,
	BookOpen,
	Users,
} from "lucide-react";
import { toast } from "sonner";

interface Student {
	id: string;
	firstName: string;
	lastName: string;
	batch: string | null;
	currentSemester: number | null;
}

interface EvaluationEntry {
	id: string;
	userId: string;
	semester: number;
	reviewNo: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	theoryMarks: string | null;
	practicalMarks: string | null;
	description: string | null;
	roleInActivity: string | null;
	facultyRemark: string | null;
	status: string;
	user: Student;
	[key: string]: unknown;
}

interface SemesterData {
	semester: string;
	Knowledge: number;
	"Clinical Skills": number;
	"Procedural Skills": number;
	"Soft Skills": number;
	Research: number;
	theoryMarks: string | null;
	practicalMarks: string | null;
}

interface HodEvaluationsClientProps {
	students: Student[];
	evaluations: EvaluationEntry[];
}

export function HodEvaluationsClient({
	students,
	evaluations,
}: HodEvaluationsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedStudentId, setSelectedStudentId] = useState<string>(
		students[0]?.id ?? "",
	);
	const [graphData, setGraphData] = useState<SemesterData[]>([]);

	// Filter state
	const [batchFilter, setBatchFilter] = useState<string>("all");

	// Dialogs
	const [showScoreDialog, setShowScoreDialog] = useState(false);
	const [showAssessDialog, setShowAssessDialog] = useState(false);
	const [showSignDialog, setShowSignDialog] = useState(false);
	const [showRejectDialog, setShowRejectDialog] = useState(false);
	const [activeEntry, setActiveEntry] = useState<EvaluationEntry | null>(null);

	// Score form
	const [scores, setScores] = useState({
		knowledgeScore: 3,
		clinicalSkillScore: 3,
		proceduralSkillScore: 3,
		softSkillScore: 3,
		researchScore: 3,
	});

	// Assessment form
	const [theoryMarks, setTheoryMarks] = useState("");
	const [practicalMarks, setPracticalMarks] = useState("");

	// Sign/Reject
	const [remark, setRemark] = useState("");

	// Derive batch options
	const batches = Array.from(
		new Set(students.map((s) => s.batch).filter(Boolean)),
	) as string[];

	const filteredStudents =
		batchFilter === "all" ? students : (
			students.filter((s) => s.batch === batchFilter)
		);

	const studentEvals = evaluations.filter(
		(e) => e.userId === selectedStudentId,
	);

	const selectedStudent = students.find((s) => s.id === selectedStudentId);

	const loadGraph = useCallback(async () => {
		if (!selectedStudentId) return;
		try {
			const data = await getEvaluationGraphData(selectedStudentId);
			setGraphData(data);
		} catch {
			setGraphData([]);
		}
	}, [selectedStudentId]);

	useEffect(() => {
		let cancelled = false;
		if (selectedStudentId) {
			getEvaluationGraphData(selectedStudentId)
				.then((data) => {
					if (!cancelled) setGraphData(data);
				})
				.catch(() => {
					if (!cancelled) setGraphData([]);
				});
		}
		return () => {
			cancelled = true;
		};
	}, [selectedStudentId]);

	const handleSetScores = () => {
		if (!activeEntry) return;
		startTransition(async () => {
			try {
				await setEvaluationScores(activeEntry.id, scores);
				toast.success("Scores saved");
				setShowScoreDialog(false);
				router.refresh();
				loadGraph();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save scores",
				);
			}
		});
	};

	const handleSetAssessment = () => {
		if (!activeEntry) return;
		startTransition(async () => {
			try {
				await setEndSemesterAssessment(activeEntry.id, {
					theoryMarks,
					practicalMarks,
				});
				toast.success("Assessment marks saved");
				setShowAssessDialog(false);
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save assessment",
				);
			}
		});
	};

	const handleSign = () => {
		if (!activeEntry) return;
		startTransition(async () => {
			try {
				await signEvaluation(activeEntry.id, remark || undefined);
				toast.success("Evaluation signed");
				setShowSignDialog(false);
				setRemark("");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to sign");
			}
		});
	};

	const handleReject = () => {
		if (!activeEntry) return;
		startTransition(async () => {
			try {
				await rejectEvaluation(activeEntry.id, remark);
				toast.success("Evaluation returned for revision");
				setShowRejectDialog(false);
				setRemark("");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to reject");
			}
		});
	};

	const openScoreDialog = (entry: EvaluationEntry) => {
		setActiveEntry(entry);
		setScores({
			knowledgeScore: entry.knowledgeScore ?? 3,
			clinicalSkillScore: entry.clinicalSkillScore ?? 3,
			proceduralSkillScore: entry.proceduralSkillScore ?? 3,
			softSkillScore: entry.softSkillScore ?? 3,
			researchScore: entry.researchScore ?? 3,
		});
		setShowScoreDialog(true);
	};

	const openAssessDialog = (entry: EvaluationEntry) => {
		setActiveEntry(entry);
		setTheoryMarks(entry.theoryMarks ?? "");
		setPracticalMarks(entry.practicalMarks ?? "");
		setShowAssessDialog(true);
	};

	const openSignDialog = (entry: EvaluationEntry) => {
		setActiveEntry(entry);
		setRemark("");
		setShowSignDialog(true);
	};

	const openRejectDialog = (entry: EvaluationEntry) => {
		setActiveEntry(entry);
		setRemark("");
		setShowRejectDialog(true);
	};

	// Summary stats
	const totalEvals = evaluations.length;
	const signedEvals = evaluations.filter((e) => e.status === "SIGNED").length;
	const submittedEvals = evaluations.filter(
		(e) => e.status === "SUBMITTED",
	).length;

	if (students.length === 0) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-12">
					<p className="text-muted-foreground">
						No students found in the department.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Stats */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<Users className="h-8 w-8 text-blue-600" />
							<div>
								<p className="text-2xl font-bold">{students.length}</p>
								<p className="text-sm text-muted-foreground">Total Students</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<ClipboardList className="h-8 w-8 text-amber-600" />
							<div>
								<p className="text-2xl font-bold">{totalEvals}</p>
								<p className="text-sm text-muted-foreground">
									Total Evaluations
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<CheckCircle className="h-8 w-8 text-green-600" />
							<div>
								<p className="text-2xl font-bold">{signedEvals}</p>
								<p className="text-sm text-muted-foreground">Signed Off</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<BarChart3 className="h-8 w-8 text-orange-600" />
							<div>
								<p className="text-2xl font-bold">{submittedEvals}</p>
								<p className="text-sm text-muted-foreground">Pending Review</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Student Selector with batch filter */}
			<Card>
				<CardHeader>
					<CardTitle>Select Student</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Select value={batchFilter} onValueChange={setBatchFilter}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="Filter by batch" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Batches</SelectItem>
								{batches.map((b) => (
									<SelectItem key={b} value={b}>
										{b}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={selectedStudentId}
							onValueChange={setSelectedStudentId}
						>
							<SelectTrigger className="max-w-md">
								<SelectValue placeholder="Choose a student" />
							</SelectTrigger>
							<SelectContent>
								{filteredStudents.map((s) => (
									<SelectItem key={s.id} value={s.id}>
										{s.firstName} {s.lastName}
										{s.batch ? ` (${s.batch})` : ""}
										{s.currentSemester ? ` — Sem ${s.currentSemester}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{selectedStudent && (
				<Tabs defaultValue="reviews" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="reviews">
							<ClipboardList className="mr-2 h-4 w-4" />
							Reviews
						</TabsTrigger>
						<TabsTrigger value="graph">
							<BarChart3 className="mr-2 h-4 w-4" />
							Graph
						</TabsTrigger>
						<TabsTrigger value="assessment">
							<BookOpen className="mr-2 h-4 w-4" />
							Assessment
						</TabsTrigger>
					</TabsList>

					{/* Tab 1: Periodic Reviews */}
					<TabsContent value="reviews" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>
									Periodic Reviews — {selectedStudent.firstName}{" "}
									{selectedStudent.lastName}
								</CardTitle>
								<CardDescription>
									Review, score, and sign-off student evaluations
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-16">Sl No.</TableHead>
												<TableHead>Review</TableHead>
												<TableHead>Description</TableHead>
												<TableHead>Role</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Scores</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{REVIEW_SCHEDULE.map((slot) => {
												const entry = studentEvals.find(
													(e) =>
														e.semester === slot.semester &&
														e.reviewNo === slot.reviewNo,
												);
												const hasScores = entry?.knowledgeScore !== null;
												return (
													<TableRow key={slot.slNo}>
														<TableCell>{slot.slNo}</TableCell>
														<TableCell className="font-medium whitespace-nowrap">
															{slot.label}
														</TableCell>
														<TableCell className="max-w-48 truncate">
															{entry?.description || "—"}
														</TableCell>
														<TableCell>
															{entry?.roleInActivity || "—"}
														</TableCell>
														<TableCell>
															{entry ?
																<StatusBadge
																	status={entry.status as EntryStatus}
																/>
															:	"—"}
														</TableCell>
														<TableCell>
															{hasScores ?
																<Badge variant="outline" className="text-xs">
																	K:{entry?.knowledgeScore} C:
																	{entry?.clinicalSkillScore} P:
																	{entry?.proceduralSkillScore} S:
																	{entry?.softSkillScore} R:
																	{entry?.researchScore}
																</Badge>
															:	<span className="text-muted-foreground text-xs">
																	Not scored
																</span>
															}
														</TableCell>
														<TableCell className="text-right">
															{entry && entry.status !== "DRAFT" && (
																<div className="flex items-center justify-end gap-1">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => openScoreDialog(entry)}
																		disabled={isPending}
																	>
																		Score
																	</Button>
																	{(entry.status === "SUBMITTED" ||
																		entry.status === "SIGNED") && (
																		<>
																			<Button
																				variant="ghost"
																				size="icon"
																				onClick={() => openSignDialog(entry)}
																				disabled={isPending}
																			>
																				<CheckCircle className="h-4 w-4 text-green-600" />
																			</Button>
																			{entry.status === "SUBMITTED" && (
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						openRejectDialog(entry)
																					}
																					disabled={isPending}
																				>
																					<XCircle className="h-4 w-4 text-red-600" />
																				</Button>
																			)}
																		</>
																	)}
																</div>
															)}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Tab 2: Graph */}
					<TabsContent value="graph">
						<EvaluationGraph
							data={graphData}
							studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
						/>
					</TabsContent>

					{/* Tab 3: End Semester Assessment */}
					<TabsContent value="assessment" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>End Semester Assessment</CardTitle>
								<CardDescription>
									Set theory & practical marks for each semester
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Semester</TableHead>
												<TableHead>Theory</TableHead>
												<TableHead>Practical</TableHead>
												<TableHead className="text-right">Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{[1, 2, 3, 4, 5, 6].map((sem) => {
												const semEntry = studentEvals.find(
													(e) => e.semester === sem && e.reviewNo === 2,
												);
												return (
													<TableRow key={sem}>
														<TableCell className="font-medium">
															Semester {sem}
														</TableCell>
														<TableCell>
															{semEntry?.theoryMarks || "—"}
														</TableCell>
														<TableCell>
															{semEntry?.practicalMarks || "—"}
														</TableCell>
														<TableCell className="text-right">
															{semEntry ?
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openAssessDialog(semEntry)}
																	disabled={isPending}
																>
																	Set Marks
																</Button>
															:	<span className="text-muted-foreground text-xs">
																	No review entry
																</span>
															}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}

			{/* Score Dialog */}
			<Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Set Evaluation Scores</DialogTitle>
						<DialogDescription>
							Rate each domain from 1 (Poor) to 5 (Excellent)
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-6 py-4">
						{(
							[
								{
									key: "knowledgeScore" as const,
									label: "Knowledge",
								},
								{
									key: "clinicalSkillScore" as const,
									label: "Clinical Skills",
								},
								{
									key: "proceduralSkillScore" as const,
									label: "Procedural Skills",
								},
								{
									key: "softSkillScore" as const,
									label: "Soft Skills & Other",
								},
								{
									key: "researchScore" as const,
									label: "Research",
								},
							] as const
						).map(({ key, label }) => (
							<div key={key} className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>{label}</Label>
									<Badge variant="outline">
										{scores[key]} — {SCORE_LABELS[scores[key]] || ""}
									</Badge>
								</div>
								<Slider
									value={[scores[key]]}
									onValueChange={([val]) =>
										setScores((prev) => ({
											...prev,
											[key]: val,
										}))
									}
									min={1}
									max={5}
									step={1}
								/>
							</div>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowScoreDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleSetScores} disabled={isPending}>
							{isPending ? "Saving..." : "Save Scores"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Assessment Dialog */}
			<Dialog open={showAssessDialog} onOpenChange={setShowAssessDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>End Semester Assessment</DialogTitle>
						<DialogDescription>
							Enter theory and practical marks
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Theory Marks</Label>
							<Input
								value={theoryMarks}
								onChange={(e) => setTheoryMarks(e.target.value)}
								placeholder="e.g., 75/100"
							/>
						</div>
						<div className="space-y-2">
							<Label>Practical Marks</Label>
							<Input
								value={practicalMarks}
								onChange={(e) => setPracticalMarks(e.target.value)}
								placeholder="e.g., 80/100"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAssessDialog(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleSetAssessment} disabled={isPending}>
							{isPending ? "Saving..." : "Save Marks"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Sign Dialog */}
			<Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sign Evaluation</DialogTitle>
						<DialogDescription>
							Final HOD sign-off on this evaluation
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Remark (optional)</Label>
							<Textarea
								value={remark}
								onChange={(e) => setRemark(e.target.value)}
								placeholder="Add a remark..."
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowSignDialog(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSign}
							disabled={isPending}
							className="bg-green-600 hover:bg-green-700"
						>
							{isPending ? "Signing..." : "Sign Off"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Send back for revision with a remark
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Remark (required)</Label>
							<Textarea
								value={remark}
								onChange={(e) => setRemark(e.target.value)}
								placeholder="Explain what needs to be revised..."
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowRejectDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleReject}
							disabled={isPending || !remark.trim()}
							variant="destructive"
						>
							{isPending ? "Sending..." : "Request Revision"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
