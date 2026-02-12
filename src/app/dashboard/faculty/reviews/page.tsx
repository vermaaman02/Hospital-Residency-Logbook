/**
 * @module FacultyReviewsPage
 * @description Faculty page to review submitted entries from assigned students.
 * Shows pending sign-offs across rotation postings and other modules.
 *
 * @see roadmap.md — Phase 2: Faculty-student assignment
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacultyReviewsClient } from "./FacultyReviewsClient";

export default async function FacultyReviewsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	// Get assigned students
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: authResult.userId },
		select: { studentId: true },
	});
	const studentIds = assignments.map((a) => a.studentId);

	// Get pending rotation postings from assigned students
	const pendingRotations = await prisma.rotationPosting.findMany({
		where: {
			userId: { in: studentIds },
			status: "SUBMITTED",
		},
		include: {
			user: {
				select: { firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	// Get pending attendance sheets from all students (HOD signs these)
	const pendingAttendance =
		authResult.role === "hod" ?
			await prisma.attendanceSheet.findMany({
				where: { status: "SUBMITTED" },
				include: {
					user: {
						select: { firstName: true, lastName: true, email: true },
					},
					entries: true,
				},
				orderBy: { createdAt: "desc" },
			})
		:	[];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Review Submissions"
				description="Sign off or request revision on student submissions"
				breadcrumbs={[
					{
						label: "Dashboard",
						href: `/dashboard/${authResult.role === "hod" ? "hod" : "faculty"}`,
					},
					{ label: "Reviews" },
				]}
			/>
			<FacultyReviewsClient
				pendingRotations={pendingRotations}
				pendingAttendance={pendingAttendance}
				isHod={authResult.role === "hod"}
			/>
		</div>
	);
}
