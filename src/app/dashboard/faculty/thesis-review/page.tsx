/**
 * @module Faculty Thesis Review Page
 * @description Faculty view of assigned students' thesis records.
 * Fetches theses scoped to batch-assigned students.
 *
 * @see PG Logbook .md — "THESIS" section
 * @see actions/thesis.ts — getThesesForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getThesesForReview } from "@/actions/thesis";
import { ThesisReviewClient, type ThesisForReview } from "./ThesisReviewClient";

export default async function FacultyThesisReviewPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["faculty", "hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const rawData = await getThesesForReview();
	const theses: ThesisForReview[] = JSON.parse(JSON.stringify(rawData));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Student Thesis Records"
				description="Review thesis topics and semester committee records for your students"
				breadcrumbs={[
					{
						label: "Dashboard",
						href: `/dashboard/${authResult.role === "hod" ? "hod" : "faculty"}`,
					},
					{ label: "Thesis Review" },
				]}
			/>
			<ThesisReviewClient
				theses={theses}
				role={authResult.role as "faculty" | "hod"}
			/>
		</div>
	);
}
