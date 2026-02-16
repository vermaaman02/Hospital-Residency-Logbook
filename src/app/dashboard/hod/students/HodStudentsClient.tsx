/**
 * @module HodStudentsClient
 * @description Professional HOD student management dashboard with stats overview,
 * card/table view toggle, deep student detail drawers, and filtering.
 * Mobile-first responsive design.
 *
 * @see copilot-instructions.md — Section 6, 11
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Search,
	Users,
	GraduationCap,
	BookOpen,
	CheckCircle2,
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	Stethoscope,
	Award,
	ArrowRight,
	LayoutGrid,
	List,
	TrendingUp,
	Eye,
	ChevronDown,
	ChevronUp,
} from "lucide-react";

/* ─── types ─── */

interface StudentData {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	batch: string | null;
	currentSemester: number | null;
	profileImage: string | null;
	status: string;
	joinedAt: string;
	logCounts: {
		caseManagement: number;
		procedures: number;
		diagnostics: number;
		imaging: number;
		academic: number;
		clinicalSkills: number;
		evaluations: number;
	};
	totalLogs: number;
	totalSigned: number;
	thesisTopic: string | null;
	thesisStatus: string | null;
	assignedFaculty: { semester: number; facultyName: string }[];
}

interface Stats {
	totalStudents: number;
	totalFaculty: number;
	totalEntries: number;
	totalSigned: number;
	avgEntriesPerStudent: number;
}

interface HodStudentsClientProps {
	students: StudentData[];
	stats: Stats;
}

const MODULE_ICONS = {
	caseManagement: ClipboardList,
	procedures: Syringe,
	diagnostics: Activity,
	imaging: Scan,
	clinicalSkills: Stethoscope,
	academic: Award,
} as const;

const MODULE_COLORS = {
	caseManagement: { text: "text-blue-600", bg: "bg-blue-50" },
	procedures: { text: "text-purple-600", bg: "bg-purple-50" },
	diagnostics: { text: "text-amber-600", bg: "bg-amber-50" },
	imaging: { text: "text-teal-600", bg: "bg-teal-50" },
	clinicalSkills: { text: "text-rose-600", bg: "bg-rose-50" },
	academic: { text: "text-indigo-600", bg: "bg-indigo-50" },
} as const;

const MODULE_LABELS = {
	caseManagement: "Cases",
	procedures: "Procedures",
	diagnostics: "Diagnostics",
	imaging: "Imaging",
	clinicalSkills: "Clinical",
	academic: "Academic",
} as const;

