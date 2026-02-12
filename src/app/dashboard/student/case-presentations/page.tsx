/**
 * @module Case Presentations List Page
 * @description Student view: list all case presentation entries with progress tracking.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION" (20 entries)
 */

import { requireAuth } from "@/lib/auth";
import { getMyCasePresentations } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { CasePresentationList } from "./CasePresentationList";

export default async function CasePresentationsPage() {
	await requireAuth();
	const entries = await getMyCasePresentations();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Academic Case Presentations"
				description="Case Presentation and Discussion — Target: 20 entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Case Presentations" },
				]}
			/>
			<CasePresentationList entries={entries} />
		</div>
	);
}
