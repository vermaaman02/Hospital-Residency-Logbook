/**
 * @module JournalClubList
 * @description Client component wrapping AcademicEntryTable for journal clubs.
 */

"use client";

import { AcademicEntryTable } from "@/components/tables/AcademicEntryTable";
import { submitJournalClub, deleteJournalClub } from "@/actions/journal-clubs";

interface JournalClubEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	status: string;
	[key: string]: unknown;
}

interface JournalClubListProps {
	entries: JournalClubEntry[];
}

export function JournalClubList({ entries }: JournalClubListProps) {
	return (
		<AcademicEntryTable
			entries={entries}
			title="Journal Clubs"
			description="Journal Club Presented"
			targetCount={10}
			newEntryHref="/dashboard/student/journal-clubs/new"
			columns={[
				{
					key: "journalArticle",
					label: "Journal Article",
				},
				{
					key: "typeOfStudy",
					label: "Type of Study",
				},
			]}
			onSubmit={submitJournalClub}
			onDelete={deleteJournalClub}
		/>
	);
}
