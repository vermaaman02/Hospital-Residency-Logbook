/**
 * @module HOD Attendance Page
 * @description Comprehensive HOD attendance management with four tabs:
 * Overview (student summaries), Review (sign/reject daily entries), Holidays, Config.
 *
 * @see HodAttendanceClient.tsx — main client component
 * @see actions/attendance.ts — all HOD attendance server actions
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getAllAttendanceConfigs,
	getHolidays,
	getDailyEntriesForReview,
	getBatchAttendanceSummary,
} from "@/actions/attendance";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { getAllBatches } from "@/actions/batch-management";
import { HodAttendanceClient } from "./HodAttendanceClient";

export default async function HodAttendancePage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [
		rawBatches,
		rawConfigs,
		rawHolidays,
		rawEntries,
		rawSummaries,
		autoReview,
	] = await Promise.all([
		getAllBatches(),
		getAllAttendanceConfigs(),
		getHolidays(),
		getDailyEntriesForReview({ page: 1, pageSize: 20 }),
		getBatchAttendanceSummary(),
		getAutoReviewSettings(),
	]);

	// Serialize to plain objects for client component
	const batches = JSON.parse(JSON.stringify(rawBatches));
	const configs = JSON.parse(JSON.stringify(rawConfigs));
	const holidays = JSON.parse(JSON.stringify(rawHolidays));
	const entries = JSON.parse(JSON.stringify(rawEntries));
	const summaries = JSON.parse(JSON.stringify(rawSummaries));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance Management"
				description="Overview, review daily entries, manage holidays, and configure attendance settings"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Attendance" },
				]}
			/>
			<HodAttendanceClient
				batches={batches}
				configs={configs}
				holidays={holidays}
				studentSummaries={summaries}
				initialEntries={entries}
				autoReviewSettings={autoReview}
			/>
		</div>
	);
}
