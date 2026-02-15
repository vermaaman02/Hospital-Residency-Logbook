/**
 * @module DiagnosticCategoryPage
 * @description List page for diagnostic skill entries in a specific category.
 * Resolves slug → enum value, fetches entries, renders DiagnosticSkillTable.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getDiagnosticBySlug } from "@/lib/constants/diagnostic-types";
import {
	getMyDiagnosticSkillEntries,
	submitDiagnosticSkillEntry,
	deleteDiagnosticSkillEntry,
} from "@/actions/diagnostic-skills";
// import { DiagnosticSkillTable } from "@/components/tables/DiagnosticSkillTable";

interface DiagnosticCategoryPageProps {
	params: Promise<{ category: string }>;
}

export default async function DiagnosticCategoryPage({
	params,
}: DiagnosticCategoryPageProps) {
	const { category: slug } = await params;
	const categoryInfo = getDiagnosticBySlug(slug);

	if (!categoryInfo) return notFound();

	const rawEntries = await getMyDiagnosticSkillEntries(categoryInfo.enumValue);
	const entries = JSON.parse(JSON.stringify(rawEntries));

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/diagnostics">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">{categoryInfo.label}</h1>
					<p className="text-muted-foreground">
						Track your diagnostic skill entries and confidence levels
					</p>
				</div>
			</div>

			{/* <DiagnosticSkillTable
				entries={entries}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				totalSkills={categoryInfo.skills.length}
				onSubmit={submitDiagnosticSkillEntry as never}
				onDelete={deleteDiagnosticSkillEntry as never}
			/> */}
		</div>
	);
}
