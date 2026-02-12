/**
 * @module ThesisTrackingPage
 * @description Thesis topic, chief guide, and semester-wise committee records.
 * Matches the physical logbook's thesis tracking section exactly.
 *
 * @see PG Logbook .md — Thesis section
 * @see roadmap.md — Phase 2, A2: Thesis Tracking
 */

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMyThesis } from "@/actions/thesis";
import { ThesisForm } from "./ThesisForm";

export default async function ThesisTrackingPage() {
	try {
		await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const thesis = await getMyThesis();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Thesis Tracking"
				description="Track your thesis topic, chief guide, and semester-wise committee members"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Thesis Tracking" },
				]}
			/>
			<ThesisForm thesis={thesis} />
		</div>
	);
}
