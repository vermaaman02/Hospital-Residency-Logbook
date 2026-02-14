/**
 * @module StudentAnalyticsAPI
 * @description GET progress summary for a specific student.
 *
 * @see roadmap.md — Section 8, analytics/student/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id: studentId } = await params;
		const role = (sessionClaims?.metadata as { role?: string })?.role;

		// Students can only see their own analytics
		if (role === "student" && studentId !== userId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Faculty can only see assigned students
		if (role === "faculty") {
			const assignment = await prisma.facultyStudentAssignment.findFirst({
				where: { facultyId: userId, studentId },
			});
			if (!assignment) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		const [
			caseCount,
			procedureCount,
			diagnosticCount,
			imagingCount,
			presentationCount,
			seminarCount,
			journalCount,
			signedCases,
			signedProcedures,
			signedEvals,
			totalEvals,
		] = await Promise.all([
			prisma.caseManagementLog.count({ where: { userId: studentId } }),
			prisma.procedureLog.count({ where: { userId: studentId } }),
			prisma.diagnosticSkill.count({ where: { userId: studentId } }),
			prisma.imagingLog.count({ where: { userId: studentId } }),
			prisma.casePresentation.count({ where: { userId: studentId } }),
			prisma.seminar.count({ where: { userId: studentId } }),
			prisma.journalClub.count({ where: { userId: studentId } }),
			prisma.caseManagementLog.count({
				where: { userId: studentId, status: "SIGNED" as never },
			}),
			prisma.procedureLog.count({
				where: { userId: studentId, status: "SIGNED" as never },
			}),
			prisma.residentEvaluation.count({
				where: { userId: studentId, status: "SIGNED" as never },
			}),
			prisma.residentEvaluation.count({
				where: { userId: studentId },
			}),
		]);

		const student = await prisma.user.findUnique({
			where: { id: studentId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				batch: true,
				currentSemester: true,
			},
		});

		return NextResponse.json({
			student,
			totalCases: caseCount,
			totalProcedures: procedureCount,
			totalDiagnostics: diagnosticCount,
			totalImaging: imagingCount,
			totalPresentations: presentationCount,
			totalSeminars: seminarCount,
			totalJournalClubs: journalCount,
			totalAcademics: presentationCount + seminarCount + journalCount,
			signedCases,
			signedProcedures,
			signedEvaluations: signedEvals,
			totalEvaluations: totalEvals,
			totalLogs:
				caseCount +
				procedureCount +
				diagnosticCount +
				imagingCount +
				presentationCount +
				seminarCount +
				journalCount,
			signOffRate:
				caseCount + procedureCount > 0 ?
					Math.round(
						((signedCases + signedProcedures) / (caseCount + procedureCount)) *
							100,
					)
				:	0,
		});
	} catch (error) {
		console.error("[ANALYTICS_STUDENT_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
