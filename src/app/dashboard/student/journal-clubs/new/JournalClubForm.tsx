/**
 * @module JournalClubForm
 * @description Client form for creating/editing journal club entries.
 */

"use client";

import { AcademicEntryForm } from "@/components/forms/AcademicEntryForm";
import { journalClubSchema } from "@/lib/validators/academics";
import { journalClubFields } from "@/lib/constants/academic-fields";
import { createJournalClub, updateJournalClub } from "@/actions/journal-clubs";

interface JournalClubFormProps {
	initialData?: {
		id: string;
		date: Date | string | null;
		journalArticle: string | null;
		typeOfStudy: string | null;
	};
}

export function JournalClubForm({ initialData }: JournalClubFormProps) {
	const defaults =
		initialData ?
			{
				date: initialData.date ? new Date(initialData.date) : new Date(),
				journalArticle: initialData.journalArticle ?? "",
				typeOfStudy: initialData.typeOfStudy ?? "",
			}
		:	undefined;

	return (
		<AcademicEntryForm
			schema={journalClubSchema as never}
			fields={journalClubFields}
			title="Journal Club"
			description="Journal Club Presented"
			initialData={defaults as Record<string, unknown> | undefined}
			entryId={initialData?.id}
			onCreateAction={createJournalClub as never}
			onUpdateAction={updateJournalClub as never}
			backHref="/dashboard/student/journal-clubs"
		/>
	);
}
