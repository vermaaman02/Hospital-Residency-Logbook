/**
 * @module HodAnalyticsClient
 * @description Full HOD department analytics dashboard with 7 sections:
 * Overview KPIs, Rotations, Attendance, Case Management, Clinical Skills,
 * Academics, and Faculty Insights. Uses Recharts + shadcn/ui.
 *
 * @see src/actions/hod-analytics.ts — data provider
 * @see prisma/schema.prisma — all models
 */

"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
	Users,
	UserCheck,
	FileText,
	Clock,
	CheckCircle2,
	TrendingUp,
	TrendingDown,
	Minus,
	Activity,
	Stethoscope,
	GraduationCap,
	AlertTriangle,
	BarChart3,
	Layers,
	Brain,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	AreaChart,
	Area,
	LineChart,
	Line,
} from "recharts";
import { cn } from "@/lib/utils";
import type { HodAnalyticsBundle, DeltaStat } from "@/actions/hod-analytics";

// ======================== COLORS ========================

const COLORS = [
	"#0066CC",
	"#00897B",
	"#D32F2F",
	"#F59E0B",
	"#10B981",
	"#6366F1",
	"#EC4899",
	"#8B5CF6",
	"#14B8A6",
	"#F97316",
	"#06B6D4",
	"#84CC16",
];

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "#9CA3AF",
	SUBMITTED: "#F59E0B",
	SIGNED: "#10B981",
	REJECTED: "#EF4444",
	NEEDS_REVISION: "#F97316",
};

// ======================== MAIN COMPONENT ========================

interface HodAnalyticsClientProps {
	data: HodAnalyticsBundle;
}

