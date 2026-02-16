/**
 * @module FacultyDashboardClient
 * @description Rich faculty dashboard with pending reviews queue,
 * student progress cards, and sign-off metrics.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
	Users,
	Clock,
	CheckCircle2,
	AlertCircle,
	ArrowRight,
	FileCheck,
	ClipboardList,
	type LucideIcon,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";

/* ─── types ─── */

interface PendingEntry {
	id: string;
	studentName: string;
	module: string;
	title: string;
	status: string;
	date: string;
	href: string;
}

interface StudentSummary {
	id: string;
	name: string;
	batch: string | null;
	semester: number;
	totalEntries: number;
	signedEntries: number;
	pendingEntries: number;
}

interface ModulePending {
	module: string;
	count: number;
}

export interface FacultyDashboardData {
	facultyName: string;
	assignedStudents: number;
	pendingReviews: number;
	signedThisMonth: number;
	needsRevision: number;
	pendingEntries: PendingEntry[];
	students: StudentSummary[];
	modulePending: ModulePending[];
	recentSignoffs: PendingEntry[];
}

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-700",
	SUBMITTED: "bg-amber-50 text-amber-700",
	SIGNED: "bg-emerald-50 text-emerald-700",
	NEEDS_REVISION: "bg-orange-50 text-orange-700",
	REJECTED: "bg-red-50 text-red-700",
};

const BAR_COLORS = [
	"#0066cc",
	"#00897b",
	"#f59e0b",
	"#d32f2f",
	"#6b7280",
	"#8b5cf6",
];

