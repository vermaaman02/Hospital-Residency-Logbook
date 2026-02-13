/**
 * @module EvaluationsClient
 * @description Client component for student evaluations — 3 tabs:
 *   Tab 1: Periodic Logbook Reviews (I1) — list + create
 *   Tab 2: Evaluation Graph (I2) — radar chart
 *   Tab 3: End Semester Assessment (I3) — read-only view
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 */

"use client";

import { useState, useTransition, useEffect } from "react";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EvaluationGraph } from "@/components/charts/EvaluationGraph";
import { REVIEW_SCHEDULE, SCORE_LABELS, SCORE_COLORS } from "@/lib/constants";
import {
	createPeriodicReview,
	submitPeriodicReview,
	deletePeriodicReview,
	updatePeriodicReview,
	getEvaluationGraphData,
} from "@/actions/evaluations";
import type { EntryStatus } from "@/types";
import { Plus, Trash2, Send, Edit } from "lucide-react";
import { toast } from "sonner";

interface EvaluationEntry {
	id: string;
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
	createdAt: string;
	updatedAt: string;
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

interface EvaluationsClientProps {
	evaluations: EvaluationEntry[];
}

export function EvaluationsClient({ evaluations }: EvaluationsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState<EvaluationEntry | null>(
		null,
	);
	const [formSemester, setFormSemester] = useState("");
	const [formReviewNo, setFormReviewNo] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formRole, setFormRole] = useState("");
	const [graphData, setGraphData] = useState<SemesterData[]>([]);

	useEffect(() => {
		let cancelled = false;
		getEvaluationGraphData("")
			.then((data) => {
				if (!cancelled) setGraphData(data);
			})
			.catch(() => {
				// No data yet
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const handleCreate = () => {
		startTransition(async () => {
			try {
				await createPeriodicReview({
					semester: parseInt(formSemester, 10),
					reviewNo: parseInt(formReviewNo, 10),
					description: formDescription || undefined,
					roleInActivity: formRole || undefined,
				});
				toast.success("Periodic review created");
				setShowCreateDialog(false);
				resetForm();
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to create review",
				);
			}
		});
	};

	const handleUpdate = () => {
		if (!selectedEntry) return;
		startTransition(async () => {
			try {
				await updatePeriodicReview(selectedEntry.id, {
					semester: selectedEntry.semester,
					reviewNo: selectedEntry.reviewNo,
					description: formDescription || undefined,
					roleInActivity: formRole || undefined,
				});
				toast.success("Review updated");
				setShowEditDialog(false);
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to update review",
				);
			}
		});
	};

	const handleSubmit = (id: string) => {
		startTransition(async () => {
			try {
				await submitPeriodicReview(id);
				toast.success("Review submitted for faculty sign-off");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to submit review",
				);
			}
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			try {
				await deletePeriodicReview(id);
				toast.success("Review deleted");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to delete review",
				);
			}
		});
	};

	const openEdit = (entry: EvaluationEntry) => {
		setSelectedEntry(entry);
		setFormDescription(entry.description || "");
		setFormRole(entry.roleInActivity || "");
		setShowEditDialog(true);
	};

	const resetForm = () => {
		setFormSemester("");
		setFormReviewNo("");
		setFormDescription("");
		setFormRole("");
	};

	// Find which reviews are already created
	const existingReviews = new Set(
		evaluations.map((e) => `${e.semester}-${e.reviewNo}`),
	);

	const getStatusBadge = (status: string) => (
		<StatusBadge status={status as EntryStatus} />
	);

	const scoreCell = (score: number | null) => {
		if (score === null) return <span className="text-muted-foreground">—</span>;
		const label = SCORE_LABELS[score] || "";
		const color = SCORE_COLORS[score] || "";
		return (
			<Badge variant="outline" className={`text-xs ${color}`}>
				{score} — {label}
			</Badge>
		);
	};

