/**
 * @module HodResearchActivitiesPage
 * @description HOD review page for student research and outreach activity submissions.
 * Displays all pending and signed submissions for HOD to review.
 *
 * @see PG Logbook .md — "OTHER RESEARCH/ TEAM BUILDING/TEACHING & TRAINING/ COMMUNITY OUTREACH ACTIVITY"
 * @see actions/research-activities.ts — getResearchForReview
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getResearchForReview } from "@/actions/research-activities";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	ResearchActivitiesReviewClient,
	type ResearchSubmission,
} from "../../faculty/research-activities/ResearchActivitiesReviewClient";

export const dynamic = "force-dynamic";

async function HodResearchActivitiesContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getResearchForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized: ResearchSubmission[] = submissions.map((s) => {
		const entry = s as unknown as {
			id: string;
			slNo: number;
			date: Date | null;
			activity: string | null;
			conductedAt: string | null;
			participationRole: string | null;
			facultyRemark: string | null;
			facultyId: string | null;
			status: string;
			createdAt: Date;
			user: {
				id: string;
				firstName: string;
				lastName: string;
				email: string;
				currentSemester: number | null;
				batchRelation: { name: string } | null;
			};
		};
		return {
			id: entry.id,
			slNo: entry.slNo,
			date: entry.date ? entry.date.toISOString() : null,
			activity: entry.activity ?? null,
			conductedAt: entry.conductedAt ?? null,
			participationRole: entry.participationRole ?? null,
			facultyRemark: entry.facultyRemark ?? null,
			facultyId: entry.facultyId ?? null,
			status: entry.status,
			createdAt: entry.createdAt.toISOString(),
			user: entry.user,
		};
	});

	return (
		<ResearchActivitiesReviewClient
			submissions={serialized}
			role="hod"
			autoReviewEnabled={autoReviewSettings.researchActivities}
		/>
	);
}

export default async function HodResearchActivitiesPage() {
	await requireRole(["hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Research Activities Review"
				description="Review student research & outreach activities across all batches"
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
				<HodResearchActivitiesContent />
			</Suspense>
		</div>
	);
}
