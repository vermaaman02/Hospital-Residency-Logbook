/**
 * @module Faculty Attendance Review Page
 * @description Server component that fetches attendance data for review.
 * Uses server-side pagination from getAttendanceForReview.
 *
 * @see actions/attendance.ts — getAttendanceForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAttendanceForReview } from "@/actions/attendance";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { AttendanceReviewClient } from "./AttendanceReviewClient";

export default async function FacultyAttendancePage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSheets, autoReviewSettings] = await Promise.all([
		getAttendanceForReview({ page: 1, pageSize: 15 }),
		getAutoReviewSettings(),
	]);

	const sheets = JSON.parse(JSON.stringify(rawSheets));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance — Review"
				description={
					authResult.role === "hod" ?
						"Review all student attendance sheets"
					:	"Review attendance sheets from your assigned students"
				}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/faculty" },
					{ label: "Attendance" },
				]}
			/>
			<AttendanceReviewClient
				sheets={sheets}
				role={authResult.role as "faculty" | "hod"}
				autoReviewSettings={autoReviewSettings}
			/>
		</div>
	);
}