export function HodStudentsClient({ students, stats }: HodStudentsClientProps) {
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState<string>("all");
	const [semesterFilter, setSemesterFilter] = useState<string>("all");
	const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<"name" | "entries" | "semester">("name");

	const batches = Array.from(
		new Set(students.map((s) => s.batch).filter(Boolean)),
	) as string[];

	const filtered = students
		.filter((s) => {
			const matchesSearch =
				`${s.firstName} ${s.lastName}`
					.toLowerCase()
					.includes(search.toLowerCase()) ||
				s.email.toLowerCase().includes(search.toLowerCase());
			const matchesBatch = batchFilter === "all" || s.batch === batchFilter;
			const matchesSemester =
				semesterFilter === "all" ||
				s.currentSemester?.toString() === semesterFilter;
			return matchesSearch && matchesBatch && matchesSemester;
		})
		.sort((a, b) => {
			if (sortBy === "entries") return b.totalLogs - a.totalLogs;
			if (sortBy === "semester")
				return (a.currentSemester ?? 0) - (b.currentSemester ?? 0);
			return `${a.firstName} ${a.lastName}`.localeCompare(
				`${b.firstName} ${b.lastName}`,
			);
		});

	if (students.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<Users className="h-16 w-16 mx-auto mb-4 opacity-40" />
				<h3 className="text-lg font-medium mb-2">No Students Found</h3>
				<p className="text-sm">
					No students registered yet. Use{" "}
					<Link
						href="/dashboard/hod/manage-users"
						className="text-hospital-primary underline"
					>
						Manage Users
					</Link>{" "}
					to onboard students.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* ── Stats Overview ── */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
				<OverviewStatCard
					label="Total Students"
					value={stats.totalStudents}
					icon={Users}
					color="text-blue-600"
					bg="bg-blue-50"
				/>
				<OverviewStatCard
					label="Faculty Members"
					value={stats.totalFaculty}
					icon={GraduationCap}
					color="text-teal-600"
					bg="bg-teal-50"
				/>
				<OverviewStatCard
					label="Total Entries"
					value={stats.totalEntries}
					icon={BookOpen}
					color="text-purple-600"
					bg="bg-purple-50"
				/>
				<OverviewStatCard
					label="Signed Off"
					value={stats.totalSigned}
					icon={CheckCircle2}
					color="text-emerald-600"
					bg="bg-emerald-50"
				/>
				<OverviewStatCard
					label="Avg / Student"
					value={stats.avgEntriesPerStudent}
					icon={TrendingUp}
					color="text-amber-600"
					bg="bg-amber-50"
					className="col-span-2 sm:col-span-1"
				/>
			</div>

			{/* ── Filters & Controls ── */}
			<Card className="border-0 shadow-sm">
				<CardContent className="p-3 sm:p-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search by name or email..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 h-10"
								/>
							</div>
							<div className="flex gap-2">
								{batches.length > 0 && (
									<Select value={batchFilter} onValueChange={setBatchFilter}>
										<SelectTrigger className="w-full sm:w-36 h-10">
											<SelectValue placeholder="Batch" />
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
								)}
								<Select
									value={semesterFilter}
									onValueChange={setSemesterFilter}
								>
									<SelectTrigger className="w-full sm:w-36 h-10">
										<SelectValue placeholder="Semester" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Semesters</SelectItem>
										{[1, 2, 3, 4, 5, 6].map((s) => (
											<SelectItem key={s} value={s.toString()}>
												Semester {s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<p className="text-xs sm:text-sm text-muted-foreground">
								Showing{" "}
								<span className="font-semibold text-foreground">
									{filtered.length}
								</span>{" "}
								of {students.length} students
							</p>
							<div className="flex items-center gap-2">
								<Select
									value={sortBy}
									onValueChange={(v) =>
										setSortBy(v as "name" | "entries" | "semester")
									}
								>
									<SelectTrigger className="w-28 h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="name">By Name</SelectItem>
										<SelectItem value="entries">By Entries</SelectItem>
										<SelectItem value="semester">By Semester</SelectItem>
									</SelectContent>
								</Select>
								<div className="hidden sm:flex border rounded-md">
									<Button
										variant={viewMode === "cards" ? "default" : "ghost"}
										size="sm"
										className="h-8 px-2 rounded-r-none"
										onClick={() => setViewMode("cards")}
									>
										<LayoutGrid className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant={viewMode === "table" ? "default" : "ghost"}
										size="sm"
										className="h-8 px-2 rounded-l-none"
										onClick={() => setViewMode("table")}
									>
										<List className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Student List ── */}
			{viewMode === "cards" ?
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
					{filtered.map((student) => (
						<StudentCard
							key={student.id}
							student={student}
							isExpanded={expandedId === student.id}
							onToggle={() =>
								setExpandedId(expandedId === student.id ? null : student.id)
							}
						/>
					))}
				</div>
			:	<StudentTable students={filtered} />}

			{filtered.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="font-medium">No students match your filters</p>
					<p className="text-xs mt-1">
						Try adjusting your search or filter criteria
					</p>
				</div>
			)}
		</div>
	);
}

/* ═══════════════════════ SUB-COMPONENTS ═══════════════════════ */

function OverviewStatCard({
	label,
	value,
	icon: Icon,
	color,
	bg,
	className,
}: {
	label: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	bg: string;
	className?: string;
}) {
	return (
		<Card className={`border-0 shadow-sm ${className ?? ""}`}>
			<CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
				<div
					className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}
				>
					<Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
				</div>
				<div className="min-w-0">
					<p className="text-lg sm:text-xl font-bold leading-none">{value}</p>
					<p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
						{label}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function StudentCard({
	student,
	isExpanded,
	onToggle,
}: {
	student: StudentData;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const signedPct =
		student.totalLogs > 0 ?
			Math.round((student.totalSigned / student.totalLogs) * 100)
		:	0;
	const initials =
		`${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

	return (
		<Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
			<CardContent className="p-0">
				{/* Header */}
				<div className="p-4 pb-3">
					<div className="flex items-start gap-3">
						{/* Avatar */}
						<div className="h-11 w-11 rounded-full bg-linear-to-br from-hospital-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
							{student.profileImage ?
								<Image
									src={student.profileImage}
									alt={initials}
									width={44}
									height={44}
									unoptimized
									className="h-11 w-11 rounded-full object-cover"
								/>
							:	initials}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-sm truncate">
									{student.firstName} {student.lastName}
								</h3>
								{student.status !== "ACTIVE" && (
									<Badge variant="destructive" className="text-[9px] h-4">
										{student.status}
									</Badge>
								)}
							</div>
							<p className="text-xs text-muted-foreground truncate">
								{student.email}
							</p>
							<div className="flex items-center gap-2 mt-1">
								{student.batch && (
									<Badge
										variant="outline"
										className="text-[10px] h-5 font-normal"
									>
										{student.batch}
									</Badge>
								)}
								<Badge
									variant="secondary"
									className="text-[10px] h-5 font-medium"
								>
									Sem {student.currentSemester ?? "—"}
								</Badge>
							</div>
						</div>
					</div>

					{/* Module counts mini-bar */}
					<div className="grid grid-cols-6 gap-1 mt-3">
						{(
							Object.keys(MODULE_ICONS) as Array<keyof typeof MODULE_ICONS>
						).map((key) => {
							const Icon = MODULE_ICONS[key];
							const colors = MODULE_COLORS[key];
							const count = student.logCounts[key];
							return (
								<div key={key} className="flex flex-col items-center gap-0.5">
									<div
										className={`h-7 w-7 rounded-md ${colors.bg} flex items-center justify-center`}
									>
										<Icon className={`h-3 w-3 ${colors.text}`} />
									</div>
									<span className="text-[10px] font-semibold">{count}</span>
									<span className="text-[8px] text-muted-foreground leading-none">
										{MODULE_LABELS[key]}
									</span>
								</div>
							);
						})}
					</div>

					{/* Progress bar */}
					<div className="mt-3">
						<div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
							<span>
								<span className="font-semibold text-foreground">
									{student.totalLogs}
								</span>{" "}
								entries
							</span>
							<span>
								{student.totalSigned} signed ({signedPct}%)
							</span>
						</div>
						<Progress value={signedPct} className="h-1.5" />
					</div>
				</div>

				{/* Faculty & expand */}
				<div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-between">
					<div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
						{student.assignedFaculty.length > 0 ?
							<span>
								Faculty:{" "}
								{student.assignedFaculty.map((f) => f.facultyName).join(", ")}
							</span>
						:	<span className="italic">No faculty assigned</span>}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 shrink-0 text-xs"
						onClick={onToggle}
					>
						{isExpanded ?
							<>
								Less <ChevronUp className="h-3 w-3 ml-1" />
							</>
						:	<>
								More <ChevronDown className="h-3 w-3 ml-1" />
							</>
						}
					</Button>
				</div>

				{/* Expanded detail */}
				{isExpanded && (
					<div className="border-t bg-muted/10 px-4 py-3 space-y-3">
						{/* Detail grid */}
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div>
								<span className="text-muted-foreground">Joined</span>
								<p className="font-medium">
									{new Date(student.joinedAt).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</p>
							</div>
							<div>
								<span className="text-muted-foreground">Evaluations</span>
								<p className="font-medium">{student.logCounts.evaluations}</p>
							</div>
							{student.thesisTopic && (
								<div className="col-span-2">
									<span className="text-muted-foreground">Thesis</span>
									<p className="font-medium line-clamp-2">
										{student.thesisTopic}
									</p>
									{student.thesisStatus && (
										<Badge variant="outline" className="mt-0.5 text-[9px] h-4">
											{student.thesisStatus}
										</Badge>
									)}
								</div>
							)}
						</div>

						{/* Faculty assignments per semester */}
						{student.assignedFaculty.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
									Faculty Assignments
								</p>
								<div className="flex flex-wrap gap-1">
									{student.assignedFaculty.map((f, i) => (
										<Badge
											key={i}
											variant="secondary"
											className="text-[10px] font-normal"
										>
											{f.facultyName} (Sem {f.semester})
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Quick actions */}
						<div className="flex flex-wrap gap-2 pt-1">
							<Link
								href={`/dashboard/hod/case-management/student/${student.id}`}
							>
								<Button variant="outline" size="sm" className="h-7 text-xs">
									<Eye className="h-3 w-3 mr-1" />
									Cases
								</Button>
							</Link>
							<Link href={`/dashboard/hod/procedures/student/${student.id}`}>
								<Button variant="outline" size="sm" className="h-7 text-xs">
									<Syringe className="h-3 w-3 mr-1" />
									Procedures
								</Button>
							</Link>
							<Link
								href={`/dashboard/hod/evaluation-graph/student/${student.id}`}
							>
								<Button variant="outline" size="sm" className="h-7 text-xs">
									<TrendingUp className="h-3 w-3 mr-1" />
									Evaluation
								</Button>
							</Link>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function StudentTable({ students }: { students: StudentData[] }) {
	return (
		<Card className="border-0 shadow-sm overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="text-left py-3 px-4 font-medium">Student</th>
							<th className="text-left py-3 px-3 font-medium hidden sm:table-cell">
								Batch
							</th>
							<th className="text-center py-3 px-3 font-medium">Sem</th>
							<th className="text-center py-3 px-3 font-medium">Cases</th>
							<th className="text-center py-3 px-3 font-medium hidden md:table-cell">
								Procs
							</th>
							<th className="text-center py-3 px-3 font-medium hidden md:table-cell">
								Diag
							</th>
							<th className="text-center py-3 px-3 font-medium hidden lg:table-cell">
								Clinical
							</th>
							<th className="text-center py-3 px-3 font-medium">Total</th>
							<th className="text-center py-3 px-3 font-medium hidden md:table-cell">
								Signed
							</th>
							<th className="text-left py-3 px-3 font-medium hidden xl:table-cell">
								Faculty
							</th>
							<th className="text-center py-3 px-3 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{students.map((student) => {
							const signedPct =
								student.totalLogs > 0 ?
									Math.round((student.totalSigned / student.totalLogs) * 100)
								:	0;
							return (
								<tr
									key={student.id}
									className="border-b hover:bg-muted/30 transition-colors"
								>
									<td className="py-3 px-4">
										<div className="flex items-center gap-2.5">
											<div className="h-8 w-8 rounded-full bg-linear-to-br from-hospital-primary to-blue-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
												{student.firstName.charAt(0)}
												{student.lastName.charAt(0)}
											</div>
											<div className="min-w-0">
												<p className="font-medium text-sm truncate">
													{student.firstName} {student.lastName}
												</p>
												<p className="text-[10px] text-muted-foreground truncate">
													{student.email}
												</p>
											</div>
										</div>
									</td>
									<td className="py-3 px-3 text-muted-foreground text-xs hidden sm:table-cell">
										{student.batch ?? "—"}
									</td>
									<td className="py-3 px-3 text-center">
										<Badge variant="outline" className="text-[10px]">
											{student.currentSemester ?? "—"}
										</Badge>
									</td>
									<td className="py-3 px-3 text-center font-medium">
										{student.logCounts.caseManagement}
									</td>
									<td className="py-3 px-3 text-center hidden md:table-cell">
										{student.logCounts.procedures}
									</td>
									<td className="py-3 px-3 text-center hidden md:table-cell">
										{student.logCounts.diagnostics}
									</td>
									<td className="py-3 px-3 text-center hidden lg:table-cell">
										{student.logCounts.clinicalSkills}
									</td>
									<td className="py-3 px-3 text-center">
										<Badge className="bg-hospital-primary text-white text-[10px]">
											{student.totalLogs}
										</Badge>
									</td>
									<td className="py-3 px-3 text-center hidden md:table-cell">
										<div className="flex items-center justify-center gap-1.5">
											<Progress value={signedPct} className="h-1.5 w-12" />
											<span className="text-[10px] text-muted-foreground w-7">
												{signedPct}%
											</span>
										</div>
									</td>
									<td className="py-3 px-3 hidden xl:table-cell">
										{student.assignedFaculty.length > 0 ?
											<span className="text-xs text-muted-foreground">
												{student.assignedFaculty
													.map((f) => f.facultyName)
													.join(", ")}
											</span>
										:	<span className="text-[10px] text-muted-foreground italic">
												—
											</span>
										}
									</td>
									<td className="py-3 px-3 text-center">
										<Link
											href={`/dashboard/hod/case-management/student/${student.id}`}
										>
											<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
												<ArrowRight className="h-3.5 w-3.5" />
											</Button>
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
