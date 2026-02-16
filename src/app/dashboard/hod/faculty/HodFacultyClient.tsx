/**
 * @module HodFacultyClient
 * @description Professional HOD faculty management view with workload metrics,
 * student assignments, signature activity, and responsive design.
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
	Search,
	GraduationCap,
	Users,
	FileCheck,
	PenLine,
	TrendingUp,
	UserCircle,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	LayoutGrid,
	List,
	Clock,
} from "lucide-react";

interface FacultyStudent {
	id: string;
	name: string;
	semester: number;
	batch: string | null;
	status: string;
}

interface FacultyData {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	profileImage: string | null;
	department: string | null;
	status: string;
	joinedAt: string;
	studentCount: number;
	signatureCount: number;
	recentSignatures: number;
	totalRemarks: number;
	students: FacultyStudent[];
}

interface Stats {
	totalFaculty: number;
	totalStudents: number;
	totalSignatures: number;
	avgStudentsPerFaculty: number;
	unassignedStudents: number;
}

interface HodFacultyClientProps {
	faculty: FacultyData[];
	stats: Stats;
}

export function HodFacultyClient({ faculty, stats }: HodFacultyClientProps) {
	const [search, setSearch] = useState("");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

	const filtered = faculty.filter(
		(f) =>
			`${f.firstName} ${f.lastName}`
				.toLowerCase()
				.includes(search.toLowerCase()) ||
			f.email.toLowerCase().includes(search.toLowerCase()),
	);

	if (faculty.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-40" />
				<h3 className="text-lg font-medium mb-2">No Faculty Found</h3>
				<p className="text-sm">
					No faculty members registered yet. Use{" "}
					<Link
						href="/dashboard/hod/manage-users"
						className="text-hospital-primary underline"
					>
						Manage Users
					</Link>{" "}
					to assign the Faculty role.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* ── Stats Overview ── */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
				<OverviewStatCard
					label="Total Faculty"
					value={stats.totalFaculty}
					icon={GraduationCap}
					color="text-blue-600"
					bg="bg-blue-50"
				/>
				<OverviewStatCard
					label="Total Students"
					value={stats.totalStudents}
					icon={Users}
					color="text-teal-600"
					bg="bg-teal-50"
				/>
				<OverviewStatCard
					label="Total Signatures"
					value={stats.totalSignatures}
					icon={FileCheck}
					color="text-emerald-600"
					bg="bg-emerald-50"
				/>
				<OverviewStatCard
					label="Avg Students/Faculty"
					value={stats.avgStudentsPerFaculty}
					icon={TrendingUp}
					color="text-purple-600"
					bg="bg-purple-50"
				/>
				<OverviewStatCard
					label="Unassigned Students"
					value={stats.unassignedStudents}
					icon={AlertTriangle}
					color={
						stats.unassignedStudents > 0 ? "text-amber-600" : "text-emerald-600"
					}
					bg={stats.unassignedStudents > 0 ? "bg-amber-50" : "bg-emerald-50"}
					className="col-span-2 sm:col-span-1"
				/>
			</div>

			{/* ── Filters & Controls ── */}
			<Card className="border-0 shadow-sm">
				<CardContent className="p-3 sm:p-4">
					<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
						<div className="relative flex-1 w-full sm:max-w-sm">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name or email..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-10"
							/>
						</div>
						<div className="flex items-center gap-2">
							<p className="text-xs sm:text-sm text-muted-foreground">
								<span className="font-semibold text-foreground">
									{filtered.length}
								</span>{" "}
								of {faculty.length}
							</p>
							<div className="hidden sm:flex border rounded-md ml-2">
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
				</CardContent>
			</Card>

			{/* ── Faculty List ── */}
			{viewMode === "cards" ?
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
					{filtered.map((member) => (
						<FacultyCard
							key={member.id}
							member={member}
							isExpanded={expandedId === member.id}
							onToggle={() =>
								setExpandedId(expandedId === member.id ? null : member.id)
							}
						/>
					))}
				</div>
			:	<FacultyTable faculty={filtered} />}

			{filtered.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="font-medium">No faculty match your search</p>
					<p className="text-xs mt-1">Try adjusting your search criteria</p>
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

function FacultyCard({
	member,
	isExpanded,
	onToggle,
}: {
	member: FacultyData;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const initials =
		`${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();

	return (
		<Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
			<CardContent className="p-0">
				{/* Header */}
				<div className="p-4 pb-3">
					<div className="flex items-start gap-3">
						<div className="h-12 w-12 rounded-full bg-linear-to-br from-teal-500 to-emerald-400 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
							{member.profileImage ?
								<Image
									src={member.profileImage}
									alt={initials}
									width={48}
									height={48}
									className="h-12 w-12 rounded-full object-cover"
									unoptimized
								/>
							:	initials}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-sm truncate">
									{member.firstName} {member.lastName}
								</h3>
								{member.status !== "ACTIVE" && (
									<Badge variant="destructive" className="text-[9px] h-4">
										{member.status}
									</Badge>
								)}
							</div>
							<p className="text-xs text-muted-foreground truncate">
								{member.email}
							</p>
							{member.department && (
								<Badge
									variant="outline"
									className="text-[10px] h-5 font-normal mt-1"
								>
									{member.department}
								</Badge>
							)}
						</div>
					</div>

					{/* Metrics */}
					<div className="grid grid-cols-4 gap-2 mt-4">
						<MetricPill
							icon={Users}
							value={member.studentCount}
							label="Students"
							color="text-blue-600"
							bg="bg-blue-50"
						/>
						<MetricPill
							icon={FileCheck}
							value={member.signatureCount}
							label="Signed"
							color="text-emerald-600"
							bg="bg-emerald-50"
						/>
						<MetricPill
							icon={Clock}
							value={member.recentSignatures}
							label="30d"
							color="text-purple-600"
							bg="bg-purple-50"
						/>
						<MetricPill
							icon={PenLine}
							value={member.totalRemarks}
							label="Remarks"
							color="text-amber-600"
							bg="bg-amber-50"
						/>
					</div>
				</div>

				{/* Student list preview & expand */}
				<div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-between">
					<div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
						{member.students.length > 0 ?
							<span>
								{member.students
									.slice(0, 2)
									.map((s) => s.name)
									.join(", ")}
								{member.students.length > 2 &&
									` +${member.students.length - 2} more`}
							</span>
						:	<span className="italic">No students assigned</span>}
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
								Details <ChevronDown className="h-3 w-3 ml-1" />
							</>
						}
					</Button>
				</div>

				{/* Expanded detail */}
				{isExpanded && (
					<div className="border-t bg-muted/10 px-4 py-3 space-y-3">
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div>
								<span className="text-muted-foreground">Joined</span>
								<p className="font-medium">
									{new Date(member.joinedAt).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</p>
							</div>
							<div>
								<span className="text-muted-foreground">Workload</span>
								<div className="flex items-center gap-1.5 mt-0.5">
									<Progress
										value={Math.min((member.studentCount / 10) * 100, 100)}
										className="h-1.5 flex-1"
									/>
									<span className="text-[10px] text-muted-foreground">
										{member.studentCount}/10
									</span>
								</div>
							</div>
						</div>

						{/* All assigned students */}
						{member.students.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
									Assigned Students
								</p>
								<div className="space-y-1">
									{member.students.map((s) => (
										<div
											key={s.id}
											className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5"
										>
											<div className="flex items-center gap-2 min-w-0">
												<UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
												<span className="text-xs font-medium truncate">
													{s.name}
												</span>
											</div>
											<div className="flex items-center gap-1.5 shrink-0">
												{s.batch && (
													<Badge
														variant="outline"
														className="text-[9px] h-4 font-normal"
													>
														{s.batch}
													</Badge>
												)}
												<Badge variant="secondary" className="text-[9px] h-4">
													Sem {s.semester}
												</Badge>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Quick actions */}
						<div className="flex flex-wrap gap-2 pt-1">
							<Link href="/dashboard/hod/manage-users">
								<Button variant="outline" size="sm" className="h-7 text-xs">
									<Users className="h-3 w-3 mr-1" />
									Manage Assignments
								</Button>
							</Link>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function MetricPill({
	icon: Icon,
	value,
	label,
	color,
	bg,
}: {
	icon: React.ComponentType<{ className?: string }>;
	value: number;
	label: string;
	color: string;
	bg: string;
}) {
	return (
		<div className="flex flex-col items-center gap-0.5">
			<div
				className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}
			>
				<Icon className={`h-3.5 w-3.5 ${color}`} />
			</div>
			<span className="text-xs font-bold">{value}</span>
			<span className="text-[8px] text-muted-foreground leading-none">
				{label}
			</span>
		</div>
	);
}

function FacultyTable({ faculty }: { faculty: FacultyData[] }) {
	return (
		<Card className="border-0 shadow-sm overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="text-left py-3 px-4 font-medium">Faculty</th>
							<th className="text-center py-3 px-3 font-medium">Students</th>
							<th className="text-center py-3 px-3 font-medium">Signed</th>
							<th className="text-center py-3 px-3 font-medium hidden md:table-cell">
								30d Activity
							</th>
							<th className="text-center py-3 px-3 font-medium hidden md:table-cell">
								Remarks
							</th>
							<th className="text-left py-3 px-3 font-medium hidden lg:table-cell">
								Assigned Students
							</th>
						</tr>
					</thead>
					<tbody>
						{faculty.map((member) => (
							<tr
								key={member.id}
								className="border-b hover:bg-muted/30 transition-colors"
							>
								<td className="py-3 px-4">
									<div className="flex items-center gap-2.5">
										<div className="h-8 w-8 rounded-full bg-linear-to-br from-teal-500 to-emerald-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
											{member.firstName.charAt(0)}
											{member.lastName.charAt(0)}
										</div>
										<div className="min-w-0">
											<p className="font-medium text-sm truncate">
												{member.firstName} {member.lastName}
											</p>
											<p className="text-[10px] text-muted-foreground truncate">
												{member.email}
											</p>
										</div>
									</div>
								</td>
								<td className="py-3 px-3 text-center">
									<Badge
										variant={member.studentCount > 0 ? "default" : "outline"}
										className={
											member.studentCount > 0 ?
												"bg-blue-600 text-white text-[10px]"
											:	"text-[10px]"
										}
									>
										{member.studentCount}
									</Badge>
								</td>
								<td className="py-3 px-3 text-center">
									<Badge className="bg-emerald-600 text-white text-[10px]">
										{member.signatureCount}
									</Badge>
								</td>
								<td className="py-3 px-3 text-center hidden md:table-cell">
									<span className="text-xs font-medium">
										{member.recentSignatures}
									</span>
								</td>
								<td className="py-3 px-3 text-center hidden md:table-cell">
									<span className="text-xs">{member.totalRemarks}</span>
								</td>
								<td className="py-3 px-3 hidden lg:table-cell">
									{member.students.length > 0 ?
										<div className="flex flex-wrap gap-1">
											{member.students.slice(0, 3).map((s) => (
												<Badge
													key={s.id}
													variant="secondary"
													className="text-[10px] font-normal"
												>
													{s.name}
												</Badge>
											))}
											{member.students.length > 3 && (
												<Badge variant="outline" className="text-[10px]">
													+{member.students.length - 3}
												</Badge>
											)}
										</div>
									:	<span className="text-[10px] text-muted-foreground italic">
											None
										</span>
									}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
