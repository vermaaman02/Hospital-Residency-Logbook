/**
 * @module FacultyQualityImprovementPage
 * @description Faculty review page for student quality improvement submissions.
 *
 * @see PG Logbook .md — "QUALITY IMPROVEMENT/PATIENT SAFETY INITIATIVE/CLINICAL AUDIT"
 */

import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getQualityImprovementsForReview } from "@/actions/quality-improvement";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { QualityImprovementReviewClient } from "./QualityImprovementReviewClient";

export const dynamic = "force-dynamic";

async function FacultyQualityImprovementContent() {
	const [submissions, autoReviewSettings] = await Promise.all([
		getQualityImprovementsForReview(),
		getAutoReviewSettings(),
	]);

	// Transform Date fields to strings for client
	const serialized = submissions.map((s) => ({
		...s,
		date: s.date ? s.date.toISOString() : null,
		createdAt: s.createdAt.toISOString(),
	}));

	return (
		<QualityImprovementReviewClient
			submissions={serialized}
			role="faculty"
			autoReviewEnabled={autoReviewSettings.qualityImprovement}
		/>
	);
}

export default async function FacultyQualityImprovementPage() {
	await requireRole(["faculty", "hod"]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Quality Improvement Review"
				description="Review and sign off student quality improvement submissions"
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
				<FacultyQualityImprovementContent />
			</Suspense>
		</div>
	);
}
