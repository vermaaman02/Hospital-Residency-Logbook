/**
 * @module Faculty Rotation Postings Review
 * @description 3-tab page for faculty to review student rotation postings,
 * thesis records, and evaluate training & mentoring — all in one view.
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
import { type RotationSubmission } from "./RotationReviewClient";
import { type ThesisForReview } from "../thesis-review/ThesisReviewClient";
import { ReviewTabsClient } from "./ReviewTabsClient";

export default async function FacultyRotationPostingsPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
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

	// Fetch training data — assigned students and existing records
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: authResult.userId },
		select: { studentId: true },
	});
	const studentIds = assignments.map((a) => a.studentId);

	const [students, existingRecords] = await Promise.all([
		prisma.user.findMany({
			where: { id: { in: studentIds } },
			select: {
				id: true,
				clerkId: true,
				firstName: true,
				lastName: true,
				email: true,
				batchRelation: { select: { name: true } },
				currentSemester: true,
			},
		}),
		prisma.trainingMentoringRecord.findMany({
			where: { userId: { in: studentIds } },
			orderBy: { semester: "asc" },
		}),
	]);

	const trainingStudents = JSON.parse(JSON.stringify(students));
	const trainingRecords = JSON.parse(JSON.stringify(existingRecords));

	const dashboardBase =
		authResult.role === "hod" ? "/dashboard/hod" : "/dashboard/faculty";

	return (
		<div className="space-y-6">
			<PageHeader
				title="Student Reviews"
				description="Review rotation postings, thesis records, and evaluate training for your students"
				breadcrumbs={[
					{ label: "Dashboard", href: dashboardBase },
					{ label: "Rotation Postings" },
				]}
			/>
			<ReviewTabsClient
				role={authResult.role as "faculty" | "hod"}
				submissions={submissions}
				theses={theses}
				trainingStudents={trainingStudents}
				trainingRecords={trainingRecords}
				autoReviewSettings={autoReviewSettings}
			/>
		</div>
	);
}
