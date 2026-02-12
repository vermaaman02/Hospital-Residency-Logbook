/**
 * @module TrainingMentoringPage
 * @description View training & mentoring records.
 * Read-only for students (faculty sets scores). Shows 5-point scale for each semester.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 * @see roadmap.md — Phase 2, A4
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrainingMentoringView } from "./TrainingMentoringView";

export default async function TrainingMentoringPage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const records = await prisma.trainingMentoringRecord.findMany({
		where: { userId },
		orderBy: { semester: "asc" },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Resident Training & Mentoring Record"
				description="5-point scale evaluation by your assigned faculty — updated each semester"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Training & Mentoring" },
				]}
			/>
			<TrainingMentoringView records={records} />
		</div>
	);
}
