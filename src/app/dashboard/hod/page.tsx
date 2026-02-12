/**
 * @module HodDashboard
 * @description Main dashboard for HOD. Shows department overview,
 * all students, faculty assignments, and aggregate statistics.
 *
 * @see roadmap.md — Section 6, Module C
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/cards/StatCard";
import { Users, UserCheck, GraduationCap, BarChart3 } from "lucide-react";

export default async function HodDashboardPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	// TODO: Fetch actual data from database when API routes are ready
	const stats = {
		totalStudents: 0,
		totalFaculty: 0,
		totalEntries: 0,
		completionRate: 0,
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="HOD Dashboard"
				description="Department of Emergency Medicine — Overview"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "HOD" },
				]}
			/>

			{/* Stats Overview */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					title="Total Students"
					value={stats.totalStudents}
					icon={GraduationCap}
					description="Active PG residents"
				/>
				<StatCard
					title="Total Faculty"
					value={stats.totalFaculty}
					icon={UserCheck}
					description="Supervising faculty"
				/>
				<StatCard
					title="Total Entries"
					value={stats.totalEntries}
					icon={BarChart3}
					description="All logbook entries"
				/>
				<StatCard
					title="Avg. Completion"
					value={`${stats.completionRate}%`}
					icon={Users}
					description="Across all students"
				/>
			</div>

			{/* Student Management */}
			<div className="border rounded-lg p-6">
				<h2 className="text-lg font-semibold mb-4">Student Overview</h2>
				<div className="text-center py-8 text-muted-foreground">
					<GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No students registered yet.</p>
					<p className="text-sm mt-1">
						Students will appear here once they sign up and are assigned roles.
					</p>
				</div>
			</div>

			{/* Faculty Management */}
			<div className="border rounded-lg p-6">
				<h2 className="text-lg font-semibold mb-4">Faculty & Assignments</h2>
				<div className="text-center py-8 text-muted-foreground">
					<UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No faculty-student assignments configured.</p>
					<p className="text-sm mt-1">
						Assign faculty members to students for logbook review.
					</p>
				</div>
			</div>
		</div>
	);
}
