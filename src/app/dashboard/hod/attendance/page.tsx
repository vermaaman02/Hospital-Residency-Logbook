/**
 * @module HOD Attendance Page
 * @description Reuses faculty AttendanceReviewClient with role="hod".
 * HOD sees all students, gets auto-review toggle.
 *
 * @see faculty/attendance/page.tsx — shared pattern
 * @see actions/attendance.ts — getAttendanceForReview (HOD returns all)
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAttendanceForReview } from "@/actions/attendance";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { AttendanceReviewClient } from "../../faculty/attendance/AttendanceReviewClient";

export default async function HodAttendancePage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const [rawSheets, autoReviewSettings] = await Promise.all([
		getAttendanceForReview(),
		getAutoReviewSettings(),
	]);

	const sheets = JSON.parse(JSON.stringify(rawSheets));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance — Review"
				description="Review all student attendance sheets across all batches"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Attendance" },
				]}
			/>
			<AttendanceReviewClient
				sheets={sheets}
				role="hod"
				autoReviewSettings={autoReviewSettings}
			/>
		</div>
	);
}
