/**
 * @module NewConferenceParticipationPage
 * @description Create a new Conference / Academic Activity entry (H2).
 *
 * @see PG Logbook .md — "Conference and Other Academic Activity Participation"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createConferenceParticipation } from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	CONFERENCE_PARTICIPATION_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

export default function NewConferencePage() {
	const H2 = PROFESSIONAL_CATEGORIES.CONFERENCES;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/courses-conferences">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Conference Entry</h1>
					<p className="text-muted-foreground">{H2.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="conference"
				fields={CONFERENCE_PARTICIPATION_FIELDS}
				title="Conference Entry"
				description={H2.label}
				redirectPath="/dashboard/student/courses-conferences"
				onCreateAction={createConferenceParticipation as never}
			/>
		</div>
	);
}
