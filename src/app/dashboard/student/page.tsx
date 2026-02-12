/**
 * @module StudentDashboard
 * @description Main dashboard for PG residents. Shows progress overview,
 * recent entries, and quick access to all logbook sections.
 *
 * @see roadmap.md — Section 6, Module A
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/cards/StatCard";
import {
	ClipboardList,
	Syringe,
	Activity,
	BookOpen,
	FileText,
	Stethoscope,
	MonitorSmartphone,
	GraduationCap,
} from "lucide-react";
import Link from "next/link";
import {
	CASE_CATEGORIES,
	PROCEDURE_CATEGORIES,
	DIAGNOSTIC_SKILLS,
	IMAGING_CATEGORIES,
} from "@/lib/constants";

const quickLinks = [
	{
		title: "Case Management",
		description: `${Object.keys(CASE_CATEGORIES).length} categories`,
		icon: ClipboardList,
		href: "/dashboard/student/case-management",
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	{
		title: "Procedures",
		description: `${PROCEDURE_CATEGORIES.length} procedure types`,
		icon: Syringe,
		href: "/dashboard/student/procedures",
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	{
		title: "Clinical Skills",
		description: "Adult & Pediatric skills",
		icon: Activity,
		href: "/dashboard/student/clinical-skills",
		color: "text-purple-600",
		bg: "bg-purple-50",
	},
	{
		title: "Diagnostics",
		description: `${DIAGNOSTIC_SKILLS.length} diagnostic types`,
		icon: MonitorSmartphone,
		href: "/dashboard/student/diagnostics",
		color: "text-orange-600",
		bg: "bg-orange-50",
	},
	{
		title: "Imaging",
		description: `${IMAGING_CATEGORIES.length} imaging categories`,
		icon: FileText,
		href: "/dashboard/student/imaging",
		color: "text-pink-600",
		bg: "bg-pink-50",
	},
	{
		title: "Academics",
		description: "Presentations, Seminars, Journal Club",
		icon: BookOpen,
		href: "/dashboard/student/academics",
		color: "text-cyan-600",
		bg: "bg-cyan-50",
	},
	{
		title: "Professional Dev",
		description: "Courses, Conferences, Research",
		icon: GraduationCap,
		href: "/dashboard/student/professional",
		color: "text-indigo-600",
		bg: "bg-indigo-50",
	},
	{
		title: "Administrative",
		description: "Rotation, Attendance, Thesis",
		icon: Stethoscope,
		href: "/dashboard/student/administrative",
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
];

export default async function StudentDashboardPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	// TODO: Fetch actual counts from database when API routes are ready
	const stats = {
		totalCases: 0,
		totalProcedures: 0,
		totalDiagnostics: 0,
		pendingSignoffs: 0,
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Student Dashboard"
				description="Track your progress across all logbook sections"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Student" },
				]}
			/>

			{/* Stats Overview */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					title="Case Logs"
					value={stats.totalCases}
					icon={ClipboardList}
					description="Total case entries"
				/>
				<StatCard
					title="Procedures"
					value={stats.totalProcedures}
					icon={Syringe}
					description="Total procedures logged"
				/>
				<StatCard
					title="Diagnostics"
					value={stats.totalDiagnostics}
					icon={Activity}
					description="Diagnostic skills logged"
				/>
				<StatCard
					title="Pending Sign-offs"
					value={stats.pendingSignoffs}
					icon={FileText}
					description="Awaiting faculty review"
					trend={stats.pendingSignoffs > 0 ? { value: stats.pendingSignoffs, isPositive: false } : undefined}
				/>
			</div>

			{/* Quick Access Grid */}
			<div>
				<h2 className="text-lg font-semibold mb-4">Logbook Sections</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{quickLinks.map((link) => (
						<Link key={link.title} href={link.href}>
							<div className="border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3 h-full">
								<div
									className={`h-10 w-10 rounded-lg ${link.bg} flex items-center justify-center`}
								>
									<link.icon className={`h-5 w-5 ${link.color}`} />
								</div>
								<div>
									<h3 className="font-medium">{link.title}</h3>
									<p className="text-sm text-muted-foreground">
										{link.description}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
