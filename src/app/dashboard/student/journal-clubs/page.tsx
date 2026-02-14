/**
 * @module Journal Clubs List Page
 * @description Student view: list all journal club entries with progress tracking.
 *
 * @see PG Logbook .md — "JOURNAL CLUB PRESENTED" (10 entries)
 */

import { requireAuth } from "@/lib/auth";
import { getMyJournalClubs } from "@/actions/journal-clubs";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalClubList } from "./JournalClubList";

export default async function JournalClubsPage() {
	await requireAuth();
	const entries = await getMyJournalClubs();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Journal Clubs"
				description="Journal Club Presented — Target: 10 entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Journal Clubs" },
				]}
			/>
			<JournalClubList entries={entries} />
		</div>
	);
}
