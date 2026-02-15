/**
 * @module HOD Imaging Logs Review Page
 * @description HOD-only view for reviewing all student imaging log submissions.
 * Reuses PatientLogReviewClient with category filters.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getImagingLogsForReview } from "@/actions/imaging-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	PatientLogReviewClient,
	type PatientLogSubmission,
} from "@/components/shared/PatientLogReviewClient";
import {
	signImagingLogEntry,
	rejectImagingLogEntry,
	bulkSignImagingLogEntries,
} from "@/actions/imaging-logs";
import {
	IMAGING_CATEGORIES,
	IMAGING_CATEGORY_LABELS,
} from "@/lib/constants/imaging-categories";
import { IMAGING_SKILL_LEVEL_LABELS } from "@/lib/constants/imaging-log-fields";

export default async function HodImagingPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getImagingLogsForReview(),
		getAutoReviewSettings(),
	]);

	const submissions: PatientLogSubmission[] = JSON.parse(
		JSON.stringify(
			rawSubmissions.map((s: Record<string, unknown>) => ({
				...s,
				category: (s as Record<string, unknown>).imagingCategory,
			})),
		),
	);

	const categoryOptions = IMAGING_CATEGORIES.map((c) => ({
		value: c.enumValue,
		label: `${c.code} — ${IMAGING_CATEGORY_LABELS[c.enumValue] ?? c.label}`,
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Imaging Logs — Review"
				description="Review all student imaging log submissions across 5 categories"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Imaging" },
				]}
			/>
			<PatientLogReviewClient
				submissions={submissions}
				role="hod"
				moduleLabel="Imaging"
				autoReviewEnabled={autoReviewSettings.imagingLogs}
				autoReviewKey="imagingLogs"
				skillLevelLabels={IMAGING_SKILL_LEVEL_LABELS}
				categoryOptions={categoryOptions}
				categoryLabels={IMAGING_CATEGORY_LABELS}
				studentLinkPrefix="/dashboard/hod/imaging/student"
				onSign={signImagingLogEntry}
				onReject={rejectImagingLogEntry}
				onBulkSign={bulkSignImagingLogEntries}
			/>
		</div>
	);
}
