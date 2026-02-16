/**
 * @module Faculty Consent & Bad News Review Page
 * @description Faculty/HOD review page for student consent (H7) and
 * bad news (H8) log submissions. Renders two sections with tabs.
 *
 * @see PG Logbook .md — "CONSENT" and "BREAKING BAD NEWS"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getConsentLogsForReview,
	getBadNewsLogsForReview,
	signConsentLog,
	rejectConsentLog,
	bulkSignConsentLogs,
	signBadNewsLog,
	rejectBadNewsLog,
	bulkSignBadNewsLogs,
} from "@/actions/other-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import {
	PatientLogReviewClient,
	type PatientLogSubmission,
} from "@/components/shared/PatientLogReviewClient";
import { SKILL_LEVEL_LABELS_SOAPI } from "@/lib/constants/other-logs-fields";
import { ConsentBadNewsReviewTabs } from "./ConsentBadNewsReviewTabs";

export default async function FacultyConsentBadNewsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawConsent, rawBadNews, autoReviewSettings] = await Promise.all([
		getConsentLogsForReview(),
		getBadNewsLogsForReview(),
		getAutoReviewSettings(),
	]);

	const consentSubmissions: PatientLogSubmission[] = JSON.parse(
		JSON.stringify(rawConsent),
	);
	const badNewsSubmissions: PatientLogSubmission[] = JSON.parse(
		JSON.stringify(rawBadNews),
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Consent & Bad News — Review"
				description={
					authResult.role === "hod" ?
						"Review all consent and breaking bad news log submissions"
					:	"Review consent and bad news log submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Consent & Bad News" },
				]}
			/>
			<ConsentBadNewsReviewTabs
				consentSubmissions={consentSubmissions}
				badNewsSubmissions={badNewsSubmissions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewConsent={autoReviewSettings.consentLogs}
				autoReviewBadNews={autoReviewSettings.badNewsLogs}
			/>
		</div>
	);
}
