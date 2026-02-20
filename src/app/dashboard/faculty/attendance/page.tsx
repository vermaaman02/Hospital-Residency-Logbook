/**
 * @module Faculty Attendance Review Page
 * @description Server component that fetches daily attendance entries for review.
 * Uses server-side pagination from getDailyEntriesForReview.
 *
 * @see actions/attendance.ts — getDailyEntriesForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDailyEntriesForReview } from "@/actions/attendance";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { AttendanceReviewClient } from "./AttendanceReviewClient";

export default async function FacultyAttendancePage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawEntries, autoReviewSettings] = await Promise.all([
		getDailyEntriesForReview({ page: 1, pageSize: 20 }),
		getAutoReviewSettings(),
	]);

	const entries = JSON.parse(JSON.stringify(rawEntries));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance — Review"
				description={
					authResult.role === "hod" ?
						"Review all student daily attendance entries"
					:	"Review daily attendance entries from your assigned students"
				}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{ label: "Attendance" },
				]}
			/>
			<AttendanceReviewClient
				entries={entries}
				role={authResult.role as "faculty" | "hod"}
				autoReviewSettings={autoReviewSettings}
			/>
		</div>
	);
}
