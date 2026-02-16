/**
 * @module StudentDashboardClient
 * @description Rich, interactive student dashboard with real-time data,
 * progress tracking, recent activity, and quick navigation.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	BookOpen,
	GraduationCap,
	Stethoscope,
	Truck,
	FileText,
	Siren,
	ShieldCheck,
	ClipboardCheck,
	CalendarDays,
	RotateCcw,
	TrendingUp,
	Clock,
	CheckCircle2,
	AlertCircle,
	ArrowRight,
	Sparkles,
	type LucideIcon,
	FlaskConical,
	Award,
	BarChart3,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";

/* ─── icon map (server sends icon name as string) ─── */

const ICON_MAP: Record<string, LucideIcon> = {
	ClipboardList,
	Syringe,
	Stethoscope,
	Activity,
	Scan,
	BookOpen,
	CalendarDays,
	Truck,
	FileText,
	GraduationCap,
	Award,
	FlaskConical,
	Siren,
	ShieldCheck,
	ClipboardCheck,
	RotateCcw,
	BarChart3,
};

/* ─── types ─── */

interface ModuleCount {
	label: string;
	count: number;
	signed: number;
	pending: number;
	href: string;
	icon: string;
	color: string;
	bg: string;
}

interface RecentEntry {
	id: string;
	module: string;
	title: string;
	status: string;
	date: string;
	href: string;
}

interface WeeklyPoint {
	label: string;
	entries: number;
}

interface StatusCount {
	status: string;
	count: number;
}

export interface StudentDashboardData {
	userName: string;
	semester: number;
	batch: string | null;
	modules: ModuleCount[];
	totalEntries: number;
	totalSigned: number;
	totalPending: number;
	totalDraft: number;
	recentEntries: RecentEntry[];
	weeklyActivity: WeeklyPoint[];
	statusBreakdown: StatusCount[];
	streakDays: number;
}

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
	SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
	SIGNED: "bg-emerald-50 text-emerald-700 border-emerald-200",
	NEEDS_REVISION: "bg-orange-50 text-orange-700 border-orange-200",
	REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const PIE_COLORS = ["#6b7280", "#f59e0b", "#10b981", "#f97316", "#ef4444"];

