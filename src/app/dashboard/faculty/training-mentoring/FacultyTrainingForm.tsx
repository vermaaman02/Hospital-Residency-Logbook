/**
 * @module FacultyTrainingForm
 * @description Faculty evaluates assigned students using inline table editing.
 * Select a student → see 6 semesters as rows → click a row → edit 5-domain scores inline.
 * Consistent with inline cell editing used across all tabs.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
	Loader2,
	Check,
	X,
	Star,
	Target,
	Pencil,
	Search,
	ChevronLeft,
	ChevronRight,
	Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { upsertTrainingRecord } from "@/actions/training-mentoring";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Student {
	id: string;
	clerkId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	batchRelation?: { name: string } | null;
	currentSemester?: number | null;
}

export interface ExistingRecord {
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
	role?: "faculty" | "hod";
}

const DOMAINS = [
	{
		key: "knowledgeScore",
		label: "Knowledge",
		shortLabel: "Know.",
		color: "#0066CC",
	},
	{
		key: "clinicalSkillScore",
		label: "Clinical Skills",
		shortLabel: "Clinical",
		color: "#00897B",
	},
	{
		key: "proceduralSkillScore",
		label: "Procedural Skills",
		shortLabel: "Proc.",
		color: "#D32F2F",
	},
	{
		key: "softSkillScore",
		label: "Soft Skills",
		shortLabel: "Soft",
		color: "#F59E0B",
	},
	{
		key: "researchScore",
		label: "Research",
		shortLabel: "Research",
		color: "#7C3AED",
	},
] as const;

const SCORE_OPTIONS = [
	{ value: "5", label: "5 — Exceptional" },
	{ value: "4", label: "4 — Exceeds" },
	{ value: "3", label: "3 — Meets" },
	{ value: "2", label: "2 — Inconsistent" },
	{ value: "1", label: "1 — Remedial" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];

const STUDENTS_PER_PAGE = 10;

export function FacultyTrainingForm({
	students,
	existingRecords,
	role = "faculty",
}: FacultyTrainingFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedStudent, setSelectedStudent] = useState<string>("");

	// Search & filter state
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState("ALL");
	const [page, setPage] = useState(1);

	// Inline editing state
	const [editingSemester, setEditingSemester] = useState<number | null>(null);
	const [scores, setScores] = useState<Record<string, string>>({
		knowledgeScore: "",
		clinicalSkillScore: "",
		proceduralSkillScore: "",
		softSkillScore: "",
		researchScore: "",
	});
	const [remarks, setRemarks] = useState("");

	// Batch list for filter
	const batches = useMemo(() => {
		const set = new Set<string>();
		students.forEach((s) => {
			if (s.batchRelation?.name) set.add(s.batchRelation.name);
		});
		return Array.from(set).sort();
	}, [students]);

	// Filtered & paginated student list
	const filteredStudents = useMemo(() => {
		return students.filter((s) => {
			const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
			const q = search.toLowerCase();
			const matchesSearch =
				!q || name.includes(q) || (s.email ?? "").toLowerCase().includes(q);
			const matchesBatch =
				batchFilter === "ALL" || s.batchRelation?.name === batchFilter;
			return matchesSearch && matchesBatch;
		});
	}, [students, search, batchFilter]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE),
	);
	const paginatedStudents = filteredStudents.slice(
		(page - 1) * STUDENTS_PER_PAGE,
		page * STUDENTS_PER_PAGE,
	);

	const handleSearch = useCallback((val: string) => {
		setSearch(val);
		setPage(1);
	}, []);
	const handleBatchFilter = useCallback((val: string) => {
		setBatchFilter(val);
		setPage(1);
	}, []);

	const studentRecords = useMemo(
		() =>
			existingRecords
				.filter((r) => r.userId === selectedStudent)
				.sort((a, b) => a.semester - b.semester),
		[existingRecords, selectedStudent],
	);

	const getRecord = useCallback(
		(sem: number): ExistingRecord | undefined => {
			return studentRecords.find((r) => r.semester === sem);
		},
		[studentRecords],
	);

	const overallScore = useMemo(() => {
		const vals = Object.values(scores)
			.map((v) => parseInt(v))
			.filter((v) => !isNaN(v));
		if (vals.length === 0) return null;
		return (
			Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
		);
	}, [scores]);

	function handleStudentChange(studentId: string) {
		setSelectedStudent(studentId);
		setEditingSemester(null);
	}

	function startEditing(sem: number) {
		const record = getRecord(sem);
		setEditingSemester(sem);
		setScores({
			knowledgeScore: record?.knowledgeScore?.toString() ?? "",
			clinicalSkillScore: record?.clinicalSkillScore?.toString() ?? "",
			proceduralSkillScore: record?.proceduralSkillScore?.toString() ?? "",
			softSkillScore: record?.softSkillScore?.toString() ?? "",
			researchScore: record?.researchScore?.toString() ?? "",
		});
		setRemarks(record?.remarks ?? "");
	}

	function cancelEditing() {
		setEditingSemester(null);
	}

	function handleSave() {
		if (!selectedStudent || editingSemester === null) return;
		const hasAnyScore = Object.values(scores).some((v) => v !== "");
		if (!hasAnyScore) {
			toast.error("Please assign at least one domain score");
			return;
		}

		const payload: Record<string, number | string | undefined> = {
			semester: editingSemester,
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
				toast.success(`Semester ${editingSemester} evaluation saved`);
				setEditingSemester(null);
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
			{/* Student Selection with Search & Filter */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Target className="h-5 w-5 text-hospital-primary" />
						<CardTitle>5-Domain Evaluation</CardTitle>
					</div>
					<CardDescription>
						Search and select a student, then click a semester row to evaluate
						inline
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Search & Filter Bar */}
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="Search by student name or email..."
								value={search}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						{batches.length > 1 && (
							<Select value={batchFilter} onValueChange={handleBatchFilter}>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Batch" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Batches</SelectItem>
									{batches.map((b) => (
										<SelectItem key={b} value={b}>
											{b}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Student List */}
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="font-bold">Student</TableHead>
									<TableHead className="font-bold hidden sm:table-cell">
										Batch
									</TableHead>
									<TableHead className="font-bold hidden sm:table-cell text-center">
										Semesters Evaluated
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Select
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedStudents.length === 0 ?
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-6 text-muted-foreground"
										>
											{search || batchFilter !== "ALL" ?
												"No matching students"
											:	"No students available"}
										</TableCell>
									</TableRow>
								:	paginatedStudents.map((s) => {
										const recordCount = existingRecords.filter(
											(r) =>
												r.userId === s.id &&
												DOMAINS.some(
													(d) =>
														(r as unknown as Record<string, unknown>)[d.key] !==
														null,
												),
										).length;
										const isSelected = selectedStudent === s.id;
										return (
											<TableRow
												key={s.id}
												className={cn(
													"cursor-pointer transition-colors",
													isSelected ?
														"bg-hospital-primary/10 border-l-2 border-hospital-primary"
													:	"hover:bg-muted/40",
												)}
												onClick={() => handleStudentChange(s.id)}
											>
												<TableCell className="font-medium">
													<Link
														href={`/dashboard/${role}/training-mentoring/student/${s.id}`}
														className="group"
														onClick={(e) => e.stopPropagation()}
													>
														<div className="text-hospital-primary group-hover:underline">
															{s.firstName} {s.lastName}
														</div>
														<span className="block text-xs text-muted-foreground">
															{s.email}
														</span>
													</Link>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
													{s.batchRelation?.name ?? "—"}
												</TableCell>
												<TableCell className="text-center hidden sm:table-cell">
													<Badge
														variant={recordCount > 0 ? "default" : "outline"}
														className={cn(
															"text-xs",
															recordCount > 0 &&
																"bg-green-100 text-green-700 hover:bg-green-100",
														)}
													>
														{recordCount}/6
													</Badge>
												</TableCell>
												<TableCell className="text-center">
													{isSelected ?
														<Badge className="bg-hospital-primary text-white text-xs">
															Selected
														</Badge>
													:	<Button
															variant="ghost"
															size="sm"
															className="text-xs h-7"
														>
															<Users className="h-3.5 w-3.5 mr-1" /> Evaluate
														</Button>
													}
												</TableCell>
											</TableRow>
										);
									})
								}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-1">
							<p className="text-sm text-muted-foreground">
								{filteredStudents.length} student
								{filteredStudents.length !== 1 ? "s" : ""}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="text-sm font-medium">
									{page} / {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Inline Scoring Table */}
			{selectedStudent && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">
							Semester-wise Evaluation —{" "}
							{students.find((s) => s.id === selectedStudent)?.firstName}{" "}
							{students.find((s) => s.id === selectedStudent)?.lastName}
						</CardTitle>
						<CardDescription>
							Click on any semester row to edit scores inline (1-5 per domain)
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 sm:p-6 overflow-x-auto">
						<div className="border rounded-lg min-w-180">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-20 text-center font-bold">
											Sem
										</TableHead>
										{DOMAINS.map((d) => (
											<TableHead key={d.key} className="font-bold text-center">
												<div className="flex items-center justify-center gap-1">
													<span
														className="h-2 w-2 rounded-full shrink-0"
														style={{ backgroundColor: d.color }}
													/>
													<span className="hidden lg:inline">{d.label}</span>
													<span className="lg:hidden">{d.shortLabel}</span>
												</div>
											</TableHead>
										))}
										<TableHead className="w-20 text-center font-bold">
											Overall
										</TableHead>
										<TableHead className="w-24 text-center font-bold">
											Status
										</TableHead>
										<TableHead className="w-28 text-center font-bold">
											Action
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{SEMESTERS.map((sem) => {
										const record = getRecord(sem);
										const isEditing = editingSemester === sem;

										if (isEditing) {
											return (
												<InlineEditRow
													key={sem}
													semester={sem}
													scores={scores}
													remarks={remarks}
													overallScore={overallScore}
													isPending={isPending}
													onScoreChange={(key, val) =>
														setScores((prev) => ({
															...prev,
															[key]: val === "none" ? "" : val,
														}))
													}
													onRemarksChange={setRemarks}
													onSave={handleSave}
													onCancel={cancelEditing}
												/>
											);
										}

										return (
											<ReadOnlyRow
												key={sem}
												semester={sem}
												record={record}
												onClick={() => startEditing(sem)}
											/>
										);
									})}
								</TableBody>
							</Table>
						</div>

						{/* Score Legend */}
						<div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground px-2 sm:px-0">
							<span className="font-medium">Scale:</span>
							<span>1 = Remedial</span>
							<span>2 = Inconsistent</span>
							<span>3 = Meets</span>
							<span>4 = Exceeds</span>
							<span>5 = Exceptional</span>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ======================== INLINE EDIT ROW ========================

interface InlineEditRowProps {
	semester: number;
	scores: Record<string, string>;
	remarks: string;
	overallScore: number | null;
	isPending: boolean;
	onScoreChange: (key: string, value: string) => void;
	onRemarksChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
}

function InlineEditRow({
	semester,
	scores,
	remarks,
	overallScore,
	isPending,
	onScoreChange,
	onRemarksChange,
	onSave,
	onCancel,
}: InlineEditRowProps) {
	return (
		<>
			<TableRow className="bg-blue-50/60">
				<TableCell className="text-center font-bold text-hospital-primary">
					{semester}
				</TableCell>
				{DOMAINS.map((domain) => (
					<TableCell key={domain.key} className="text-center">
						<Select
							value={scores[domain.key] || "none"}
							onValueChange={(v) => onScoreChange(domain.key, v)}
						>
							<SelectTrigger className="h-8 text-sm w-full min-w-20">
								<SelectValue placeholder="—" />
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
					</TableCell>
				))}
				<TableCell className="text-center font-bold">
					{overallScore !== null ?
						<Badge variant="default" className="bg-hospital-primary text-white">
							{overallScore.toFixed(1)}
						</Badge>
					:	"—"}
				</TableCell>
				<TableCell className="text-center">
					<Badge variant="outline" className="text-amber-600 border-amber-300">
						Editing
					</Badge>
				</TableCell>
				<TableCell>
					<div className="flex items-center justify-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
							onClick={onSave}
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
							onClick={onCancel}
							disabled={isPending}
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
				</TableCell>
			</TableRow>
			{/* Remarks row (part of editing) */}
			<TableRow className="bg-blue-50/40 border-b-2 border-blue-200">
				<TableCell className="text-right text-xs text-muted-foreground">
					Remarks:
				</TableCell>
				<TableCell colSpan={7}>
					<Textarea
						className="h-9 min-h-9 text-sm resize-none"
						placeholder="Optional remarks about performance..."
						value={remarks}
						onChange={(e) => onRemarksChange(e.target.value)}
						rows={1}
						maxLength={1000}
					/>
				</TableCell>
			</TableRow>
		</>
	);
}

// ======================== READ-ONLY ROW ========================

interface ReadOnlyRowProps {
	semester: number;
	record: ExistingRecord | undefined;
	onClick: () => void;
}

function ReadOnlyRow({ semester, record, onClick }: ReadOnlyRowProps) {
	const hasData =
		record &&
		DOMAINS.some(
			(d) => (record[d.key as keyof ExistingRecord] as number | null) !== null,
		);

	return (
		<TableRow
			className={cn(
				"cursor-pointer transition-colors hover:bg-muted/40",
				hasData ? "" : "text-muted-foreground/60",
			)}
			onClick={onClick}
		>
			<TableCell className="text-center font-medium">{semester}</TableCell>
			{DOMAINS.map((domain) => {
				const score = record?.[domain.key as keyof ExistingRecord] as
					| number
					| null;
				return (
					<TableCell key={domain.key} className="text-center">
						{score ?
							<div className="flex items-center justify-center gap-1">
								<div className="flex gap-0.5">
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className="h-1.5 w-3 rounded-full"
											style={{
												backgroundColor: i <= score ? domain.color : "#E5E7EB",
											}}
										/>
									))}
								</div>
								<span className="text-xs font-medium">{score}</span>
							</div>
						:	<span className="text-muted-foreground/40 italic text-xs">
								Click to score
							</span>
						}
					</TableCell>
				);
			})}
			<TableCell className="text-center font-medium">
				{record?.overallScore ?
					<span className="font-bold">{record.overallScore.toFixed(1)}</span>
				:	"—"}
			</TableCell>
			<TableCell className="text-center">
				{record ?
					<Badge
						variant={record.status === "SIGNED" ? "default" : "outline"}
						className={cn(
							"text-xs",
							record.status === "SIGNED" &&
								"bg-green-100 text-green-700 hover:bg-green-100",
							record.status === "SUBMITTED" &&
								"text-amber-600 border-amber-300",
						)}
					>
						{record.status === "SIGNED" ?
							"Approved"
						: record.status === "SUBMITTED" ?
							"Pending"
						:	record.status}
					</Badge>
				:	<span className="text-xs text-muted-foreground/40">—</span>}
			</TableCell>
			<TableCell className="text-center">
				<span className="text-xs text-muted-foreground/40">
					<Pencil className="h-3 w-3 inline" />
				</span>
			</TableCell>
		</TableRow>
	);
}
