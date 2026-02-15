/**
 * @module HOD Consent & Bad News Review Page
 * @description HOD-only view for reviewing all consent and bad news log submissions.
 * Reuses ConsentBadNewsReviewTabs from faculty folder.
 *
 * @see PG Logbook .md — "CONSENT" and "BREAKING BAD NEWS"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getConsentLogsForReview,
	getBadNewsLogsForReview,
} from "@/actions/other-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import type { PatientLogSubmission } from "@/components/shared/PatientLogReviewClient";
import { ConsentBadNewsReviewTabs } from "../../faculty/consent-bad-news/ConsentBadNewsReviewTabs";

export default async function HodConsentBadNewsPage() {
	try {
		await requireRole(["hod"]);
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
				description="Review all consent and breaking bad news log submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Consent & Bad News" },
				]}
			/>
			<ConsentBadNewsReviewTabs
				consentSubmissions={consentSubmissions}
				badNewsSubmissions={badNewsSubmissions}
				role="hod"
				autoReviewConsent={autoReviewSettings.consentLogs}
				autoReviewBadNews={autoReviewSettings.badNewsLogs}
			/>
		</div>
	);
}
