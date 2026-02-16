/**
 * @module HodDashboardClient
 * @description Rich HOD department overview dashboard with
 * department stats, student roster, faculty workload, and activity feed.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
	Users,
	GraduationCap,
	BookOpen,
	Clock,
	CheckCircle2,
	ArrowRight,
	BarChart3,
	TrendingUp,
	FileCheck,
	AlertCircle,
	type LucideIcon,
} from "lucide-react";
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

/* ─── types ─── */

interface FacultyLoad {
	id: string;
	name: string;
	assignedStudents: number;
	pendingReviews: number;
	signedThisMonth: number;
}

interface StudentRow {
	id: string;
	name: string;
	batch: string | null;
	semester: number;
	entries: number;
	signed: number;
}

interface EntryRow {
	id: string;
	studentName: string;
	module: string;
	title: string;
	status: string;
	date: string;
}

interface ModuleStat {
	module: string;
	count: number;
}

export interface HodDashboardData {
	hodName: string;
	totalStudents: number;
	totalFaculty: number;
	totalEntries: number;
	totalSigned: number;
	totalPending: number;
	totalNeedsRevision: number;
	signedThisMonth: number;
	entryGrowthPct: number;
	faculty: FacultyLoad[];
	topStudents: StudentRow[];
	moduleDistribution: ModuleStat[];
	recentActivity: EntryRow[];
}

const PIE_COLORS = [
	"#0066cc",
	"#00897b",
	"#f59e0b",
	"#d32f2f",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
];

