/**
 * @module HodLifeSupportCoursesPage
 * @description HOD review page for student life-support course submissions.
 * Displays all pending and signed submissions for HOD to review.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 * @see actions/life-support-courses.ts — getCoursesForReview
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getCoursesForReview } from "@/actions/life-support-courses";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { LifeSupportCoursesReviewClient } from "../../faculty/life-support-courses/LifeSupportCoursesReviewClient";

export const dynamic = "force-dynamic";

async function HodCoursesContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getCoursesForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized = submissions.map((s) => ({
		...s,
		date: s.date ? s.date.toISOString() : null,
		createdAt: s.createdAt.toISOString(),
	}));

	return (
		<LifeSupportCoursesReviewClient
			submissions={serialized}
			role="hod"
			autoReviewEnabled={autoReviewSettings.lifeSupportCourses}
		/>
	);
}

export default async function HodLifeSupportCoursesPage() {
	await requireRole(["hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Life-Support Courses Review"
				description="Review student life-support course submissions across all batches"
			/>

			<Suspense
				fallback={
					<div className="space-y-4">
						<div className="grid grid-cols-5 gap-3">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-20 rounded-lg" />
							))}
						</div>
						<Skeleton className="h-14 rounded-lg" />
						<Skeleton className="h-96 rounded-lg" />
					</div>
				}
			>
				<HodCoursesContent />
			</Suspense>
		</div>
	);
}
