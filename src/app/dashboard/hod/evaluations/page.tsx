/**
 * @module HodEvaluationsPage
 * @description HOD evaluation page — view ALL students' evaluations, final sign-off.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 * @see roadmap.md — Phase 8
 */

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { HodEvaluationsClient } from "./HodEvaluationsClient";

export default async function HodEvaluationsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/sign-in");
	}

	// Get ALL students (HOD sees everyone)
	const students = await prisma.user.findMany({
		where: { role: "student" as never },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
		},
		orderBy: [{ batch: "asc" }, { firstName: "asc" }],
	});

	// Get ALL evaluations
	const evaluations = await prisma.residentEvaluation.findMany({
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					batch: true,
					currentSemester: true,
				},
			},
		},
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Resident Evaluations (All Students)"
				description="View all students evaluations, set scores, and provide final sign-off"
			/>
			<HodEvaluationsClient
				students={JSON.parse(JSON.stringify(students))}
				evaluations={JSON.parse(JSON.stringify(evaluations))}
			/>
		</div>
	);
}
