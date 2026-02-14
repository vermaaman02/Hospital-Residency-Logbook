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
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HodDashboardPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const [
		totalStudents,
		totalFaculty,
		totalCases,
		totalProcedures,
		totalDiagnostics,
	] = await Promise.all([
		prisma.user.count({ where: { role: "STUDENT" as never } }),
		prisma.user.count({ where: { role: "FACULTY" as never } }),
		prisma.caseManagementLog.count(),
		prisma.procedureLog.count(),
		prisma.diagnosticSkill.count(),
	]);

	const totalEntries = totalCases + totalProcedures + totalDiagnostics;

	// Recent students (up to 5)
	const recentStudents = await prisma.user.findMany({
		where: { role: "STUDENT" as never },
		orderBy: { createdAt: "desc" },
		take: 5,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
			_count: {
				select: {
					caseManagementLogs: true,
					procedureLogs: true,
				},
			},
		},
	});

	const stats = {
		totalStudents,
		totalFaculty,
		totalEntries,
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
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Student Overview</h2>
					{stats.totalStudents > 0 && (
						<Link
							href="/dashboard/hod/students"
							className="text-sm text-hospital-primary hover:underline"
						>
							View All
						</Link>
					)}
				</div>
				{recentStudents.length > 0 ?
					<div className="space-y-3">
						{recentStudents.map((s) => (
							<div
								key={s.id}
								className="flex items-center justify-between border-b pb-2 last:border-0"
							>
								<div>
									<p className="font-medium text-sm">
										{s.firstName} {s.lastName}
									</p>
									<p className="text-xs text-muted-foreground">
										{s.batch ?? "No batch"} · Semester {s.currentSemester ?? 1}
									</p>
								</div>
								<span className="text-xs text-muted-foreground">
									{s._count.caseManagementLogs + s._count.procedureLogs} entries
								</span>
							</div>
						))}
					</div>
				:	<div className="text-center py-8 text-muted-foreground">
						<GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p>No students registered yet.</p>
						<p className="text-sm mt-1">
							Students will appear here once they sign up and are assigned
							roles.
						</p>
					</div>
				}
			</div>

			{/* Faculty Management */}
			<div className="border rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Faculty & Assignments</h2>
					{stats.totalFaculty > 0 && (
						<Link
							href="/dashboard/hod/faculty"
							className="text-sm text-hospital-primary hover:underline"
						>
							View Faculty
						</Link>
					)}
				</div>
				{stats.totalFaculty > 0 ?
					<p className="text-muted-foreground text-sm">
						<span className="font-semibold text-foreground">
							{stats.totalFaculty}
						</span>{" "}
						faculty member(s) registered. Visit{" "}
						<Link
							href="/dashboard/hod/assignments"
							className="text-hospital-primary hover:underline"
						>
							Assignments
						</Link>{" "}
						to manage student-faculty pairings.
					</p>
				:	<div className="text-center py-8 text-muted-foreground">
						<UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p>No faculty-student assignments configured.</p>
						<p className="text-sm mt-1">
							Assign faculty members to students for logbook review.
						</p>
					</div>
				}
			</div>
		</div>
	);
}
