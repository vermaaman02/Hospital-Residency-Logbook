/**
 * @module HOD Transport Logs Review Page
 * @description HOD-only view for reviewing all student transport log submissions.
 *
 * @see PG Logbook .md — "LOG OF TRANSPORT PROCEDURES"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getTransportLogsForReview } from "@/actions/other-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	PatientLogReviewClient,
	type PatientLogSubmission,
} from "@/components/shared/PatientLogReviewClient";
import {
	signTransportLog,
	rejectTransportLog,
	bulkSignTransportLogs,
} from "@/actions/other-logs";
import { SKILL_LEVEL_LABELS_SOAPI } from "@/lib/constants/other-logs-fields";

export default async function HodTransportPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getTransportLogsForReview(),
		getAutoReviewSettings(),
	]);

	const submissions: PatientLogSubmission[] = JSON.parse(
		JSON.stringify(rawSubmissions),
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Transport Logs — Review"
				description="Review all student transport log submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Transport" },
				]}
			/>
			<PatientLogReviewClient
				submissions={submissions}
				role="hod"
				moduleLabel="Transport"
				autoReviewEnabled={autoReviewSettings.transportLogs}
				autoReviewKey="transportLogs"
				skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
				studentLinkPrefix="/dashboard/hod/transport/student"
				onSign={signTransportLog}
				onReject={rejectTransportLog}
				onBulkSign={bulkSignTransportLogs}
			/>
		</div>
	);
}
