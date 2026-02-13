/**
 * @module NewQualityImprovementPage
 * @description Create a new quality improvement / patient safety entry (H5).
 *
 * @see PG Logbook .md — "QI / Patient Safety Initiative / Clinical Audit"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createQualityImprovement } from "@/actions/disaster-qi";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	QUALITY_IMPROVEMENT_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

export default function NewQiPage() {
	const H5 = PROFESSIONAL_CATEGORIES.QI;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/disaster-qi">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New QI Entry</h1>
					<p className="text-muted-foreground">{H5.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="qi"
				fields={QUALITY_IMPROVEMENT_FIELDS}
				title="Quality Improvement"
				description={H5.label}
				redirectPath="/dashboard/student/disaster-qi"
				onCreateAction={createQualityImprovement as never}
			/>
		</div>
	);
}