export function FacultyDashboardClient({
	data,
}: {
	data: FacultyDashboardData;
}) {
	return (
		<div className="space-y-4 sm:space-y-6">
			{/* ── Welcome Banner ── */}
			<div className="relative overflow-hidden rounded-xl bg-linear-to-br from-hospital-secondary via-teal-600 to-teal-700 p-4 sm:p-6 text-white">
				<div className="relative z-10">
					<p className="text-teal-100 text-xs sm:text-sm font-medium">
						Welcome back,
					</p>
					<h2 className="text-xl sm:text-2xl font-bold mt-0.5">
						{data.facultyName}
					</h2>
					<p className="text-teal-200 text-sm mt-1">
						Faculty · Department of Emergency Medicine
					</p>
					<div className="flex items-center gap-4 mt-4 flex-wrap">
						<StatPill
							icon={Users}
							value={data.assignedStudents}
							label="students"
						/>
						<Separator
							orientation="vertical"
							className="h-4 bg-teal-400/40 hidden sm:block"
						/>
						<StatPill
							icon={Clock}
							value={data.pendingReviews}
							label="pending"
							alert={data.pendingReviews > 0}
						/>
						<Separator
							orientation="vertical"
							className="h-4 bg-teal-400/40 hidden sm:block"
						/>
						<StatPill
							icon={CheckCircle2}
							value={data.signedThisMonth}
							label="signed this month"
						/>
					</div>
				</div>
				<div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
				<div className="absolute -right-2 bottom-0 h-20 w-20 rounded-full bg-white/5" />
			</div>

			{/* ── Quick Stats ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
				<QuickCard
					label="Assigned Students"
					value={data.assignedStudents}
					icon={Users}
					color="text-blue-600"
					bg="bg-blue-50"
				/>
				<QuickCard
					label="Pending Reviews"
					value={data.pendingReviews}
					icon={Clock}
					color="text-amber-600"
					bg="bg-amber-50"
					alert={data.pendingReviews > 0}
				/>
				<QuickCard
					label="Signed This Month"
					value={data.signedThisMonth}
					icon={FileCheck}
					color="text-emerald-600"
					bg="bg-emerald-50"
				/>
				<QuickCard
					label="Needs Revision"
					value={data.needsRevision}
					icon={AlertCircle}
					color="text-orange-600"
					bg="bg-orange-50"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
				{/* ── Pending Reviews Queue ── */}
				<Card className="lg:col-span-2 border-0 shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Clock className="h-4 w-4 text-amber-500" />
								Pending Reviews
								{data.pendingReviews > 0 && (
									<Badge
										variant="destructive"
										className="text-[10px] h-5 px-1.5"
									>
										{data.pendingReviews}
									</Badge>
								)}
							</CardTitle>
							{data.pendingReviews > 0 && (
								<Link
									href="/dashboard/faculty/students"
									className="text-xs text-hospital-primary hover:underline"
								>
									View All
								</Link>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{data.pendingEntries.length > 0 ?
							<div className="space-y-1">
								{data.pendingEntries.map((entry) => (
									<Link
										key={entry.id}
										href={entry.href}
										className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
												<span className="text-xs font-semibold text-amber-700">
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
											className={`shrink-0 text-[10px] ${STATUS_COLORS[entry.status] ?? ""}`}
										>
											{entry.status.replace("_", " ")}
										</Badge>
									</Link>
								))}
							</div>
						:	<EmptyState
								icon={CheckCircle2}
								message="All caught up!"
								sub="No entries awaiting your review."
							/>
						}
					</CardContent>
				</Card>

				{/* ── Review Distribution by Module ── */}
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<ClipboardList className="h-4 w-4 text-hospital-primary" />
							Pending by Module
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4">
						{data.modulePending.some((m) => m.count > 0) ?
							<ResponsiveContainer width="100%" height={200}>
								<BarChart
									data={data.modulePending.filter((m) => m.count > 0)}
									layout="vertical"
									margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
								>
									<XAxis type="number" hide />
									<YAxis
										dataKey="module"
										type="category"
										width={90}
										tick={{ fontSize: 11 }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip
										contentStyle={{
											fontSize: 12,
											borderRadius: 8,
											border: "1px solid #e5e7eb",
										}}
									/>
									<Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
										{data.modulePending
											.filter((m) => m.count > 0)
											.map((_, i) => (
												<Cell
													key={i}
													fill={BAR_COLORS[i % BAR_COLORS.length]}
												/>
											))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						:	<div className="h-50 flex items-center justify-center text-sm text-muted-foreground">
								No pending reviews
							</div>
						}
					</CardContent>
				</Card>
			</div>

			{/* ── Student Cards ── */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-semibold">Your Students</h3>
					<Link
						href="/dashboard/faculty/students"
						className="text-xs text-hospital-primary hover:underline flex items-center gap-1"
					>
						View All <ArrowRight className="h-3 w-3" />
					</Link>
				</div>
				{data.students.length > 0 ?
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
						{data.students.map((s) => (
							<Card
								key={s.id}
								className="border-0 shadow-sm hover:shadow-md transition-shadow"
							>
								<CardContent className="p-4">
									<div className="flex items-center gap-3 mb-3">
										<div className="h-10 w-10 rounded-full bg-linear-to-br from-hospital-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm">
											{s.name
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</div>
										<div className="min-w-0">
											<p className="font-medium text-sm truncate">{s.name}</p>
											<p className="text-xs text-muted-foreground">
												{s.batch ?? "—"} · Sem {s.semester}
											</p>
										</div>
									</div>
									<div className="grid grid-cols-3 gap-2 text-center">
										<div>
											<p className="text-lg font-bold">{s.totalEntries}</p>
											<p className="text-[10px] text-muted-foreground">Total</p>
										</div>
										<div>
											<p className="text-lg font-bold text-emerald-600">
												{s.signedEntries}
											</p>
											<p className="text-[10px] text-muted-foreground">
												Signed
											</p>
										</div>
										<div>
											<p className="text-lg font-bold text-amber-600">
												{s.pendingEntries}
											</p>
											<p className="text-[10px] text-muted-foreground">
												Pending
											</p>
										</div>
									</div>
									{s.totalEntries > 0 && (
										<div className="mt-3">
											<Progress
												value={(s.signedEntries / s.totalEntries) * 100}
												className="h-1.5"
											/>
											<p className="text-[10px] text-muted-foreground text-right mt-0.5">
												{Math.round((s.signedEntries / s.totalEntries) * 100)}%
												completed
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				:	<Card className="border-0 shadow-sm">
						<CardContent className="p-8">
							<EmptyState
								icon={Users}
								message="No students assigned"
								sub="Student assignments are managed by the HOD."
							/>
						</CardContent>
					</Card>
				}
			</div>

			{/* ── Recent Sign-offs ── */}
			{data.recentSignoffs.length > 0 && (
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<FileCheck className="h-4 w-4 text-emerald-500" />
							Recently Signed
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-1">
							{data.recentSignoffs.map((entry) => (
								<div
									key={entry.id}
									className="flex items-center justify-between p-2.5 rounded-lg"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
											<CheckCircle2 className="h-4 w-4 text-emerald-600" />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">
												{entry.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{entry.studentName} · {entry.date}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className="bg-emerald-50 text-emerald-700 text-[10px]"
									>
										Signed
									</Badge>
								</div>
							))}
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
	alert,
}: {
	icon: LucideIcon;
	value: number;
	label: string;
	alert?: boolean;
}) {
	return (
		<div className="flex items-center gap-1.5 text-sm">
			<Icon
				className={`h-4 w-4 ${alert ? "text-amber-300" : "text-teal-200"}`}
			/>
			<span className="font-semibold">{value}</span>
			<span className="text-teal-200">{label}</span>
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
