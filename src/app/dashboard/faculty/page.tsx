/**
 * @module FacultyDashboard
 * @description Main dashboard for faculty members. Shows assigned students,
 * pending reviews, and recent submissions.
 *
 * @see roadmap.md — Section 6, Module B
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/cards/StatCard";
import { Users, FileCheck, Clock, AlertCircle } from "lucide-react";

export default async function FacultyDashboardPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	// TODO: Fetch actual data from database when API routes are ready
	const stats = {
		assignedStudents: 0,
		pendingReviews: 0,
		signedThisMonth: 0,
		needsRevision: 0,
	};

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
					trend={stats.pendingReviews > 0 ? { value: stats.pendingReviews, isPositive: false } : undefined}
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
				<h2 className="text-lg font-semibold mb-4">Pending Reviews</h2>
				<div className="text-center py-8 text-muted-foreground">
					<Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No pending reviews at the moment.</p>
					<p className="text-sm mt-1">
						Student submissions will appear here for your review.
					</p>
				</div>
			</div>

			{/* Assigned Students Section */}
			<div className="border rounded-lg p-6">
				<h2 className="text-lg font-semibold mb-4">Your Students</h2>
				<div className="text-center py-8 text-muted-foreground">
					<Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No students assigned yet.</p>
					<p className="text-sm mt-1">
						Student assignments are managed by the HOD.
					</p>
				</div>
			</div>
		</div>
	);
}
