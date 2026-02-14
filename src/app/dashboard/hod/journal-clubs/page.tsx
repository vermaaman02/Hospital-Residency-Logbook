/**
 * @module HOD Journal Clubs Review Page
 * @description HOD-only view for reviewing all student journal club submissions.
 * Reuses JournalClubReviewClient from faculty folder.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getJournalClubsForReview } from "@/actions/journal-clubs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { JournalClubReviewClient } from "../../faculty/journal-clubs/JournalClubReviewClient";

export default async function HodJournalClubsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawEntries, autoReviewSettings] = await Promise.all([
		getJournalClubsForReview(),
		getAutoReviewSettings(),
	]);
	const entries = JSON.parse(JSON.stringify(rawEntries));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Journal Clubs — Review"
				description="Review all student journal club submissions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Journal Clubs" },
				]}
			/>
			<JournalClubReviewClient
				submissions={entries}
				role="hod"
				autoReviewEnabled={autoReviewSettings.journalClubs}
			/>
		</div>
	);
}
