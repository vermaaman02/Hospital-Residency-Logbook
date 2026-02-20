/**
 * @module Faculty Student Attendance Detail Page
 * @description Full-page view of a student's attendance for faculty.
 * Reuses the same client component as HOD.
 *
 * @see actions/attendance.ts — getStudentAttendanceAnalytics()
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentAttendanceAnalytics } from "@/actions/attendance";
import { StudentAttendanceDetailClient } from "@/app/dashboard/hod/attendance/student/[studentId]/StudentAttendanceDetailClient";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyStudentAttendanceDetailPage({
	params,
}: PageProps) {
	await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	const analytics = await getStudentAttendanceAnalytics(studentId);

	const holidays = await prisma.attendanceHoliday.findMany({
		where: {
			OR: [
				{ batchId: null },
				...(analytics.student.batchId ?
					[{ batchId: analytics.student.batchId }]
				:	[]),
			],
		},
		orderBy: { date: "desc" },
		take: 50,
	});

	const serializedAnalytics = JSON.parse(JSON.stringify(analytics));
	const serializedHolidays = JSON.parse(JSON.stringify(holidays));

	return (
		<StudentAttendanceDetailClient
			analytics={serializedAnalytics}
			holidays={serializedHolidays}
		/>
	);
}
