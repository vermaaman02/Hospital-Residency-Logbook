/**
 * @module Journal Clubs Page
 * @description Student view: inline-editing table for Journal Club Discussion /
 * Critical Appraisal of Literature Presented.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
 */

import { requireAuth } from "@/lib/auth";
import {
	getMyJournalClubs,
	getAvailableJournalClubFaculty,
} from "@/actions/journal-clubs";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalClubTable } from "./JournalClubTable";

export default async function JournalClubsPage() {
	await requireAuth();
	const [entries, facultyList] = await Promise.all([
		getMyJournalClubs(),
		getAvailableJournalClubFaculty(),
	]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Journal Clubs"
				description="Journal Club Discussion / Critical Appraisal of Literature Presented — Target: 10 entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Journal Clubs" },
				]}
			/>
			<JournalClubTable entries={entries as never} facultyList={facultyList} />
		</div>
	);
}
