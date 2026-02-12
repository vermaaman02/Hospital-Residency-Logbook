/**
 * @module NewAttendancePage
 * @description Form page to create a new weekly attendance sheet.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 */

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceSheetForm } from "./AttendanceSheetForm";

export default async function NewAttendancePage() {
	try {
		await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Attendance Sheet"
				description="Log weekly attendance for Clinical Posting (MD Emergency Medicine)"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Attendance", href: "/dashboard/student/attendance" },
					{ label: "New Week" },
				]}
			/>
			<AttendanceSheetForm />
		</div>
	);
}
