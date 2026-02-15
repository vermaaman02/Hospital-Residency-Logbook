/**
 * @module FacultyConferencesPage
 * @description Faculty review page for student conference participation submissions.
 * Displays pending and signed submissions for faculty to review.
 *
 * @see PG Logbook .md — "CONFERENCE AND OTHER ACADEMIC ACTIVITY PARTICIPATION"
 * @see actions/conferences.ts — getConferencesForReview
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getConferencesForReview } from "@/actions/conferences";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ConferencesReviewClient } from "./ConferencesReviewClient";

export const dynamic = "force-dynamic";

async function FacultyConferencesContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getConferencesForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized = submissions.map((s) => ({
		...s,
		date: s.date ? s.date.toISOString() : null,
		createdAt: s.createdAt.toISOString(),
	}));

	return (
		<ConferencesReviewClient
			submissions={serialized}
			role="faculty"
			autoReviewEnabled={autoReviewSettings.conferences}
		/>
	);
}

export default async function FacultyConferencesPage() {
	await requireRole(["faculty", "hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Conference Participation Review"
				description="Review and sign off student conference participation submissions"
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
				<FacultyConferencesContent />
			</Suspense>
		</div>
	);
}
