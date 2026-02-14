/**
 * @module StudentEvaluationsPage
 * @description Landing page for student evaluations module.
 * Shows I1 (Periodic Review list), I2 (Graph), I3 (End Semester Assessment).
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 * @see roadmap.md — Phase 8
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { EvaluationsClient } from "./EvaluationsClient";

export default async function StudentEvaluationsPage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const evaluations = await prisma.residentEvaluation.findMany({
		where: { userId },
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
	});

	const serialized = JSON.parse(JSON.stringify(evaluations));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Evaluations & Assessment"
				description="Periodic logbook reviews, evaluation graph, and end-semester assessments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Evaluations" },
				]}
			/>
			<EvaluationsClient evaluations={serialized} />
		</div>
	);
}