export function HodDashboardClient({ data }: { data: HodDashboardData }) {
	const completionPct =
		data.totalEntries > 0 ?
			Math.round((data.totalSigned / data.totalEntries) * 100)
		:	0;

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* ── Welcome Banner ── */}
			<div className="relative overflow-hidden rounded-xl bg-linear-to-br from-hospital-primary via-blue-700 to-blue-800 p-4 sm:p-6 text-white">
				<div className="relative z-10">
					<p className="text-blue-200 text-xs sm:text-sm font-medium">
						Welcome,
					</p>
					<h2 className="text-xl sm:text-2xl font-bold mt-0.5">
						{data.hodName}
					</h2>
					<p className="text-blue-200 text-sm mt-1">
						Head of Department · Emergency Medicine
					</p>
					<div className="flex items-center gap-4 mt-4 flex-wrap">
						<StatPill
							icon={GraduationCap}
							value={data.totalStudents}
							label="students"
						/>
						<Separator
							orientation="vertical"
							className="h-4 bg-blue-400/40 hidden sm:block"
						/>
						<StatPill icon={Users} value={data.totalFaculty} label="faculty" />
						<Separator
							orientation="vertical"
							className="h-4 bg-blue-400/40 hidden sm:block"
						/>
						<StatPill
							icon={BookOpen}
							value={data.totalEntries}
							label="total entries"
						/>
					</div>
				</div>
				<div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
				<div className="absolute -right-2 bottom-0 h-20 w-20 rounded-full bg-white/5" />
			</div>

			{/* ── Quick Stats ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
				<QuickCard
					label="Total Entries"
					value={data.totalEntries}
					icon={BookOpen}
					color="text-blue-600"
					bg="bg-blue-50"
					subText={
						data.entryGrowthPct > 0 ?
							`+${data.entryGrowthPct}% this month`
						:	undefined
					}
				/>
				<QuickCard
					label="Signed Off"
					value={data.totalSigned}
					icon={CheckCircle2}
					color="text-emerald-600"
					bg="bg-emerald-50"
					subText={`${completionPct}% completion`}
				/>
				<QuickCard
					label="Pending Review"
					value={data.totalPending}
					icon={Clock}
					color="text-amber-600"
					bg="bg-amber-50"
					alert={data.totalPending > 10}
				/>
				<QuickCard
					label="Needs Revision"
					value={data.totalNeedsRevision}
					icon={AlertCircle}
					color="text-orange-600"
					bg="bg-orange-50"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
				{/* ── Faculty Workload ── */}
				<Card className="lg:col-span-2 border-0 shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Users className="h-4 w-4 text-hospital-primary" />
								Faculty Workload
							</CardTitle>
							<Link
								href="/dashboard/hod/manage-users"
								className="text-xs text-hospital-primary hover:underline"
							>
								Manage
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{data.faculty.length > 0 ?
							<div className="space-y-2">
								{data.faculty.map((f) => (
									<div
										key={f.id}
										className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="h-9 w-9 rounded-full bg-linear-to-br from-hospital-primary to-blue-300 flex items-center justify-center text-white text-xs font-bold shrink-0">
												{f.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">{f.name}</p>
												<p className="text-xs text-muted-foreground">
													{f.assignedStudents} students · {f.signedThisMonth}{" "}
													signed this mo.
												</p>
											</div>
										</div>
										{f.pendingReviews > 0 ?
											<Badge
												variant="outline"
												className="bg-amber-50 text-amber-700 text-[10px]"
											>
												{f.pendingReviews} pending
											</Badge>
										:	<Badge
												variant="outline"
												className="bg-emerald-50 text-emerald-700 text-[10px]"
											>
												Up to date
											</Badge>
										}
									</div>
								))}
							</div>
						:	<EmptyState
								icon={Users}
								message="No faculty members"
								sub="Add faculty from user management."
							/>
						}
					</CardContent>
				</Card>

				{/* ── Module Distribution ── */}
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<BarChart3 className="h-4 w-4 text-hospital-primary" />
							Entries by Module
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4">
						{data.moduleDistribution.some((m) => m.count > 0) ?
							<ResponsiveContainer width="100%" height={220}>
								<PieChart>
									<Pie
										data={data.moduleDistribution.filter((m) => m.count > 0)}
										dataKey="count"
										nameKey="module"
										innerRadius={50}
										outerRadius={80}
										paddingAngle={3}
										label={(props) => {
											const d = props as unknown as {
												module: string;
												count: number;
											};
											return d.count > 0 ? `${d.module}` : "";
										}}
									>
										{data.moduleDistribution
											.filter((m) => m.count > 0)
											.map((_, i) => (
												<Cell
													key={i}
													fill={PIE_COLORS[i % PIE_COLORS.length]}
												/>
											))}
									</Pie>
									<Tooltip
										contentStyle={{
											fontSize: 12,
											borderRadius: 8,
											border: "1px solid #e5e7eb",
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						:	<div className="h-55 flex items-center justify-center text-sm text-muted-foreground">
								No entries yet
							</div>
						}
					</CardContent>
				</Card>
			</div>

			{/* ── Top Students ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-emerald-500" />
							Students — Leaderboard
						</CardTitle>
						<Link
							href="/dashboard/hod/analytics"
							className="text-xs text-hospital-primary hover:underline flex items-center gap-1"
						>
							Full Analytics <ArrowRight className="h-3 w-3" />
						</Link>
					</div>
				</CardHeader>
				<CardContent>
					{data.topStudents.length > 0 ?
						<div className="overflow-x-auto -mx-4 sm:mx-0">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-muted-foreground text-xs border-b">
										<th className="pb-2 pl-4 sm:pl-0">#</th>
										<th className="pb-2">Student</th>
										<th className="pb-2 hidden sm:table-cell">Batch</th>
										<th className="pb-2 text-right">Entries</th>
										<th className="pb-2 text-right">Signed</th>
										<th className="pb-2 text-right pr-4 sm:pr-0">Progress</th>
									</tr>
								</thead>
								<tbody>
									{data.topStudents.map((s, idx) => {
										const pct =
											s.entries > 0 ?
												Math.round((s.signed / s.entries) * 100)
											:	0;
										return (
											<tr key={s.id} className="border-b last:border-0">
												<td className="py-2.5 pl-4 sm:pl-0 font-medium text-muted-foreground">
													{idx + 1}
												</td>
												<td className="py-2.5">
													<div className="flex items-center gap-2">
														<div className="h-7 w-7 rounded-full bg-linear-to-br from-hospital-primary to-blue-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
															{s.name
																.split(" ")
																.map((n) => n[0])
																.join("")}
														</div>
														<div>
															<p className="font-medium text-sm">{s.name}</p>
															<p className="text-[10px] text-muted-foreground sm:hidden">
																{s.batch ?? "—"} · Sem {s.semester}
															</p>
														</div>
													</div>
												</td>
												<td className="py-2.5 text-muted-foreground hidden sm:table-cell">
													{s.batch ?? "—"} · Sem {s.semester}
												</td>
												<td className="py-2.5 text-right font-medium">
													{s.entries}
												</td>
												<td className="py-2.5 text-right text-emerald-600 font-medium">
													{s.signed}
												</td>
												<td className="py-2.5 text-right pr-4 sm:pr-0">
													<div className="flex items-center justify-end gap-2">
														<Progress value={pct} className="h-1.5 w-16" />
														<span className="text-[10px] text-muted-foreground w-8 text-right">
															{pct}%
														</span>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					:	<EmptyState
							icon={GraduationCap}
							message="No students yet"
							sub="Students will appear once they are onboarded."
						/>
					}
				</CardContent>
			</Card>

			{/* ── Recent Department Activity ── */}
			{data.recentActivity.length > 0 && (
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<FileCheck className="h-4 w-4 text-hospital-primary" />
							Recent Activity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-1">
							{data.recentActivity.map((entry) => {
								const badgeCls =
									entry.status === "SIGNED" ? "bg-emerald-50 text-emerald-700"
									: entry.status === "SUBMITTED" ? "bg-amber-50 text-amber-700"
									: entry.status === "NEEDS_REVISION" ?
										"bg-orange-50 text-orange-700"
									:	"bg-gray-100 text-gray-700";
								return (
									<div
										key={entry.id}
										className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
												<span className="text-xs font-semibold text-blue-700">
													{entry.studentName
														.split(" ")
														.map((n) => n[0])
														.join("")}
												</span>
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{entry.title}
												</p>
												<p className="text-xs text-muted-foreground">
													{entry.studentName} · {entry.module} · {entry.date}
												</p>
											</div>
										</div>
										<Badge
											variant="outline"
											className={`shrink-0 text-[10px] ${badgeCls}`}
										>
											{entry.status.replace("_", " ")}
										</Badge>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

/* ─── Sub-components ─── */

function StatPill({
	icon: Icon,
	value,
	label,
}: {
	icon: LucideIcon;
	value: number;
	label: string;
}) {
	return (
		<div className="flex items-center gap-1.5 text-sm">
			<Icon className="h-4 w-4 text-blue-200" />
			<span className="font-semibold">{value}</span>
			<span className="text-blue-200">{label}</span>
		</div>
	);
}

function QuickCard({
	label,
	value,
	icon: Icon,
	color,
	bg,
	alert,
	subText,
}: {
	label: string;
	value: number;
	icon: LucideIcon;
	color: string;
	bg: string;
	alert?: boolean;
	subText?: string;
}) {
	return (
		<Card
			className={`border-0 shadow-sm ${alert ? "ring-1 ring-amber-200" : ""}`}
		>
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
					{subText && (
						<p className="text-[10px] text-emerald-600 mt-0.5">{subText}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function EmptyState({
	icon: Icon,
	message,
	sub,
}: {
	icon: LucideIcon;
	message: string;
	sub: string;
}) {
	return (
		<div className="text-center py-8 text-muted-foreground">
			<Icon className="h-10 w-10 mx-auto mb-2 opacity-40" />
			<p className="text-sm font-medium">{message}</p>
			<p className="text-xs mt-1">{sub}</p>
		</div>
	);
}
