/**
 * @module HODAssignmentsPage
 * @description HOD page for managing faculty-student assignments.
 * View current assignments and create/remove them.
 *
 * @see copilot-instructions.md — Section 8
 * @see roadmap.md — Section 11
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodAssignmentsClient } from "./HodAssignmentsClient";

export default async function HODAssignmentsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	let serializedAssignments: {
		id: string;
		semester: number;
		createdAt: string;
		faculty: { id: string; name: string; email: string };
		student: {
			id: string;
			name: string;
			email: string;
			batch: string | null;
			currentSemester: number | null;
		};
	}[] = [];
	let facultyOptions: { id: string; name: string }[] = [];
	let studentOptions: {
		id: string;
		name: string;
		currentSemester: number | null;
	}[] = [];
	let fetchError = false;

	try {
		// Get all assignments with faculty and student details
		const assignments = await prisma.facultyStudentAssignment.findMany({
			include: {
				faculty: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				student: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						batch: true,
						currentSemester: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Get all faculty and students for the create form
		const facultyList = await prisma.user.findMany({
			where: { role: "FACULTY" as never },
			select: { id: true, firstName: true, lastName: true },
			orderBy: { firstName: "asc" },
		});

		const studentList = await prisma.user.findMany({
			where: { role: "STUDENT" as never },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				currentSemester: true,
			},
			orderBy: { firstName: "asc" },
		});

		serializedAssignments = assignments.map((a) => ({
			id: a.id,
			semester: a.semester,
			createdAt: a.createdAt.toISOString(),
			faculty: {
				id: a.faculty.id,
				name: `${a.faculty.firstName} ${a.faculty.lastName}`,
				email: a.faculty.email,
			},
			student: {
				id: a.student.id,
				name: `${a.student.firstName} ${a.student.lastName}`,
				email: a.student.email,
				batch: a.student.batch,
				currentSemester: a.student.currentSemester,
			},
		}));

		facultyOptions = facultyList.map((f) => ({
			id: f.id,
			name: `${f.firstName} ${f.lastName}`,
		}));

		studentOptions = studentList.map((s) => ({
			id: s.id,
			name: `${s.firstName} ${s.lastName}`,
			currentSemester: s.currentSemester,
		}));
	} catch (error) {
		console.error("[ASSIGNMENTS_FETCH]", error);
		fetchError = true;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Faculty-Student Assignments"
				description="Manage which faculty members are assigned to supervise which students"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Assignments" },
				]}
			/>
			{fetchError ?
				<div className="border rounded-lg p-8 text-center space-y-2">
					<p className="text-muted-foreground">
						Failed to load assignments. Please try again.
					</p>
				</div>
			:	<HodAssignmentsClient
					assignments={serializedAssignments}
					facultyOptions={facultyOptions}
					studentOptions={studentOptions}
				/>
			}
		</div>
	);
}
