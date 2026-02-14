/**
 * @module NewDisasterDrillPage
 * @description Create a new disaster management drill entry (H4).
 *
 * @see PG Logbook .md — "Major Incident / Disaster Management Drill"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createDisasterDrill } from "@/actions/disaster-qi";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	DISASTER_DRILL_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

export default function NewDisasterDrillPage() {
	const H4 = PROFESSIONAL_CATEGORIES.DISASTER;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/disaster-qi">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Disaster Drill Entry</h1>
					<p className="text-muted-foreground">{H4.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="disaster"
				fields={DISASTER_DRILL_FIELDS}
				title="Disaster Drill"
				description={H4.label}
				redirectPath="/dashboard/student/disaster-qi"
				onCreateAction={createDisasterDrill as never}
			/>
		</div>
	);
}
