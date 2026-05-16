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

		const [
			students,
			faculty,
			totalCases,
			totalProcedures,
			totalDiagnostics,
			totalImaging,
			totalEvaluations,
			signedCases,
			signedProcedures,
			casesByStudent,
			proceduresByStudent,
			signedEvalsByStudent,
			facultyAssignmentCounts,
		] = await Promise.all([
			prisma.user.findMany({
				where: { role: "STUDENT" as never },
				select: { id: true, firstName: true, lastName: true, batch: true, currentSemester: true },
				orderBy: [{ batch: "desc" }, { firstName: "asc" }],
			}),
			prisma.user.findMany({
				where: { role: "FACULTY" as never },
				select: { id: true, firstName: true, lastName: true },
			}),
			prisma.caseManagementLog.count(),
			prisma.procedureLog.count(),
			prisma.diagnosticSkill.count(),
			prisma.imagingLog.count(),
			prisma.residentEvaluation.count(),
			prisma.caseManagementLog.count({ where: { status: "SIGNED" as never } }),
			prisma.procedureLog.count({ where: { status: "SIGNED" as never } }),
			// Aggregate counts per student — single query each
			prisma.caseManagementLog.groupBy({
				by: ["userId"],
				_count: { id: true },
			}),
			prisma.procedureLog.groupBy({
				by: ["userId"],
				_count: { id: true },
			}),
			prisma.residentEvaluation.groupBy({
				by: ["userId"],
				where: { status: "SIGNED" as never },
				_count: { id: true },
			}),
			// Faculty workload — single query
			prisma.facultyStudentAssignment.groupBy({
				by: ["facultyId"],
				_count: { id: true },
			}),
		]);

		// Build lookup maps for O(1) access
		const casesMap = new Map(casesByStudent.map((r) => [r.userId, r._count.id]));
		const proceduresMap = new Map(proceduresByStudent.map((r) => [r.userId, r._count.id]));
		const evalsMap = new Map(signedEvalsByStudent.map((r) => [r.userId, r._count.id]));
		const assignmentsMap = new Map(facultyAssignmentCounts.map((r) => [r.facultyId, r._count.id]));

		// Per-student summary — no extra DB queries
		const studentStats = students.map((student) => {
			const cases = casesMap.get(student.id) ?? 0;
			const procedures = proceduresMap.get(student.id) ?? 0;
			const evals = evalsMap.get(student.id) ?? 0;
			return {
				...student,
				totalCases: cases,
				totalProcedures: procedures,
				signedEvaluations: evals,
				totalLogs: cases + procedures,
			};
		});

		// Faculty workload — no extra DB queries
		const facultyWorkload = faculty.map((f) => ({
			...f,
			assignedStudents: assignmentsMap.get(f.id) ?? 0,
		}));

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
