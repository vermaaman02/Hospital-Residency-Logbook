/**
 * @module Student Attendance Page
 * @description Weekly attendance tracking with inline cell editing.
 * Matches physical logbook "Attendance Sheet for Clinical Posting (MD Emergency Medicine)".
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 */

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceClient } from "./AttendanceClient";
import { getMyAttendanceAnalytics } from "@/actions/attendance";

export default async function StudentAttendancePage() {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) redirect("/sign-in");

	const [sheets, facultyUsers, analytics] = await Promise.all([
		prisma.attendanceSheet.findMany({
			where: { userId: user.id },
			include: { entries: { orderBy: { day: "asc" } } },
			orderBy: { weekStartDate: "desc" },
		}),
		prisma.user.findMany({
			where: {
				role: { in: ["HOD", "FACULTY"] },
				status: "ACTIVE",
			},
			select: { firstName: true, lastName: true },
			orderBy: { firstName: "asc" },
		}),
		getMyAttendanceAnalytics(),
	]);

	const serialized = JSON.parse(JSON.stringify(sheets));
	const facultyNames = facultyUsers.map((u) => `${u.firstName} ${u.lastName}`);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance Sheet for Clinical Posting"
				description="Weekly attendance log — MD Emergency Medicine"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Attendance" },
				]}
			/>
			<AttendanceClient
				sheets={serialized}
				userBatch={user.batch ?? ""}
				facultyNames={facultyNames}
				analytics={analytics}
			/>
		</div>
	);
}
