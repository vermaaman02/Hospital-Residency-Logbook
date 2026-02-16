/**
 * @module HODFacultyPage
 * @description HOD view of all faculty members with workload metrics,
 * student assignments, signature activity, and professional management UI.
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

	const [faculty, totalStudents] = await Promise.all([
		prisma.user.findMany({
			where: { role: "FACULTY" as never },
			select: {
				id: true,
				clerkId: true,
				firstName: true,
				lastName: true,
				email: true,
				profileImage: true,
				department: true,
				status: true,
				createdAt: true,
				assignedStudents: {
					include: {
						student: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								currentSemester: true,
								batch: true,
								status: true,
							},
						},
					},
				},
				signedEntries: {
					select: { id: true, signedAt: true },
				},
			},
			orderBy: { firstName: "asc" },
		}),
		prisma.user.count({ where: { role: "STUDENT" as never } }),
	]);

	// Count faculty remarks across log tables — separate queries
	const facultyIds = faculty.map((f) => f.clerkId);
	const [caseRemarks, procRemarks] = await Promise.all([
		prisma.caseManagementLog.groupBy({
			by: ["facultyId"],
			where: {
				facultyId: { in: facultyIds },
				facultyRemark: { not: null },
			},
			_count: true,
		}),
		prisma.procedureLog.groupBy({
			by: ["facultyId"],
			where: {
				facultyId: { in: facultyIds },
				facultyRemark: { not: null },
			},
			_count: true,
		}),
	]);

	const remarksByFaculty = new Map<string, number>();
	for (const r of caseRemarks) {
		if (r.facultyId)
			remarksByFaculty.set(
				r.facultyId,
				(remarksByFaculty.get(r.facultyId) ?? 0) + r._count,
			);
	}
	for (const r of procRemarks) {
		if (r.facultyId)
			remarksByFaculty.set(
				r.facultyId,
				(remarksByFaculty.get(r.facultyId) ?? 0) + r._count,
			);
	}

	const serializedFaculty = faculty.map((f) => {
		// Recent signing activity (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const recentSignatures = f.signedEntries.filter(
			(e) => e.signedAt && new Date(e.signedAt) > thirtyDaysAgo,
		).length;
		const totalRemarks = remarksByFaculty.get(f.clerkId) ?? 0;

		return {
			id: f.id,
			clerkId: f.clerkId,
			firstName: f.firstName,
			lastName: f.lastName,
			email: f.email,
			profileImage: f.profileImage,
			department: f.department,
			status: f.status as string,
			joinedAt: f.createdAt.toISOString(),
			studentCount: f.assignedStudents.length,
			signatureCount: f.signedEntries.length,
			recentSignatures,
			totalRemarks,
			students: f.assignedStudents.map((a) => ({
				id: a.student.id,
				name: `${a.student.firstName} ${a.student.lastName}`,
				semester: a.student.currentSemester ?? a.semester,
				batch: a.student.batch,
				status: a.student.status as string,
			})),
		};
	});

	const stats = {
		totalFaculty: faculty.length,
		totalStudents,
		totalSignatures: serializedFaculty.reduce(
			(a, f) => a + f.signatureCount,
			0,
		),
		avgStudentsPerFaculty:
			faculty.length > 0 ?
				Math.round(
					serializedFaculty.reduce((a, f) => a + f.studentCount, 0) /
						faculty.length,
				)
			:	0,
		unassignedStudents:
			totalStudents -
			new Set(serializedFaculty.flatMap((f) => f.students.map((s) => s.id)))
				.size,
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<PageHeader
				title="Faculty Management"
				description="Manage faculty members, monitor workload, and track student assignments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Faculty" },
				]}
			/>
			<HodFacultyClient faculty={serializedFaculty} stats={stats} />
		</div>
	);
}
