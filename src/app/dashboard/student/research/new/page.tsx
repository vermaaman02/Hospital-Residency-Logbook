/**
 * @module NewResearchActivityPage
 * @description Create a new Research/Teaching/Community activity entry (H3).
 *
 * @see PG Logbook .md — "Other Research/Teaching/Community Outreach Activity"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createResearchActivity } from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	RESEARCH_ACTIVITY_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

export default function NewResearchPage() {
	const H3 = PROFESSIONAL_CATEGORIES.RESEARCH;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/research">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Research Activity</h1>
					<p className="text-muted-foreground">{H3.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="research"
				fields={RESEARCH_ACTIVITY_FIELDS}
				title="Research Activity"
				description={H3.label}
				redirectPath="/dashboard/student/research"
				onCreateAction={createResearchActivity as never}
			/>
		</div>
	);
}
