/**
 * @module EditDisasterDrillPage
 * @description Edit an existing disaster drill entry (H4).
 *
 * @see PG Logbook .md — "Major Incident / Disaster Management Drill"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyDisasterDrillEntry,
	updateDisasterDrill,
} from "@/actions/disaster-qi";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	DISASTER_DRILL_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

interface EditDisasterDrillPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditDisasterDrillPage({
	params,
}: EditDisasterDrillPageProps) {
	const { id } = await params;
	const entry = await getMyDisasterDrillEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED") redirect("/dashboard/student/disaster-qi");

	const H4 = PROFESSIONAL_CATEGORIES.DISASTER;

	const initialData: Record<string, unknown> = {
		date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
		description: entry.description ?? "",
		roleInActivity: entry.roleInActivity ?? "",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/disaster-qi">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Disaster Drill</h1>
					<p className="text-muted-foreground">{H4.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="disaster"
				fields={DISASTER_DRILL_FIELDS}
				title="Disaster Drill"
				description={H4.label}
				redirectPath="/dashboard/student/disaster-qi"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateDisasterDrill as never}
			/>
		</div>
	);
}