	return (
		<Tabs defaultValue="reviews" className="w-full">
			<TabsList className="grid w-full grid-cols-3">
				<TabsTrigger value="reviews">Periodic Reviews</TabsTrigger>
				<TabsTrigger value="graph">Evaluation Graph</TabsTrigger>
				<TabsTrigger value="assessment">End Semester</TabsTrigger>
			</TabsList>

			{/* Tab 1: Periodic Logbook Reviews */}
			<TabsContent value="reviews" className="space-y-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<div>
							<CardTitle>Periodic Logbook Faculty Review</CardTitle>
							<CardDescription>
								12 reviews total — 2 per semester across 6 semesters
							</CardDescription>
						</div>
						<Button
							onClick={() => setShowCreateDialog(true)}
							size="sm"
							disabled={evaluations.length >= 12}
						>
							<Plus className="mr-2 h-4 w-4" />
							New Review
						</Button>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">Sl No.</TableHead>
										<TableHead>Review</TableHead>
										<TableHead>Description of Work Done</TableHead>
										<TableHead>Role in Activity</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Faculty Remark</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{REVIEW_SCHEDULE.map((slot) => {
										const entry = evaluations.find(
											(e) =>
												e.semester === slot.semester &&
												e.reviewNo === slot.reviewNo,
										);
										return (
											<TableRow key={slot.slNo}>
												<TableCell>{slot.slNo}</TableCell>
												<TableCell className="font-medium whitespace-nowrap">
													{slot.label}
												</TableCell>
												<TableCell className="max-w-60 truncate">
													{entry?.description || (
														<span className="text-muted-foreground italic">
															Not yet filled
														</span>
													)}
												</TableCell>
												<TableCell>{entry?.roleInActivity || "—"}</TableCell>
												<TableCell>
													{entry ? getStatusBadge(entry.status) : "—"}
												</TableCell>
												<TableCell className="max-w-40 truncate">
													{entry?.facultyRemark || "—"}
												</TableCell>
												<TableCell className="text-right">
													{entry ?
														<div className="flex items-center justify-end gap-1">
															{entry.status === "DRAFT" && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => openEdit(entry)}
																		disabled={isPending}
																	>
																		<Edit className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleSubmit(entry.id)}
																		disabled={isPending}
																	>
																		<Send className="h-4 w-4 text-blue-600" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleDelete(entry.id)}
																		disabled={isPending}
																	>
																		<Trash2 className="h-4 w-4 text-red-600" />
																	</Button>
																</>
															)}
															{entry.status === "NEEDS_REVISION" && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => openEdit(entry)}
																		disabled={isPending}
																	>
																		<Edit className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleSubmit(entry.id)}
																		disabled={isPending}
																	>
																		<Send className="h-4 w-4 text-blue-600" />
																	</Button>
																</>
															)}
														</div>
													:	<span className="text-muted-foreground">—</span>}
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

			{/* Tab 2: Evaluation Graph */}
			<TabsContent value="graph">
				<EvaluationGraph data={graphData} />
			</TabsContent>

			{/* Tab 3: End Semester Assessment */}
			<TabsContent value="assessment" className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>End Semester Assessment</CardTitle>
						<CardDescription>
							Theory & Practical marks and 5-domain scores filled by faculty per
							semester
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Semester</TableHead>
										<TableHead>Knowledge</TableHead>
										<TableHead>Clinical Skills</TableHead>
										<TableHead>Procedural Skills</TableHead>
										<TableHead>Soft Skills</TableHead>
										<TableHead>Research</TableHead>
										<TableHead>Theory</TableHead>
										<TableHead>Practical</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{[1, 2, 3, 4, 5, 6].map((sem) => {
										// Get the latest evaluation with scores for this semester
										const semEvals = evaluations.filter(
											(e) => e.semester === sem,
										);
										const scored = semEvals.find(
											(e) => e.knowledgeScore !== null,
										);
										const withMarks = semEvals.find(
											(e) => e.theoryMarks !== null,
										);
										return (
											<TableRow key={sem}>
												<TableCell className="font-medium">
													Semester {sem}
												</TableCell>
												<TableCell>
													{scoreCell(scored?.knowledgeScore ?? null)}
												</TableCell>
												<TableCell>
													{scoreCell(scored?.clinicalSkillScore ?? null)}
												</TableCell>
												<TableCell>
													{scoreCell(scored?.proceduralSkillScore ?? null)}
												</TableCell>
												<TableCell>
													{scoreCell(scored?.softSkillScore ?? null)}
												</TableCell>
												<TableCell>
													{scoreCell(scored?.researchScore ?? null)}
												</TableCell>
												<TableCell>{withMarks?.theoryMarks || "—"}</TableCell>
												<TableCell>
													{withMarks?.practicalMarks || "—"}
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

			{/* Create Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Periodic Review</DialogTitle>
						<DialogDescription>
							Create a new periodic logbook review entry
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="semester">Semester</Label>
								<Select value={formSemester} onValueChange={setFormSemester}>
									<SelectTrigger>
										<SelectValue placeholder="Select semester" />
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
							<div className="space-y-2">
								<Label htmlFor="reviewNo">Review No.</Label>
								<Select value={formReviewNo} onValueChange={setFormReviewNo}>
									<SelectTrigger>
										<SelectValue placeholder="Select review" />
									</SelectTrigger>
									<SelectContent>
										{[1, 2].map((r) => (
											<SelectItem
												key={r}
												value={r.toString()}
												disabled={existingReviews.has(`${formSemester}-${r}`)}
											>
												Review {r}
												{existingReviews.has(`${formSemester}-${r}`) &&
													" (exists)"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description of Work Done</Label>
							<Textarea
								id="description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Describe the work done during this review period"
								rows={4}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role">Role in the Activity</Label>
							<Input
								id="role"
								value={formRole}
								onChange={(e) => setFormRole(e.target.value)}
								placeholder="e.g., Primary Resident, Team Member"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowCreateDialog(false);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={isPending || !formSemester || !formReviewNo}
						>
							{isPending ? "Creating..." : "Create Review"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Periodic Review</DialogTitle>
						<DialogDescription>
							{selectedEntry &&
								`SEM ${selectedEntry.semester} — Review ${selectedEntry.reviewNo}`}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="editDescription">Description of Work Done</Label>
							<Textarea
								id="editDescription"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Describe the work done during this review period"
								rows={4}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="editRole">Role in the Activity</Label>
							<Input
								id="editRole"
								value={formRole}
								onChange={(e) => setFormRole(e.target.value)}
								placeholder="e.g., Primary Resident, Team Member"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowEditDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleUpdate} disabled={isPending}>
							{isPending ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Tabs>
	);
}
