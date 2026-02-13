/**
 * @module HOD Rotation Postings Review
 * @description 3-tab page for HOD to review ALL student rotation postings,
 * thesis records, and evaluate training & mentoring.
 * Unlike faculty, HOD sees every student's data.
 *
 * @see actions/rotation-postings.ts — getRotationPostingsForReview
 * @see actions/thesis.ts — getThesesForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { getRotationPostingsForReview } from "@/actions/rotation-postings";
import { getThesesForReview } from "@/actions/thesis";
import { getAutoReviewSettings } from "@/actions/auto-review";
import { type RotationSubmission } from "../../faculty/rotation-postings/RotationReviewClient";
import { type ThesisForReview } from "../../faculty/thesis-review/ThesisReviewClient";
import { ReviewTabsClient } from "../../faculty/rotation-postings/ReviewTabsClient";

export default async function HodRotationPostingsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	// Fetch all 3 datasets in parallel
	const [rawPostings, rawTheses, autoReviewSettings] = await Promise.all([
		getRotationPostingsForReview(),
		getThesesForReview(),
		getAutoReviewSettings(),
	]);

	const submissions: RotationSubmission[] = JSON.parse(
		JSON.stringify(rawPostings),
	);
	const theses: ThesisForReview[] = JSON.parse(JSON.stringify(rawTheses));

	// HOD sees all students
	const allStudents = await prisma.user.findMany({
		where: { role: "STUDENT" as never },
		select: {
			id: true,
			clerkId: true,
			firstName: true,
			lastName: true,
			email: true,
			batchRelation: { select: { name: true } },
			currentSemester: true,
		},
	});
	const allStudentIds = allStudents.map((s) => s.id);

	const existingRecords = await prisma.trainingMentoringRecord.findMany({
		where: { userId: { in: allStudentIds } },
		orderBy: { semester: "asc" },
	});

	const trainingStudents = JSON.parse(JSON.stringify(allStudents));
	const trainingRecords = JSON.parse(JSON.stringify(existingRecords));

	return (
		<div className="space-y-6">
			<PageHeader
				title="All Student Reviews"
				description="Review rotation postings, thesis records, and training evaluations for all students"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Rotation Postings" },
				]}
			/>
			<ReviewTabsClient
				role="hod"
				submissions={submissions}
				theses={theses}
				trainingStudents={trainingStudents}
				trainingRecords={trainingRecords}
				autoReviewSettings={autoReviewSettings}
			/>
		</div>
	);
}
