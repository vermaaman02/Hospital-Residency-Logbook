/**
 * @module NewRotationPostingPage
 * @description Form page to add a new rotation posting entry.
 * Uses GenericLogForm with rotation posting field config.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RotationPostingForm } from "./RotationPostingForm";

export default async function NewRotationPostingPage() {
	try {
		await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Add Rotation Posting"
				description="Log a new rotation posting during your PG in Emergency Medicine"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{
						label: "Rotation Postings",
						href: "/dashboard/student/rotation-postings",
					},
					{ label: "New Entry" },
				]}
			/>
			<RotationPostingForm />
		</div>
	);
}
