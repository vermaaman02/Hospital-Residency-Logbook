/**
 * @module HOD Student Attendance Detail Page
 * @description Full-page view of a single student's attendance history.
 * Accessible by clicking a student name in the HOD attendance overview.
 *
 * @see actions/attendance.ts — getStudentAttendanceAnalytics()
 * @see PG Logbook .md — Attendance section
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentAttendanceAnalytics } from "@/actions/attendance";
import { StudentAttendanceDetailClient } from "./StudentAttendanceDetailClient";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function StudentAttendanceDetailPage({
	params,
}: PageProps) {
	await requireRole(["hod", "faculty"]);
	const { studentId } = await params;

	const analytics = await getStudentAttendanceAnalytics(studentId);

	// Fetch holidays relevant to this student
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

	// Serialize dates
	const serializedAnalytics = JSON.parse(JSON.stringify(analytics));
	const serializedHolidays = JSON.parse(JSON.stringify(holidays));

	return (
		<StudentAttendanceDetailClient
			analytics={serializedAnalytics}
			holidays={serializedHolidays}
		/>
	);
}
