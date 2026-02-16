/**
 * @module HOD Procedure Logs Review Page
 * @description HOD-only view for reviewing all student procedure log submissions.
 * Reuses ProcedureLogsReviewClient from faculty folder.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProcedureLogsForReview } from "@/actions/procedure-logs";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { ProcedureLogsReviewClient } from "../../faculty/procedures/ProcedureLogsReviewClient";

export default async function HodProceduresPage() {
	try {
		await requireRole(["hod"]);
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
				description="Review all student procedure log submissions across 49 categories"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Procedures" },
				]}
			/>
			<ProcedureLogsReviewClient
				submissions={submissions}
				role="hod"
				autoReviewEnabled={autoReviewSettings.procedureLogs}
			/>
		</div>
	);
}
