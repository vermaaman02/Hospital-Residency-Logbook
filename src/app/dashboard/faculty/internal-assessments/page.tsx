/**
 * @module Faculty Internal Assessments Page
 * @description Server component for faculty to manage internal assessments
 * for their assigned batches. Create, evaluate submissions, and reject with feedback.
 */

import { Suspense } from "react";
import { requireRole, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	getFacultyAssessments,
	getAvailableBatches,
} from "@/actions/assessments";
import { FacultyAssessmentsClient } from "./FacultyAssessmentsClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function Content() {
	await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const [assessments, batches, students, faculty] = await Promise.all([
		getFacultyAssessments(),
		getAvailableBatches(),
		prisma.user.findMany({
			where: { role: "STUDENT", status: "ACTIVE" },
			select: { id: true, firstName: true, lastName: true, batchId: true, currentSemester: true }
		}),
		prisma.user.findMany({
			where: { role: "FACULTY", status: "ACTIVE", departmentId: user.departmentId },
			select: { id: true, firstName: true, lastName: true }
		})
	]);

	const serialized = JSON.parse(JSON.stringify(assessments));
	const serializedBatches = JSON.parse(JSON.stringify(batches));
	const serializedStudents = JSON.parse(JSON.stringify(students));
	const serializedFaculty = JSON.parse(JSON.stringify(faculty));

	return (
		<FacultyAssessmentsClient
			assessments={serialized}
			batches={serializedBatches}
			students={serializedStudents}
			faculty={serializedFaculty}
		/>
	);
}

export default function FacultyInternalAssessmentsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-100">
					<Loader2 className="h-8 w-8 animate-spin text-hospital-primary" />
				</div>
			}
		>
			<Content />
		</Suspense>
	);
}
