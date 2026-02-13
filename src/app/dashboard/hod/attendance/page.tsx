/**
 * @module HODAttendancePage
 * @description HOD view of department-wide attendance for all students.
 *
 * @see copilot-instructions.md — Section 8
 * @see roadmap.md — Section 11
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodAttendanceClient } from "./HodAttendanceClient";

export default async function HODAttendancePage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	// Get all attendance sheets with student info
	const sheets = await prisma.attendanceSheet.findMany({
		include: {
			user: {
				select: {
					firstName: true,
					lastName: true,
					batch: true,
					currentSemester: true,
				},
			},
			entries: {
				select: { presentAbsent: true },
			},
		},
		orderBy: { createdAt: "desc" },
		take: 200,
	});

	const serializedSheets = sheets.map((s) => {
		const totalDays = s.entries.length;
		const presentDays = s.entries.filter(
			(e) => e.presentAbsent?.toLowerCase() === "present",
		).length;
		const absentDays = s.entries.filter(
			(e) => e.presentAbsent?.toLowerCase() === "absent",
		).length;

		return {
			id: s.id,
			studentName: `${s.user.firstName} ${s.user.lastName}`,
			batch: s.user.batch ?? s.batch,
			currentSemester: s.user.currentSemester,
			weekStart: s.weekStartDate.toISOString().split("T")[0],
			weekEnd: s.weekEndDate.toISOString().split("T")[0],
			postedDepartment: s.postedDepartment,
			totalDays,
			presentDays,
			absentDays,
			otherDays: totalDays - presentDays - absentDays,
			attendancePercentage:
				totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
			status: s.status as string,
		};
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Department Attendance"
				description="View attendance records for all students in the department"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Attendance" },
				]}
			/>
			<HodAttendanceClient sheets={serializedSheets} />
		</div>
	);
}
