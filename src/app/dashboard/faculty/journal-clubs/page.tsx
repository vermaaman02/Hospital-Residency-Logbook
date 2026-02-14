/**
 * @module Faculty Journal Clubs Review Page
 * @description Faculty/HOD review page for student journal club submissions.
 * Dedicated page with search, filter, bulk actions, detail sheet, and export.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getJournalClubsForReview } from "@/actions/journal-clubs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { JournalClubReviewClient } from "./JournalClubReviewClient";

export default async function FacultyJournalClubsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
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
				description={
					authResult.role === "hod" ?
						"Review all student journal club submissions"
					:	"Review journal club submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Journal Clubs" },
				]}
			/>
			<JournalClubReviewClient
				submissions={entries}
				role={authResult.role as "faculty" | "hod"}
				autoReviewEnabled={autoReviewSettings.journalClubs}
			/>
		</div>
	);
}
