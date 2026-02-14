/**
 * @module EditQualityImprovementPage
 * @description Edit an existing quality improvement entry (H5).
 *
 * @see PG Logbook .md — "QI / Patient Safety Initiative / Clinical Audit"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyQualityImprovementEntry,
	updateQualityImprovement,
} from "@/actions/disaster-qi";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	QUALITY_IMPROVEMENT_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

interface EditQiPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditQiPage({ params }: EditQiPageProps) {
	const { id } = await params;
	const entry = await getMyQualityImprovementEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED") redirect("/dashboard/student/disaster-qi");

	const H5 = PROFESSIONAL_CATEGORIES.QI;

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
					<h1 className="text-2xl font-bold">Edit QI Entry</h1>
					<p className="text-muted-foreground">{H5.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="qi"
				fields={QUALITY_IMPROVEMENT_FIELDS}
				title="Quality Improvement"
				description={H5.label}
				redirectPath="/dashboard/student/disaster-qi"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateQualityImprovement as never}
			/>
		</div>
	);
}
