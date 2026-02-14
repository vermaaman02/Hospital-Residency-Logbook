/**
 * @module EditResearchActivityPage
 * @description Edit an existing research activity entry (H3).
 *
 * @see PG Logbook .md — "Other Research/Teaching/Community Outreach Activity"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyResearchActivityEntry,
	updateResearchActivity,
} from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	RESEARCH_ACTIVITY_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

interface EditResearchPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditResearchPage({
	params,
}: EditResearchPageProps) {
	const { id } = await params;
	const entry = await getMyResearchActivityEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED") redirect("/dashboard/student/research");

	const H3 = PROFESSIONAL_CATEGORIES.RESEARCH;

	const initialData: Record<string, unknown> = {
		date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
		activity: entry.activity ?? "",
		conductedAt: entry.conductedAt ?? "",
		participationRole: entry.participationRole ?? "",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/research">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Research Activity</h1>
					<p className="text-muted-foreground">{H3.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="research"
				fields={RESEARCH_ACTIVITY_FIELDS}
				title="Research Activity"
				description={H3.label}
				redirectPath="/dashboard/student/research"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateResearchActivity as never}
			/>
		</div>
	);
}
