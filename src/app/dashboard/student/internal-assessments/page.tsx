/**
 * @module StudentInternalAssessmentsPage
 * @description Server component for student internal assessments view.
 * Two tabs: Assessments list (view/submit) and Grades & Evaluations.
 */

import { requireAuth } from "@/lib/auth";
import { getStudentAssessments } from "@/actions/assessments";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentAssessmentsClient } from "./StudentAssessmentsClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function StudentInternalAssessmentsPage() {
	await requireAuth();

	const assessments = await getStudentAssessments();
	const serialized = JSON.parse(JSON.stringify(assessments));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Internal Assessments"
				description="View assessments, submit your work, and check your grades"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Internal Assessments" },
				]}
			/>
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-hospital-primary" />
					</div>
				}
			>
				<StudentAssessmentsClient assessments={serialized} />
			</Suspense>
		</div>
	);
}
