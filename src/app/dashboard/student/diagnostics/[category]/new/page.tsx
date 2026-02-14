/**
 * @module NewDiagnosticSkillEntryPage
 * @description Create a new diagnostic skill entry.
 * Pre-populates skill name options based on the category.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getDiagnosticBySlug } from "@/lib/constants/diagnostic-types";
import { createDiagnosticSkillEntry } from "@/actions/diagnostic-skills";
import { DiagnosticSkillEntryForm } from "@/components/forms/DiagnosticSkillEntryForm";

interface NewDiagnosticEntryPageProps {
	params: Promise<{ category: string }>;
}

export default async function NewDiagnosticEntryPage({
	params,
}: NewDiagnosticEntryPageProps) {
	const { category: slug } = await params;
	const categoryInfo = getDiagnosticBySlug(slug);

	if (!categoryInfo) return notFound();

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href={`/dashboard/student/diagnostics/${slug}`}>
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Entry</h1>
					<p className="text-muted-foreground">{categoryInfo.label}</p>
				</div>
			</div>

			<DiagnosticSkillEntryForm
				categoryEnum={categoryInfo.enumValue}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				skills={categoryInfo.skills}
				onCreateAction={createDiagnosticSkillEntry as never}
			/>
		</div>
	);
}
