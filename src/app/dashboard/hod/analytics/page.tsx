/**
 * @module HodAnalyticsPage
 * @description Department analytics dashboard for HOD.
 * Shows department-wide stats, per-student progress, faculty workload.
 *
 * @see roadmap.md — Phase 8, Department Analytics
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodAnalyticsClient } from "./HodAnalyticsClient";

export default async function HodAnalyticsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/sign-in");
	}

	// All students with their log counts
	const students = await prisma.user.findMany({
		where: { role: "student" as never },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
			_count: {
				select: {
					caseManagementLogs: true,
					procedureLogs: true,
					diagnosticSkills: true,
					imagingLogs: true,
					casePresentations: true,
					evaluations: true,
				},
			},
		},
		orderBy: [{ batch: "asc" }, { firstName: "asc" }],
	});

	// All faculty with assignment counts
	const faculty = await prisma.user.findMany({
		where: { role: "faculty" as never },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			_count: {
				select: {
					assignedStudents: true,
				},
			},
		},
		orderBy: { firstName: "asc" },
	});

	// Department totals
	const [
		totalCases,
		totalProcedures,
		totalDiagnostics,
		totalImaging,
		totalPresentations,
		signedEvals,
		totalEvals,
	] = await Promise.all([
		prisma.caseManagementLog.count(),
		prisma.procedureLog.count(),
		prisma.diagnosticSkill.count(),
		prisma.imagingLog.count(),
		prisma.casePresentation.count(),
		prisma.residentEvaluation.count({
			where: { status: "SIGNED" as never },
		}),
		prisma.residentEvaluation.count(),
	]);

	const departmentStats = {
		totalStudents: students.length,
		totalFaculty: faculty.length,
		totalCases,
		totalProcedures,
		totalDiagnostics,
		totalImaging,
		totalAcademics: totalPresentations,
		signedEvals,
		totalEvals,
		signOffRate:
			totalEvals > 0 ? Math.round((signedEvals / totalEvals) * 100) : 0,
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Department Analytics"
				description="Comprehensive overview of department performance and student progress"
			/>
			<HodAnalyticsClient
				students={JSON.parse(JSON.stringify(students))}
				faculty={JSON.parse(JSON.stringify(faculty))}
				departmentStats={departmentStats}
			/>
		</div>
	);
}
