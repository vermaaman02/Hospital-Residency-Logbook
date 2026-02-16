/**
 * @module Faculty Transport Logs Review Page
 * @description Faculty/HOD review page for student transport log submissions.
 * Single module (no sub-categories).
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

export default async function FacultyTransportPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
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
				description={
					authResult.role === "hod" ?
						"Review all student transport log submissions"
					:	"Review transport log submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Transport" },
				]}
			/>
			<PatientLogReviewClient
				submissions={submissions}
				role={authResult.role as "faculty" | "hod"}
				moduleLabel="Transport"
				autoReviewEnabled={autoReviewSettings.transportLogs}
				autoReviewKey="transportLogs"
				skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
				studentLinkPrefix={`/dashboard/${authResult.role}/transport/student`}
				onSign={signTransportLog}
				onReject={rejectTransportLog}
				onBulkSign={bulkSignTransportLogs}
			/>
		</div>
	);
}