export function HodAnalyticsClient({ data }: HodAnalyticsClientProps) {
	const {
		overview,
		rotations,
		attendance,
		caseManagement,
		clinicalSkills,
		academics,
		facultyInsights,
	} = data;

	return (
		<div className="space-y-6">
			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
					<TabsTrigger value="overview" className="text-xs sm:text-sm">
						<BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Overview
					</TabsTrigger>
					<TabsTrigger value="rotations" className="text-xs sm:text-sm">
						<Layers className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Rotations
					</TabsTrigger>
					<TabsTrigger value="attendance" className="text-xs sm:text-sm">
						<Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Attendance
					</TabsTrigger>
					<TabsTrigger value="cases" className="text-xs sm:text-sm">
						<Stethoscope className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Cases
					</TabsTrigger>
					<TabsTrigger value="skills" className="text-xs sm:text-sm">
						<Brain className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Skills
					</TabsTrigger>
					<TabsTrigger value="academics" className="text-xs sm:text-sm">
						<GraduationCap className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Academics
					</TabsTrigger>
					<TabsTrigger value="faculty" className="text-xs sm:text-sm">
						<UserCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
						Faculty
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6 mt-4">
					<OverviewSection overview={overview} />
				</TabsContent>

				<TabsContent value="rotations" className="space-y-6 mt-4">
					<RotationsSection rotations={rotations} />
				</TabsContent>

				<TabsContent value="attendance" className="space-y-6 mt-4">
					<AttendanceSection attendance={attendance} />
				</TabsContent>

				<TabsContent value="cases" className="space-y-6 mt-4">
					<CaseManagementSection caseManagement={caseManagement} />
				</TabsContent>

				<TabsContent value="skills" className="space-y-6 mt-4">
					<ClinicalSkillsSection clinicalSkills={clinicalSkills} />
				</TabsContent>

				<TabsContent value="academics" className="space-y-6 mt-4">
					<AcademicsSection academics={academics} />
				</TabsContent>

				<TabsContent value="faculty" className="space-y-6 mt-4">
					<FacultySection facultyInsights={facultyInsights} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ======================== 1. OVERVIEW ========================

function DeltaIndicator({ delta }: { delta: number }) {
	if (delta > 0) {
		return (
			<span className="flex items-center text-xs text-green-600 font-medium">
				<TrendingUp className="h-3 w-3 mr-0.5" />+{delta}
			</span>
		);
	}
	if (delta < 0) {
		return (
			<span className="flex items-center text-xs text-red-600 font-medium">
				<TrendingDown className="h-3 w-3 mr-0.5" />
				{delta}
			</span>
		);
	}
	return (
		<span className="flex items-center text-xs text-gray-400 font-medium">
			<Minus className="h-3 w-3 mr-0.5" />0
		</span>
	);
}

function KpiCard({
	title,
	stat,
	icon: Icon,
	color,
}: {
	title: string;
	stat: DeltaStat;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<Card className="relative overflow-hidden">
			<CardContent className="pt-5 pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{title}
						</p>
						<p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
						<DeltaIndicator delta={stat.delta} />
					</div>
					<div className={cn("p-2.5 rounded-xl", color)}>
						<Icon className="h-5 w-5 text-white" />
					</div>
				</div>
			</CardContent>
			<div className={cn("h-1 w-full absolute bottom-0", color)} />
		</Card>
	);
}

function SimpleKpiCard({
	title,
	value,
	icon: Icon,
	color,
	suffix,
}: {
	title: string;
	value: number | string;
	icon: React.ElementType;
	color: string;
	suffix?: string;
}) {
	return (
		<Card className="relative overflow-hidden">
			<CardContent className="pt-5 pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{title}
						</p>
						<p className="text-2xl font-bold">
							{typeof value === "number" ? value.toLocaleString() : value}
							{suffix && (
								<span className="text-base font-normal text-muted-foreground ml-0.5">
									{suffix}
								</span>
							)}
						</p>
					</div>
					<div className={cn("p-2.5 rounded-xl", color)}>
						<Icon className="h-5 w-5 text-white" />
					</div>
				</div>
			</CardContent>
			<div className={cn("h-1 w-full absolute bottom-0", color)} />
		</Card>
	);
}

function OverviewSection({
	overview,
}: {
	overview: HodAnalyticsBundle["overview"];
}) {
	return (
		<>
			{/* KPI Row */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				<KpiCard
					title="Residents"
					stat={overview.totalResidents}
					icon={Users}
					color="bg-blue-600"
				/>
				<SimpleKpiCard
					title="Faculty"
					value={overview.totalFaculty}
					icon={UserCheck}
					color="bg-indigo-600"
				/>
				<KpiCard
					title="Total Entries"
					stat={overview.totalLogEntries}
					icon={FileText}
					color="bg-teal-600"
				/>
				<KpiCard
					title="Pending"
					stat={overview.pendingApprovals}
					icon={Clock}
					color="bg-amber-500"
				/>
				<KpiCard
					title="Signed"
					stat={overview.signedEntries}
					icon={CheckCircle2}
					color="bg-green-600"
				/>
				<SimpleKpiCard
					title="Completion"
					value={overview.completionPct}
					suffix="%"
					icon={Activity}
					color="bg-purple-600"
				/>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Monthly Trend */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Monthly Entry Trend</CardTitle>
						<CardDescription>
							Log entries created over the last 12 months
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={overview.monthlyTrend}>
									<defs>
										<linearGradient
											id="colorEntries"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="month" tick={{ fontSize: 11 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<Tooltip />
									<Area
										type="monotone"
										dataKey="entries"
										stroke="#0066CC"
										strokeWidth={2}
										fill="url(#colorEntries)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Status Distribution Donut */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Status Distribution</CardTitle>
						<CardDescription>Across all clinical entries</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={overview.statusDistribution}
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={100}
										dataKey="count"
										nameKey="status"
										label={(props) => {
											const d = props as unknown as {
												status: string;
												percent: number;
											};
											return `${d.status} ${(d.percent * 100).toFixed(0)}%`;
										}}
										labelLine={false}
									>
										{overview.statusDistribution.map((entry) => (
											<Cell
												key={entry.status}
												fill={STATUS_COLORS[entry.status] ?? "#9CA3AF"}
											/>
										))}
									</Pie>
									<Tooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
}

// ======================== 2. ROTATIONS ========================

function RotationsSection({
	rotations,
}: {
	rotations: HodAnalyticsBundle["rotations"];
}) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Residents per Rotation (horizontal bar) */}
			<Card className="lg:col-span-2">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Residents per Rotation</CardTitle>
					<CardDescription>Number of postings per rotation</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={rotations.perRotation.slice(0, 15)}
								layout="vertical"
								margin={{ left: 100 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis type="number" tick={{ fontSize: 11 }} />
								<YAxis
									type="category"
									dataKey="rotation"
									tick={{ fontSize: 11 }}
									width={120}
								/>
								<Tooltip />
								<Bar dataKey="count" fill="#0066CC" radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Core vs Elective donut */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Core vs Elective</CardTitle>
					<CardDescription>Rotation type distribution</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={rotations.electiveCoreCount}
									cx="50%"
									cy="50%"
									innerRadius={50}
									outerRadius={85}
									dataKey="value"
									nameKey="label"
									label={(props) => {
										const d = props as unknown as {
											label: string;
											value: number;
										};
										return `${d.label}: ${d.value}`;
									}}
								>
									<Cell fill="#0066CC" />
									<Cell fill="#00897B" />
								</Pie>
								<Tooltip />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Rotation Status */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Rotation Status</CardTitle>
					<CardDescription>Entry status breakdown</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={rotations.statusSplit}
									cx="50%"
									cy="50%"
									innerRadius={50}
									outerRadius={85}
									dataKey="count"
									nameKey="status"
									label={(props) => {
										const d = props as unknown as {
											status: string;
											count: number;
										};
										return `${d.status}: ${d.count}`;
									}}
								>
									{rotations.statusSplit.map((entry) => (
										<Cell
											key={entry.status}
											fill={STATUS_COLORS[entry.status] ?? "#9CA3AF"}
										/>
									))}
								</Pie>
								<Tooltip />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ======================== 3. ATTENDANCE ========================

function AttendanceSection({
	attendance,
}: {
	attendance: HodAnalyticsBundle["attendance"];
}) {
	return (
		<>
			{/* KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<SimpleKpiCard
					title="Avg Attendance"
					value={attendance.avgAttendancePct}
					suffix="%"
					icon={CheckCircle2}
					color={
						attendance.avgAttendancePct >= 75 ? "bg-green-600" : "bg-red-600"
					}
				/>
				<SimpleKpiCard
					title="Below 75%"
					value={attendance.belowThreshold.length}
					icon={AlertTriangle}
					color={
						attendance.belowThreshold.length > 0 ? "bg-red-600" : "bg-green-600"
					}
				/>
				<SimpleKpiCard
					title="Weeks Tracked"
					value={attendance.weeklyTrend.length}
					icon={BarChart3}
					color="bg-blue-600"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Weekly Trend */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Weekly Attendance Trend</CardTitle>
						<CardDescription>
							Present vs Absent entries per week
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={attendance.weeklyTrend}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="week" tick={{ fontSize: 10 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<Tooltip />
									<Legend />
									<Bar
										dataKey="present"
										fill="#10B981"
										name="Present"
										stackId="a"
										radius={[4, 4, 0, 0]}
									/>
									<Bar
										dataKey="absent"
										fill="#EF4444"
										name="Absent"
										stackId="a"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Below 75% residents */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-red-500" />
							Residents Below 75% Attendance
						</CardTitle>
						<CardDescription>
							{attendance.belowThreshold.length === 0 ?
								"All residents meet the attendance threshold"
							:	`${attendance.belowThreshold.length} resident(s) at risk`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{attendance.belowThreshold.length === 0 ?
							<div className="flex flex-col items-center justify-center py-8 text-green-600">
								<CheckCircle2 className="h-10 w-10 mb-2" />
								<p className="text-sm font-medium">All residents above 75%</p>
							</div>
						:	<div className="space-y-3 max-h-72 overflow-y-auto">
								{attendance.belowThreshold.map((s, i) => (
									<div key={i} className="flex items-center justify-between">
										<span className="text-sm font-medium">{s.name}</span>
										<div className="flex items-center gap-2">
											<Progress
												value={s.pct}
												className={cn(
													"h-2 w-24",
													s.pct < 50 ?
														"[&>div]:bg-red-500"
													:	"[&>div]:bg-amber-500",
												)}
											/>
											<Badge
												variant={s.pct < 50 ? "destructive" : "outline"}
												className="text-xs min-w-10 justify-center"
											>
												{s.pct}%
											</Badge>
										</div>
									</div>
								))}
							</div>
						}
					</CardContent>
				</Card>
			</div>
		</>
	);
}

// ======================== 4. CASE MANAGEMENT ========================

function CaseManagementSection({
	caseManagement,
}: {
	caseManagement: HodAnalyticsBundle["caseManagement"];
}) {
	return (
		<>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Cases by Category (horizontal bar) */}
				<Card className="lg:col-span-2">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Cases by Category</CardTitle>
						<CardDescription>
							Distribution across all emergency medicine categories
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-80">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={caseManagement.byCategory}
									layout="vertical"
									margin={{ left: 120 }}
								>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis type="number" tick={{ fontSize: 11 }} />
									<YAxis
										type="category"
										dataKey="category"
										tick={{ fontSize: 10 }}
										width={140}
									/>
									<Tooltip />
									<Bar dataKey="count" fill="#0066CC" radius={[0, 4, 4, 0]}>
										{caseManagement.byCategory.map((_: unknown, i: number) => (
											<Cell key={i} fill={COLORS[i % COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Competency Distribution (pie) */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Competency Distribution</CardTitle>
						<CardDescription>CBD / S / O / MS / MI breakdown</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={caseManagement.competencyDist}
										cx="50%"
										cy="50%"
										innerRadius={55}
										outerRadius={90}
										dataKey="count"
										nameKey="level"
										label={(props) => {
											const d = props as unknown as {
												level: string;
												percent: number;
											};
											return `${d.level} ${(d.percent * 100).toFixed(0)}%`;
										}}
										labelLine={false}
									>
										{caseManagement.competencyDist.map(
											(_: unknown, i: number) => (
												<Cell key={i} fill={COLORS[i % COLORS.length]} />
											),
										)}
									</Pie>
									<Tooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Monthly Case Volume (area) */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Monthly Case Volume</CardTitle>
						<CardDescription>
							Cases logged per month (12-month view)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={caseManagement.monthlyCaseTrend}>
									<defs>
										<linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#00897B" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#00897B" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="month" tick={{ fontSize: 10 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<Tooltip />
									<Area
										type="monotone"
										dataKey="count"
										stroke="#00897B"
										strokeWidth={2}
										fill="url(#colorCases)"
										name="Cases"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top 5 Table */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						Top 5 Most Logged Categories
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>#</TableHead>
								<TableHead>Category</TableHead>
								<TableHead className="text-right">Count</TableHead>
								<TableHead className="w-48">Share</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{caseManagement.top5Categories.map((c, i) => {
								const total = caseManagement.byCategory.reduce(
									(a, b) => a + b.count,
									0,
								);
								const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
								return (
									<TableRow key={i}>
										<TableCell className="font-medium">{i + 1}</TableCell>
										<TableCell>{c.category}</TableCell>
										<TableCell className="text-right font-bold">
											{c.count}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Progress value={pct} className="h-2 flex-1" />
												<span className="text-xs text-muted-foreground w-8">
													{pct}%
												</span>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</>
	);
}

// ======================== 5. CLINICAL SKILLS ========================

function ClinicalSkillsSection({
	clinicalSkills,
}: {
	clinicalSkills: HodAnalyticsBundle["clinicalSkills"];
}) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Confidence Distribution (pie) */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						Confidence Level Distribution
					</CardTitle>
					<CardDescription>
						VC / FC / SC / NC across all clinical skills
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={clinicalSkills.confidenceDist}
									cx="50%"
									cy="50%"
									innerRadius={55}
									outerRadius={90}
									dataKey="count"
									nameKey="level"
									label={(props) => {
										const d = props as unknown as {
											level: string;
											percent: number;
										};
										return `${d.level} ${(d.percent * 100).toFixed(0)}%`;
									}}
									labelLine={false}
								>
									{clinicalSkills.confidenceDist.map(
										(_: unknown, i: number) => (
											<Cell key={i} fill={COLORS[i % COLORS.length]} />
										),
									)}
								</Pie>
								<Tooltip />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Radar */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Confidence Radar</CardTitle>
					<CardDescription>Confidence levels mapped as radar</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<RadarChart data={clinicalSkills.confidenceDist}>
								<PolarGrid />
								<PolarAngleAxis dataKey="level" tick={{ fontSize: 11 }} />
								<PolarRadiusAxis tick={{ fontSize: 10 }} />
								<Radar
									dataKey="count"
									stroke="#0066CC"
									fill="#0066CC"
									fillOpacity={0.3}
									name="Count"
								/>
								<Tooltip />
							</RadarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Top Skills (bar) */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Most Performed Skills</CardTitle>
					<CardDescription>Top logged clinical skills (Adult)</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={clinicalSkills.topSkills.slice(0, 8)}
								layout="vertical"
								margin={{ left: 80 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis type="number" tick={{ fontSize: 11 }} />
								<YAxis
									type="category"
									dataKey="skill"
									tick={{ fontSize: 10 }}
									width={100}
								/>
								<Tooltip />
								<Bar
									dataKey="count"
									fill="#10B981"
									radius={[0, 4, 4, 0]}
									name="Entries"
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Least Skills (bar) */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Least Performed Skills</CardTitle>
					<CardDescription>
						Skills needing more exposure (Pediatric)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={clinicalSkills.leastSkills.slice(0, 8)}
								layout="vertical"
								margin={{ left: 80 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis type="number" tick={{ fontSize: 11 }} />
								<YAxis
									type="category"
									dataKey="skill"
									tick={{ fontSize: 10 }}
									width={100}
								/>
								<Tooltip />
								<Bar
									dataKey="count"
									fill="#F59E0B"
									radius={[0, 4, 4, 0]}
									name="Entries"
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ======================== 6. ACADEMICS ========================

function AcademicsSection({
	academics,
}: {
	academics: HodAnalyticsBundle["academics"];
}) {
	return (
		<>
			{/* Monthly multi-line chart */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						Monthly Academic Participation
					</CardTitle>
					<CardDescription>
						Case Presentations, Seminars & Journal Clubs over 12 months
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={academics.monthlyParticipation}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis dataKey="month" tick={{ fontSize: 10 }} />
								<YAxis tick={{ fontSize: 11 }} />
								<Tooltip />
								<Legend />
								<Line
									type="monotone"
									dataKey="presentations"
									stroke="#0066CC"
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Presentations"
								/>
								<Line
									type="monotone"
									dataKey="seminars"
									stroke="#00897B"
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Seminars"
								/>
								<Line
									type="monotone"
									dataKey="journals"
									stroke="#F59E0B"
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Journal Clubs"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Per Resident table */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						Academic Activity per Resident
					</CardTitle>
					<CardDescription>
						Total presentations + seminars + journal clubs
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto max-h-80">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>#</TableHead>
									<TableHead>Resident</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="w-48">Relative</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{academics.perResident.slice(0, 15).map((r, i) => {
									const max = academics.perResident[0]?.total ?? 1;
									const pct = Math.round((r.total / max) * 100);
									return (
										<TableRow key={i}>
											<TableCell className="font-medium">{i + 1}</TableCell>
											<TableCell>{r.name}</TableCell>
											<TableCell className="text-right font-bold">
												{r.total}
											</TableCell>
											<TableCell>
												<Progress value={pct} className="h-2" />
											</TableCell>
										</TableRow>
									);
								})}
								{academics.perResident.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-6 text-muted-foreground"
										>
											No academic activity yet
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</>
	);
}

// ======================== 7. FACULTY INSIGHTS ========================

function FacultySection({
	facultyInsights,
}: {
	facultyInsights: HodAnalyticsBundle["facultyInsights"];
}) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Faculty review bar chart */}
			<Card className="lg:col-span-2">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Faculty Review Activity</CardTitle>
					<CardDescription>
						Signed reviews and pending workload per faculty member
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={facultyInsights.perFaculty}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis dataKey="name" tick={{ fontSize: 10 }} />
								<YAxis tick={{ fontSize: 11 }} />
								<Tooltip />
								<Legend />
								<Bar
									dataKey="signedCount"
									fill="#10B981"
									name="Signed"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="pendingCount"
									fill="#F59E0B"
									name="Pending"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Faculty detail table */}
			<Card className="lg:col-span-2">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Faculty Performance Table</CardTitle>
					<CardDescription>Detailed review metrics per faculty</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Faculty</TableHead>
									<TableHead className="text-center">Signed</TableHead>
									<TableHead className="text-center">Pending</TableHead>
									<TableHead className="text-right">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{facultyInsights.perFaculty.map((f, i) => (
									<TableRow key={i}>
										<TableCell className="font-medium">{f.name}</TableCell>
										<TableCell className="text-center">
											<Badge
												variant="outline"
												className="bg-green-50 text-green-700 border-green-200"
											>
												{f.signedCount}
											</Badge>
										</TableCell>
										<TableCell className="text-center">
											<Badge
												variant={f.pendingCount > 5 ? "destructive" : "outline"}
												className={cn(
													f.pendingCount > 5 ?
														""
													:	"bg-amber-50 text-amber-700 border-amber-200",
												)}
											>
												{f.pendingCount}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{f.pendingCount === 0 ?
												<Badge className="bg-green-100 text-green-700 border-green-200">
													All Clear
												</Badge>
											: f.pendingCount > 10 ?
												<Badge variant="destructive">High Load</Badge>
											:	<Badge
													variant="outline"
													className="bg-amber-50 text-amber-700 border-amber-200"
												>
													Active
												</Badge>
											}
										</TableCell>
									</TableRow>
								))}
								{facultyInsights.perFaculty.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-6 text-muted-foreground"
										>
											No faculty data
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
