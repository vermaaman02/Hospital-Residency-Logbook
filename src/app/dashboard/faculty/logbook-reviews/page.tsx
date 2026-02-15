/**
 * @module FacultyLogbookReviewsPage
 * @description Faculty review page for student logbook review submissions.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION: PERIODIC LOG BOOK FACULTY REVIEW"
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getLogbookReviewsForReview } from "@/actions/logbook-reviews";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { LogbookReviewsReviewClient } from "./LogbookReviewsReviewClient";

export const dynamic = "force-dynamic";

async function FacultyLogbookReviewsContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getLogbookReviewsForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized = submissions.map((s) => ({
		...s,
		date: s.date ? s.date.toISOString() : null,
		createdAt: s.createdAt.toISOString(),
	}));

	return (
		<LogbookReviewsReviewClient
			submissions={serialized}
			role="faculty"
			autoReviewEnabled={autoReviewSettings.logbookReviews}
		/>
	);
}

export default async function FacultyLogbookReviewsPage() {
	await requireRole(["faculty", "hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Logbook Faculty Reviews"
				description="Review and sign off student periodic logbook review submissions"
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
				<FacultyLogbookReviewsContent />
			</Suspense>
		</div>
	);
}
