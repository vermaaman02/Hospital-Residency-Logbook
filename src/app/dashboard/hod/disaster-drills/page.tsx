/**
 * @module HodDisasterDrillsPage
 * @description HOD review page for student disaster drill submissions.
 *
 * @see PG Logbook .md — "MAJOR INCIDENT PLANNING/ DISASTER MANAGEMENT DRILL/ MASS CASUALTY MANAGEMENT/PREHOSPITAL EM"
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getDisasterDrillsForReview } from "@/actions/disaster-drills";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { DisasterDrillsReviewClient } from "../../faculty/disaster-drills/DisasterDrillsReviewClient";

export const dynamic = "force-dynamic";

async function HodDisasterDrillsContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getDisasterDrillsForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized = submissions.map((s) => ({
		...s,
		date: s.date ? s.date.toISOString() : null,
		createdAt: s.createdAt.toISOString(),
	}));

	return (
		<DisasterDrillsReviewClient
			submissions={serialized}
			role="hod"
			autoReviewEnabled={autoReviewSettings.disasterDrills}
		/>
	);
}

export default async function HodDisasterDrillsPage() {
	await requireRole(["hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Disaster Drills Review"
				description="Review and sign off student disaster drill submissions"
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
				<HodDisasterDrillsContent />
			</Suspense>
		</div>
	);
}
