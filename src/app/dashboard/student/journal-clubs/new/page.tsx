/**
 * @module New Journal Club Page
 * @description Page for creating a new journal club entry.
 */

import { requireAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalClubForm } from "./JournalClubForm";

export default async function NewJournalClubPage() {
	await requireAuth();

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Journal Club Entry"
				description="Add a new journal club entry"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Journal Clubs", href: "/dashboard/student/journal-clubs" },
					{ label: "New" },
				]}
			/>
			<JournalClubForm />
		</div>
	);
}
