/**
 * @module CasePresentationsPage
 * @description Student view: inline-editing table for Academic Case Presentation
 * and Discussion entries. Fetches entries + faculty list on server, renders
 * client-side CasePresentationTable for inline editing.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION" (20 entries)
 */

import { requireAuth } from "@/lib/auth";
import {
	getMyCasePresentations,
	getAvailableFaculty,
} from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { CasePresentationTable } from "./CasePresentationTable";

export default async function CasePresentationsPage() {
	await requireAuth();
	const [entries, facultyList] = await Promise.all([
		getMyCasePresentations(),
		getAvailableFaculty(),
	]);

	// Serialize dates for client
	const serialized = JSON.parse(JSON.stringify(entries));

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
			<CasePresentationTable entries={serialized} facultyList={facultyList} />
		</div>
	);
}
