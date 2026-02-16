/**
 * @module Faculty Procedure Logs Review Page
 * @description Faculty/HOD review page for student procedure log submissions.
 * Dedicated page with category filter, search, bulk actions, detail sheet, and export.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProcedureLogsForReview } from "@/actions/procedure-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ProcedureLogsReviewClient } from "./ProcedureLogsReviewClient";

export default async function FacultyProceduresPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSubmissions, autoReviewSettings] = await Promise.all([
		getProcedureLogsForReview(),
		getAutoReviewSettings(),
	]);

	const submissions = JSON.parse(JSON.stringify(rawSubmissions));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Procedure Logs — Review"
				description={
					authResult.role === "hod" ?
						"Review all student procedure log submissions across 49 categories"
					:	"Review procedure log submissions from your assigned students"
				}
				breadcrumbs={[
					{
						label: "Dashboard",
						href:
							authResult.role === "hod" ?
								"/dashboard/hod"
							:	"/dashboard/faculty",
					},
					{ label: "Procedures" },
				]}
			/>
			<ProcedureLogsReviewClient
				submissions={submissions}
				role={authResult.role as "faculty" | "hod"}
				autoReviewEnabled={autoReviewSettings.procedureLogs}
			/>
		</div>
	);
}
