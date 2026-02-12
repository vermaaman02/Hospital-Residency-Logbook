/**
 * @module FacultyTrainingMentoringPage
 * @description Faculty view to evaluate assigned students using the 5-point scale.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacultyTrainingForm } from "./FacultyTrainingForm";

export default async function FacultyTrainingMentoringPage() {
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

	// Get student info from our User model
	const students = await prisma.user.findMany({
		where: { id: { in: studentIds } },
		select: {
			id: true,
			clerkId: true,
			firstName: true,
			lastName: true,
			email: true,
		},
	});

	// Get existing training records for all assigned students
	const existingRecords = await prisma.trainingMentoringRecord.findMany({
		where: { userId: { in: studentIds } },
		orderBy: { semester: "asc" },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Training & Mentoring Records"
				description="Evaluate assigned students on a 5-point scale each semester"
				breadcrumbs={[
					{ label: "Dashboard", href: `/dashboard/${authResult.role === "hod" ? "hod" : "faculty"}` },
					{ label: "Training & Mentoring" },
				]}
			/>
			<FacultyTrainingForm students={students} existingRecords={existingRecords} />
		</div>
	);
}
