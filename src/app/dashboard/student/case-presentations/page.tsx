/**
 * @module CasePresentationsPage
 * @description Student view: tabbed page for Academic Case Presentations
 * and Seminar/Evidence Based Discussion entries. Both share the same
 * column structure. Each tab has its own inline-editing table.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION" (20 entries)
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED" (10 entries)
 */

import { requireAuth } from "@/lib/auth";
import {
	getMyCasePresentations,
	getAvailableFaculty,
} from "@/actions/case-presentations";
import { getMySeminarDiscussions } from "@/actions/seminar-discussions";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentAcademicTabs } from "./StudentAcademicTabs";

export default async function CasePresentationsPage() {
	await requireAuth();
	const [casePresentations, seminarDiscussions, facultyList] =
		await Promise.all([
			getMyCasePresentations(),
			getMySeminarDiscussions(),
			getAvailableFaculty(),
		]);

	// Serialize dates for client
	const serializedCP = JSON.parse(JSON.stringify(casePresentations));
	const serializedSD = JSON.parse(JSON.stringify(seminarDiscussions));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Academic Case Presentations & Seminars"
				description="Case Presentation, Discussion & Seminar/Evidence Based Discussion"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Case Presentations & Seminars" },
				]}
			/>
			<StudentAcademicTabs
				casePresentations={serializedCP}
				seminarDiscussions={serializedSD}
				facultyList={facultyList}
			/>
		</div>
	);
}
