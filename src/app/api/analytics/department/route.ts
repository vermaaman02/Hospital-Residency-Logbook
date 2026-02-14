/**
 * @module DepartmentAnalyticsAPI
 * @description GET department-wide analytics (HOD only).
 *
 * @see roadmap.md — Section 8, analytics/department
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as { role?: string })?.role;
		if (role !== "hod") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const students = await prisma.user.findMany({
			where: { role: "STUDENT" as never },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				batch: true,
				currentSemester: true,
			},
			orderBy: [{ batch: "desc" }, { firstName: "asc" }],
		});

		const faculty = await prisma.user.findMany({
			where: { role: "FACULTY" as never },
			select: {
				id: true,
				firstName: true,
				lastName: true,
			},
		});

		// Get counts
		const [
			totalCases,
			totalProcedures,
			totalDiagnostics,
			totalImaging,
			totalEvaluations,
			signedCases,
			signedProcedures,
		] = await Promise.all([
			prisma.caseManagementLog.count(),
			prisma.procedureLog.count(),
			prisma.diagnosticSkill.count(),
			prisma.imagingLog.count(),
			prisma.residentEvaluation.count(),
			prisma.caseManagementLog.count({
				where: { status: "SIGNED" as never },
			}),
			prisma.procedureLog.count({ where: { status: "SIGNED" as never } }),
		]);

		// Per-student summary
		const studentStats = await Promise.all(
			students.map(async (student) => {
				const [cases, procedures, evals] = await Promise.all([
					prisma.caseManagementLog.count({ where: { userId: student.id } }),
					prisma.procedureLog.count({ where: { userId: student.id } }),
					prisma.residentEvaluation.count({
						where: { userId: student.id, status: "SIGNED" as never },
					}),
				]);
				return {
					...student,
					totalCases: cases,
					totalProcedures: procedures,
					signedEvaluations: evals,
					totalLogs: cases + procedures,
				};
			}),
		);

		// Faculty workload
		const facultyWorkload = await Promise.all(
			faculty.map(async (f) => {
				const assignmentCount = await prisma.facultyStudentAssignment.count({
					where: { facultyId: f.id },
				});
				return {
					...f,
					assignedStudents: assignmentCount,
				};
			}),
		);

		return NextResponse.json({
			totalStudents: students.length,
			totalFaculty: faculty.length,
			totalCases,
			totalProcedures,
			totalDiagnostics,
			totalImaging,
			totalEvaluations,
			signedCases,
			signedProcedures,
			totalLogs: totalCases + totalProcedures + totalDiagnostics + totalImaging,
			signOffRate:
				totalCases + totalProcedures > 0 ?
					Math.round(
						((signedCases + signedProcedures) /
							(totalCases + totalProcedures)) *
							100,
					)
				:	0,
			students: studentStats,
			facultyWorkload,
		});
	} catch (error) {
		console.error("[ANALYTICS_DEPARTMENT_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
