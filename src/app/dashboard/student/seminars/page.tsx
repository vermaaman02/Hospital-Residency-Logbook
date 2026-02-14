/**
 * @module Seminars List Page
 * @description Student view: list all seminar entries with progress tracking.
 *
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED" (10 entries)
 */

import { requireAuth } from "@/lib/auth";
import { getMySeminars } from "@/actions/seminars";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeminarList } from "./SeminarList";

export default async function SeminarsPage() {
	await requireAuth();
	const entries = await getMySeminars();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Seminars"
				description="Seminar/Evidence Based Discussion Presented — Target: 10 entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Seminars" },
				]}
			/>
			<SeminarList entries={entries} />
		</div>
	);
}
