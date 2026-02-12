/**
 * @module Edit Journal Club Page
 * @description Edit an existing journal club entry.
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalClubForm } from "../../new/JournalClubForm";

interface EditJournalClubPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditJournalClubPage({
	params,
}: EditJournalClubPageProps) {
	const { id } = await params;
	const userId = await requireAuth();

	const entry = await prisma.journalClub.findUnique({
		where: { id },
	});

	if (!entry || entry.userId !== userId) {
		notFound();
	}

	if (entry.status === "SIGNED") {
		notFound();
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Journal Club"
				description={`Editing entry #${entry.slNo}`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Journal Clubs", href: "/dashboard/student/journal-clubs" },
					{ label: "Edit" },
				]}
			/>
			<JournalClubForm initialData={entry} />
		</div>
	);
}
