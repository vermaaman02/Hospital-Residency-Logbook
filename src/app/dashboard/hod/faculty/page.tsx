/**
 * @module HODFacultyPage
 * @description HOD view of all faculty members with their student assignments and workload.
 *
 * @see copilot-instructions.md — Section 8
 * @see roadmap.md — Section 11
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodFacultyClient } from "./HodFacultyClient";

export default async function HODFacultyPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const faculty = await prisma.user.findMany({
		where: { role: "FACULTY" as never },
		select: {
			id: true,
			clerkId: true,
			firstName: true,
			lastName: true,
			email: true,
			profileImage: true,
			createdAt: true,
			assignedStudents: {
				include: {
					student: {
						select: {
							firstName: true,
							lastName: true,
							currentSemester: true,
							batch: true,
						},
					},
				},
			},
			signedEntries: {
				select: { id: true },
			},
		},
		orderBy: { firstName: "asc" },
	});

	const serializedFaculty = faculty.map((f) => ({
		id: f.id,
		clerkId: f.clerkId,
		firstName: f.firstName,
		lastName: f.lastName,
		email: f.email,
		profileImage: f.profileImage,
		joinedAt: f.createdAt.toISOString(),
		studentCount: f.assignedStudents.length,
		signatureCount: f.signedEntries.length,
		students: f.assignedStudents.map((a) => ({
			name: `${a.student.firstName} ${a.student.lastName}`,
			semester: a.student.currentSemester ?? a.semester,
			batch: a.student.batch,
		})),
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Faculty"
				description="View all faculty members and their student assignments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Faculty" },
				]}
			/>
			<HodFacultyClient faculty={serializedFaculty} />
		</div>
	);
}
