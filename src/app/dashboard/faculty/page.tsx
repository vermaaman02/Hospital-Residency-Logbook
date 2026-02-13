/**
 * @module FacultyDashboard
 * @description Main dashboard for faculty members. Shows assigned students,
 * pending reviews, and recent submissions.
 *
 * @see roadmap.md — Section 6, Module B
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/cards/StatCard";
import { Users, FileCheck, Clock, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function FacultyDashboardPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const user = await ensureUserInDb();
	if (!user) redirect("/sign-in");

	// Get assigned student IDs
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: user.id },
		select: { studentId: true },
	});
	const studentIds = assignments.map((a) => a.studentId);

	// Count stats in parallel
	const [
		assignedStudents,
		pendingCases,
		pendingProcs,
		signedThisMonth,
		revisionCases,
		revisionProcs,
	] = await Promise.all([
		Promise.resolve(studentIds.length),
		prisma.caseManagementLog.count({
			where: { userId: { in: studentIds }, status: "SUBMITTED" as never },
		}),
		prisma.procedureLog.count({
			where: { userId: { in: studentIds }, status: "SUBMITTED" as never },
		}),
		prisma.digitalSignature.count({
			where: {
				signedById: user.id,
				signedAt: {
					gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
				},
			},
		}),
		prisma.caseManagementLog.count({
			where: { userId: { in: studentIds }, status: "NEEDS_REVISION" as never },
		}),
		prisma.procedureLog.count({
			where: { userId: { in: studentIds }, status: "NEEDS_REVISION" as never },
		}),
	]);

	const stats = {
		assignedStudents,
		pendingReviews: pendingCases + pendingProcs,
		signedThisMonth,
		needsRevision: revisionCases + revisionProcs,
	};

	// Fetch recent pending entries for the review section
	const recentPending = await prisma.caseManagementLog.findMany({
		where: { userId: { in: studentIds }, status: "SUBMITTED" as never },
		orderBy: { createdAt: "desc" },
		take: 5,
		include: { user: { select: { firstName: true, lastName: true } } },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Faculty Dashboard"
				description="Review and sign off on student logbook entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Faculty" },
				]}
			/>

			{/* Stats Overview */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					title="Assigned Students"
					value={stats.assignedStudents}
					icon={Users}
					description="Students under your guidance"
				/>
				<StatCard
					title="Pending Reviews"
					value={stats.pendingReviews}
					icon={Clock}
					description="Entries awaiting your sign-off"
					trend={
						stats.pendingReviews > 0 ?
							{ value: stats.pendingReviews, isPositive: false }
						:	undefined
					}
				/>
				<StatCard
					title="Signed This Month"
					value={stats.signedThisMonth}
					icon={FileCheck}
					description="Entries signed off"
				/>
				<StatCard
					title="Needs Revision"
					value={stats.needsRevision}
					icon={AlertCircle}
					description="Entries sent back for revision"
				/>
			</div>

			{/* Pending Reviews Section */}
			<div className="border rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Pending Reviews</h2>
					{stats.pendingReviews > 0 && (
						<Link
							href="/dashboard/faculty/students"
							className="text-sm text-hospital-primary hover:underline"
						>
							View All
						</Link>
					)}
				</div>
				{recentPending.length > 0 ?
					<div className="space-y-3">
						{recentPending.map((entry) => (
							<div
								key={entry.id}
								className="flex items-center justify-between border-b pb-2 last:border-0"
							>
								<div>
									<p className="font-medium text-sm">
										{entry.user.firstName} {entry.user.lastName}
									</p>
									<p className="text-xs text-muted-foreground">
										{entry.category} — {entry.caseSubCategory}
									</p>
								</div>
								<span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
									Submitted
								</span>
							</div>
						))}
					</div>
				:	<div className="text-center py-8 text-muted-foreground">
						<Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p>No pending reviews at the moment.</p>
						<p className="text-sm mt-1">
							Student submissions will appear here for your review.
						</p>
					</div>
				}
			</div>

			{/* Assigned Students Section */}
			<div className="border rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Your Students</h2>
					{stats.assignedStudents > 0 && (
						<Link
							href="/dashboard/faculty/students"
							className="text-sm text-hospital-primary hover:underline"
						>
							View All
						</Link>
					)}
				</div>
				{stats.assignedStudents > 0 ?
					<p className="text-muted-foreground text-sm">
						You currently have{" "}
						<span className="font-semibold text-foreground">
							{stats.assignedStudents}
						</span>{" "}
						student(s) assigned. Visit the{" "}
						<Link
							href="/dashboard/faculty/students"
							className="text-hospital-primary hover:underline"
						>
							Students page
						</Link>{" "}
						for details.
					</p>
				:	<div className="text-center py-8 text-muted-foreground">
						<Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p>No students assigned yet.</p>
						<p className="text-sm mt-1">
							Student assignments are managed by the HOD.
						</p>
					</div>
				}
			</div>
		</div>
	);
}
