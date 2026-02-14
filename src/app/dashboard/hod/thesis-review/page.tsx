/**
 * @module HOD Thesis Review Page
 * @description HOD view of all students' thesis records.
 * Reuses ThesisReviewClient from faculty module.
 *
 * @see PG Logbook .md — "THESIS" section
 * @see actions/thesis.ts — getThesesForReview
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getThesesForReview } from "@/actions/thesis";
import {
	ThesisReviewClient,
	type ThesisForReview,
} from "../../faculty/thesis-review/ThesisReviewClient";

export default async function HodThesisReviewPage() {
	let authResult: { userId: string; role: string };
	try {
		authResult = await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	const rawData = await getThesesForReview();
	const theses: ThesisForReview[] = JSON.parse(JSON.stringify(rawData));

	return (
		<div className="space-y-6">
			<PageHeader
				title="All Student Thesis Records"
				description="View and monitor thesis topics and committee records across all students"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Thesis Review" },
				]}
			/>
			<ThesisReviewClient theses={theses} role="hod" />
		</div>
	);
}
