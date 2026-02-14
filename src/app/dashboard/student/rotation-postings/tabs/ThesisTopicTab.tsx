/**
 * @module ThesisTopicTab
 * @description Thesis topic management with inline cell editing.
 * Topic/guide section toggles between edit and read-only.
 * Semester records use inline editing directly in the table — click a row to edit.
 *
 * @see PG Logbook .md — "THESIS" section
 */

"use client";

import { useState, useTransition, useCallback } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Loader2,
	Save,
	Pencil,
	BookOpen,
	GraduationCap,
	Check,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { updateThesis, upsertThesisSemesterRecord } from "@/actions/thesis";
import type {
	ThesisData,
	ThesisSemesterRecordData,
	FacultyOption,
} from "../RotationPostingsClient";

interface ThesisTopicTabProps {
	thesis: ThesisData;
	facultyList: FacultyOption[];
}

const SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

export function ThesisTopicTab({ thesis, facultyList }: ThesisTopicTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Thesis topic/guide state
	const [topic, setTopic] = useState(thesis.topic ?? "");
	const [chiefGuide, setChiefGuide] = useState(thesis.chiefGuide ?? "");
	const [isTopicEditing, setIsTopicEditing] = useState(!thesis.topic);

	// Inline editing for semester records
	const [editingSemester, setEditingSemester] = useState<number | null>(null);
	const [semesterForm, setSemesterForm] = useState({
		srJrMember: "",
		srMember: "",
		facultyMember: "",
	});

	const getSemesterRecord = useCallback(
		(sem: number): ThesisSemesterRecordData | undefined => {
			return thesis.semesterRecords.find((r) => r.semester === sem);
		},
		[thesis.semesterRecords],
	);

	function handleSaveTopic() {
		if (!topic.trim()) {
			toast.error("Thesis topic is required");
			return;
		}
		startTransition(async () => {
			try {
				await updateThesis({ topic, chiefGuide: chiefGuide || undefined });
				toast.success("Thesis details saved");
				setIsTopicEditing(false);
				router.refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to save thesis",
				);
			}
		});
	}

	function startEditingSemester(semester: number) {
		const record = getSemesterRecord(semester);
		setEditingSemester(semester);
		setSemesterForm({
			srJrMember: record?.srJrMember ?? "",
			srMember: record?.srMember ?? "",
			facultyMember: record?.facultyMember ?? "",
		});
	}

	function cancelEditingSemester() {
		setEditingSemester(null);
	}

	function handleSaveSemester() {
		if (editingSemester === null) return;
		startTransition(async () => {
			try {
				await upsertThesisSemesterRecord(thesis.id, {
					semester: editingSemester,
					srJrMember: semesterForm.srJrMember || undefined,
					srMember: semesterForm.srMember || undefined,
					facultyMember: semesterForm.facultyMember || undefined,
				});
				toast.success(`Semester ${editingSemester} record saved`);
				setEditingSemester(null);
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save");
			}
		});
	}

	function getFacultyName(name: string | null) {
		if (!name) return null;
		const faculty = facultyList.find((f) => f.id === name);
		if (faculty) return `${faculty.firstName} ${faculty.lastName}`;
		return name;
	}

	return (
		<div className="space-y-6">
			{/* Thesis Topic & Chief Guide */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<GraduationCap className="h-5 w-5 text-hospital-primary" />
							<CardTitle className="text-lg">Thesis Details</CardTitle>
						</div>
						{!isTopicEditing && thesis.topic && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsTopicEditing(true)}
							>
								<Pencil className="h-3.5 w-3.5 mr-1.5" />
								Edit
							</Button>
						)}
					</div>
					<CardDescription>
						Your MD thesis topic and chief guide details
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isTopicEditing ?
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium">
									Thesis Topic <span className="text-destructive">*</span>
								</label>
								<Input
									className="mt-1.5"
									placeholder="Enter your thesis topic..."
									value={topic}
									onChange={(e) => setTopic(e.target.value)}
									maxLength={500}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Chief Guide</label>
								<Select
									value={chiefGuide || "none"}
									onValueChange={(v) => setChiefGuide(v === "none" ? "" : v)}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue placeholder="Select chief guide" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Not assigned</SelectItem>
										{facultyList.map((f) => (
											<SelectItem
												key={f.id}
												value={`${f.firstName} ${f.lastName}`}
											>
												{f.firstName} {f.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex gap-2 justify-end">
								{thesis.topic && (
									<Button
										variant="outline"
										onClick={() => {
											setTopic(thesis.topic ?? "");
											setChiefGuide(thesis.chiefGuide ?? "");
											setIsTopicEditing(false);
										}}
										disabled={isPending}
									>
										Cancel
									</Button>
								)}
								<Button onClick={handleSaveTopic} disabled={isPending}>
									{isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									<Save className="h-4 w-4 mr-2" />
									Save
								</Button>
							</div>
						</div>
					:	<div className="space-y-3">
							<div>
								<span className="text-sm text-muted-foreground">Topic:</span>
								<p className="font-medium mt-0.5">
									{thesis.topic || (
										<span className="text-muted-foreground italic">
											Not set yet
										</span>
									)}
								</p>
							</div>
							<div>
								<span className="text-sm text-muted-foreground">
									Chief Guide:
								</span>
								<p className="font-medium mt-0.5">
									{thesis.chiefGuide || (
										<span className="text-muted-foreground italic">
											Not assigned
										</span>
									)}
								</p>
							</div>
						</div>
					}
				</CardContent>
			</Card>

			{/* Semester-wise Committee Records — Inline Editing */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-hospital-primary" />
						<CardTitle className="text-lg">
							Semester-wise Thesis Committee
						</CardTitle>
					</div>
					<CardDescription>
						Click on any semester row to edit committee members inline
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-150">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-24 text-center font-bold">
										Semester
									</TableHead>
									<TableHead className="font-bold">SR/JR Member</TableHead>
									<TableHead className="font-bold">SR Member</TableHead>
									<TableHead className="font-bold">Faculty Member</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Action
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{SEMESTERS.map((sem) => {
									const record = getSemesterRecord(sem);
									const isEditing = editingSemester === sem;
									const hasData =
										record?.srJrMember ||
										record?.srMember ||
										record?.facultyMember;

									if (isEditing) {
										return (
											<TableRow key={sem} className="bg-blue-50/60">
												<TableCell className="text-center font-bold text-hospital-primary">
													{sem}
												</TableCell>
												<TableCell>
													<Input
														className="h-8 text-sm"
														placeholder="SR/JR member name"
														value={semesterForm.srJrMember}
														onChange={(e) =>
															setSemesterForm((prev) => ({
																...prev,
																srJrMember: e.target.value,
															}))
														}
														maxLength={200}
													/>
												</TableCell>
												<TableCell>
													<Input
														className="h-8 text-sm"
														placeholder="SR member name"
														value={semesterForm.srMember}
														onChange={(e) =>
															setSemesterForm((prev) => ({
																...prev,
																srMember: e.target.value,
															}))
														}
														maxLength={200}
													/>
												</TableCell>
												<TableCell>
													<Select
														value={semesterForm.facultyMember || "none"}
														onValueChange={(v) =>
															setSemesterForm((prev) => ({
																...prev,
																facultyMember: v === "none" ? "" : v,
															}))
														}
													>
														<SelectTrigger className="h-8 text-sm">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">None</SelectItem>
															{facultyList.map((f) => (
																<SelectItem
																	key={f.id}
																	value={`${f.firstName} ${f.lastName}`}
																>
																	{f.firstName} {f.lastName}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<div className="flex items-center justify-center gap-1">
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
															onClick={handleSaveSemester}
															disabled={isPending}
														>
															{isPending ?
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															:	<Check className="h-3.5 w-3.5" />}
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
															onClick={cancelEditingSemester}
															disabled={isPending}
														>
															<X className="h-3.5 w-3.5" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									}

									return (
										<TableRow
											key={sem}
											className={cn(
												"cursor-pointer transition-colors hover:bg-muted/40",
												hasData ? "" : "text-muted-foreground/60",
											)}
											onClick={() => startEditingSemester(sem)}
										>
											<TableCell className="text-center font-medium">
												{sem}
											</TableCell>
											<TableCell className="text-sm">
												{record?.srJrMember || (
													<span className="text-muted-foreground/40 italic text-xs">
														Click to fill
													</span>
												)}
											</TableCell>
											<TableCell className="text-sm">
												{record?.srMember || (
													<span className="text-muted-foreground/40 italic text-xs">
														Click to fill
													</span>
												)}
											</TableCell>
											<TableCell className="text-sm">
												{getFacultyName(record?.facultyMember ?? null) || (
													<span className="text-muted-foreground/40 italic text-xs">
														Click to fill
													</span>
												)}
											</TableCell>
											<TableCell className="text-center">
												<span className="text-xs text-muted-foreground/40">
													<Pencil className="h-3 w-3 inline" />
												</span>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{/* Completion */}
					<div className="mt-4 text-sm text-muted-foreground px-2 sm:px-0">
						Semesters filled:{" "}
						<span className="font-medium text-foreground">
							{thesis.semesterRecords.length}/6
						</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