export function StudentDashboardClient({
	data,
}: {
	data: StudentDashboardData;
}) {
	const completionPct =
		data.totalEntries > 0 ?
			Math.round((data.totalSigned / data.totalEntries) * 100)
		:	0;

	return (
		<div className="space-y-6">
			{/* ── Welcome Banner ── */}
			<div className="relative overflow-hidden rounded-xl bg-linear-to-br from-hospital-primary via-blue-600 to-hospital-primary-dark p-6 text-white">
				<div className="relative z-10">
					<p className="text-blue-100 text-sm font-medium">Welcome back,</p>
					<h2 className="text-2xl font-bold mt-0.5">{data.userName}</h2>
					<p className="text-blue-200 text-sm mt-1">
						{data.batch ? `${data.batch} · ` : ""}Semester {data.semester} · MD
						Emergency Medicine
					</p>
					<div className="flex items-center gap-4 mt-4">
						<div className="flex items-center gap-1.5 text-sm">
							<Sparkles className="h-4 w-4 text-amber-300" />
							<span className="font-semibold">{data.streakDays} day</span>
							<span className="text-blue-200">streak</span>
						</div>
						<Separator orientation="vertical" className="h-4 bg-blue-400/40" />
						<div className="flex items-center gap-1.5 text-sm">
							<CheckCircle2 className="h-4 w-4 text-emerald-300" />
							<span className="font-semibold">{completionPct}%</span>
							<span className="text-blue-200">signed</span>
						</div>
					</div>
				</div>
				{/* Decorative circles */}
				<div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
				<div className="absolute -right-2 bottom-0 h-20 w-20 rounded-full bg-white/5" />
			</div>

			{/* ── Quick Stats Row ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<QuickStat
					label="Total Entries"
					value={data.totalEntries}
					icon={ClipboardList}
					color="text-blue-600"
					bg="bg-blue-50"
				/>
				<QuickStat
					label="Signed"
					value={data.totalSigned}
					icon={CheckCircle2}
					color="text-emerald-600"
					bg="bg-emerald-50"
				/>
				<QuickStat
					label="Pending Review"
					value={data.totalPending}
					icon={Clock}
					color="text-amber-600"
					bg="bg-amber-50"
					alert={data.totalPending > 0}
				/>
				<QuickStat
					label="Drafts"
					value={data.totalDraft}
					icon={FileText}
					color="text-gray-600"
					bg="bg-gray-50"
				/>
			</div>

			{/* ── Charts Row ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Weekly Activity Chart */}
				<Card className="lg:col-span-2 border-0 shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-hospital-primary" />
							Weekly Activity
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4">
						{data.weeklyActivity.length > 0 ?
							<ResponsiveContainer width="100%" height={180}>
								<AreaChart data={data.weeklyActivity}>
									<defs>
										<linearGradient
											id="activityGrad"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#0066cc" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
										</linearGradient>
									</defs>
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11 }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis hide allowDecimals={false} />
									<Tooltip
										contentStyle={{
											fontSize: 12,
											borderRadius: 8,
											border: "1px solid #e5e7eb",
										}}
									/>
									<Area
										type="monotone"
										dataKey="entries"
										stroke="#0066cc"
										strokeWidth={2}
										fill="url(#activityGrad)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						:	<div className="h-45 flex items-center justify-center text-sm text-muted-foreground">
								No activity data yet
							</div>
						}
					</CardContent>
				</Card>

				{/* Status Donut */}
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<BarChart3 className="h-4 w-4 text-hospital-primary" />
							Entry Status
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4 flex flex-col items-center">
						{data.statusBreakdown.some((s) => s.count > 0) ?
							<>
								<ResponsiveContainer width="100%" height={140}>
									<PieChart>
										<Pie
											data={data.statusBreakdown.filter((s) => s.count > 0)}
											dataKey="count"
											nameKey="status"
											cx="50%"
											cy="50%"
											innerRadius={35}
											outerRadius={60}
											paddingAngle={3}
										>
											{data.statusBreakdown
												.filter((s) => s.count > 0)
												.map((_, i) => (
													<Cell
														key={i}
														fill={PIE_COLORS[i % PIE_COLORS.length]}
													/>
												))}
										</Pie>
									</PieChart>
								</ResponsiveContainer>
								<div className="flex flex-wrap gap-2 justify-center mt-1">
									{data.statusBreakdown
										.filter((s) => s.count > 0)
										.map((s, i) => (
											<div
												key={s.status}
												className="flex items-center gap-1.5 text-xs text-muted-foreground"
											>
												<span
													className="h-2.5 w-2.5 rounded-full"
													style={{
														backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
													}}
												/>
												{s.status} ({s.count})
											</div>
										))}
								</div>
							</>
						:	<div className="h-35 flex items-center justify-center text-sm text-muted-foreground">
								No entries yet
							</div>
						}
					</CardContent>
				</Card>
			</div>

			{/* ── Module Progress Grid ── */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-semibold">Logbook Sections</h3>
					<span className="text-xs text-muted-foreground">
						{data.modules.filter((m) => m.count > 0).length} /{" "}
						{data.modules.length} sections active
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{data.modules.map((mod) => {
						const IconComp = ICON_MAP[mod.icon] ?? ClipboardList;
						return (
							<Link key={mod.href + mod.label} href={mod.href}>
								<Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full cursor-pointer">
									<CardContent className="p-4">
										<div className="flex items-start justify-between mb-3">
											<div
												className={`h-9 w-9 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}
											>
												<IconComp className={`h-4.5 w-4.5 ${mod.color}`} />
											</div>
											<ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-hospital-primary transition-colors" />
										</div>
										<h4 className="font-medium text-sm leading-tight">
											{mod.label}
										</h4>
										<div className="flex items-baseline gap-1 mt-1">
											<span className="text-xl font-bold">{mod.count}</span>
											<span className="text-xs text-muted-foreground">
												entries
											</span>
										</div>
										{mod.count > 0 && (
											<div className="mt-2.5">
												<div className="flex justify-between text-[10px] text-muted-foreground mb-1">
													<span>{mod.signed} signed</span>
													{mod.pending > 0 && (
														<span className="text-amber-600">
															{mod.pending} pending
														</span>
													)}
												</div>
												<Progress
													value={
														mod.count > 0 ? (mod.signed / mod.count) * 100 : 0
													}
													className="h-1.5"
												/>
											</div>
										)}
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			</div>

			{/* ── Recent Activity ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<Clock className="h-4 w-4 text-hospital-primary" />
						Recent Activity
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data.recentEntries.length > 0 ?
						<div className="space-y-1">
							{data.recentEntries.map((entry) => (
								<Link
									key={entry.id}
									href={entry.href}
									className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="h-8 w-8 rounded-full bg-hospital-primary/10 flex items-center justify-center shrink-0">
											<span className="text-xs font-semibold text-hospital-primary">
												{entry.module.charAt(0)}
											</span>
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">
												{entry.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{entry.module} · {entry.date}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className={`shrink-0 text-[10px] ${
											STATUS_COLORS[entry.status] ?? ""
										}`}
									>
										{entry.status.replace("_", " ")}
									</Badge>
								</Link>
							))}
						</div>
					:	<div className="text-center py-8 text-muted-foreground">
							<AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
							<p className="text-sm">No entries yet.</p>
							<p className="text-xs mt-1">
								Start logging your cases, procedures, and skills!
							</p>
						</div>
					}
				</CardContent>
			</Card>
		</div>
	);
}

/* ─── Sub-components ─── */

function QuickStat({
	label,
	value,
	icon: Icon,
	color,
	bg,
	alert,
}: {
	label: string;
	value: number;
	icon: LucideIcon;
	color: string;
	bg: string;
	alert?: boolean;
}) {
	return (
		<Card
			className={`border-0 shadow-sm ${alert ? "ring-1 ring-amber-200" : ""}`}
		>
			<CardContent className="p-4 flex items-center gap-3">
				<div
					className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}
				>
					<Icon className={`h-5 w-5 ${color}`} />
				</div>
				<div>
					<p className="text-xl font-bold leading-none">{value}</p>
					<p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}
