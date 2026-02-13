/**
 * @module EditConferenceParticipationPage
 * @description Edit an existing conference entry (H2).
 *
 * @see PG Logbook .md — "Conference and Other Academic Activity Participation"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyConferenceParticipationEntry,
	updateConferenceParticipation,
} from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	CONFERENCE_PARTICIPATION_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

interface EditConferencePageProps {
	params: Promise<{ id: string }>;
}

export default async function EditConferencePage({
	params,
}: EditConferencePageProps) {
	const { id } = await params;
	const entry = await getMyConferenceParticipationEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED")
		redirect("/dashboard/student/courses-conferences");

	const H2 = PROFESSIONAL_CATEGORIES.CONFERENCES;

	const initialData: Record<string, unknown> = {
		date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
		conferenceName: entry.conferenceName ?? "",
		conductedAt: entry.conductedAt ?? "",
		participationRole: entry.participationRole ?? "",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/courses-conferences">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Conference Entry</h1>
					<p className="text-muted-foreground">{H2.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="conference"
				fields={CONFERENCE_PARTICIPATION_FIELDS}
				title="Conference Entry"
				description={H2.label}
				redirectPath="/dashboard/student/courses-conferences"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateConferenceParticipation as never}
			/>
		</div>
	);
}
