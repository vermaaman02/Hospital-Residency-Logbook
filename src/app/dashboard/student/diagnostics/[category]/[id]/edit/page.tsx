/**
 * @module EditDiagnosticSkillEntryPage
 * @description Edit an existing diagnostic skill entry.
 * Pre-populates form with existing data.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getDiagnosticBySlug } from "@/lib/constants/diagnostic-types";
import {
	getMyDiagnosticSkillEntry,
	updateDiagnosticSkillEntry,
} from "@/actions/diagnostic-skills";
import { DiagnosticSkillEntryForm } from "@/components/forms/DiagnosticSkillEntryForm";

interface EditDiagnosticEntryPageProps {
	params: Promise<{ category: string; id: string }>;
}

export default async function EditDiagnosticEntryPage({
	params,
}: EditDiagnosticEntryPageProps) {
	const { category: slug, id } = await params;
	const categoryInfo = getDiagnosticBySlug(slug);

	if (!categoryInfo) return notFound();

	const entry = await getMyDiagnosticSkillEntry(id);
	if (!entry) return notFound();

	if (entry.status === "SIGNED") {
		redirect(`/dashboard/student/diagnostics/${slug}`);
	}

	const initialData: Record<string, unknown> = {
		diagnosticCategory: entry.diagnosticCategory,
		skillName: entry.skillName,
		representativeDiagnosis: entry.representativeDiagnosis ?? "",
		confidenceLevel: entry.confidenceLevel ?? "",
		totalTimesPerformed: entry.totalTimesPerformed ?? 0,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href={`/dashboard/student/diagnostics/${slug}`}>
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Entry</h1>
					<p className="text-muted-foreground">{categoryInfo.label}</p>
				</div>
			</div>

			<DiagnosticSkillEntryForm
				categoryEnum={categoryInfo.enumValue}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				skills={categoryInfo.skills}
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => {}) as never}
				onUpdateAction={updateDiagnosticSkillEntry as never}
			/>
		</div>
	);
}
