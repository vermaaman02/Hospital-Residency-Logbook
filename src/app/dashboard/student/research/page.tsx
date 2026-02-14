/**
 * @module ResearchLandingPage
 * @description Landing page for H3 — Research/Teaching/Community Activity.
 *
 * @see PG Logbook .md — "Other Research/Team Building/Teaching & Training/Community Outreach"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import {
	getMyResearchActivities,
	submitResearchActivity,
	deleteResearchActivity,
} from "@/actions/courses-conferences";
import { ProfessionalEntryTable } from "@/components/tables/ProfessionalEntryTable";
import { PROFESSIONAL_CATEGORIES } from "@/lib/constants/professional-fields";

async function ResearchContent() {
	const entries = await getMyResearchActivities();
	const serialized = JSON.parse(JSON.stringify(entries));
	const H3 = PROFESSIONAL_CATEGORIES.RESEARCH;

	return (
		<ProfessionalEntryTable
			entries={serialized}
			title={H3.shortLabel}
			description={H3.label}
			code={H3.code}
			maxEntries={H3.maxEntries}
			columns={[
				{ key: "activity", label: "Activity" },
				{ key: "conductedAt", label: "Conducted@", className: "w-36" },
				{ key: "participationRole", label: "Role", className: "w-28" },
			]}
			newEntryHref="/dashboard/student/research/new"
			editHrefPrefix="/dashboard/student/research"
			onSubmit={submitResearchActivity as never}
			onDelete={deleteResearchActivity as never}
		/>
	);
}

export default function ResearchPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<BookOpen className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Research & Teaching</h1>
						<p className="text-muted-foreground">
							Research, team building, teaching & training, community outreach
						</p>
					</div>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="animate-pulse border rounded-lg p-6">
						<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
						<div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
					</div>
				}
			>
				<ResearchContent />
			</Suspense>
		</div>
	);
}
