/**
 * @module New Seminar Page
 * @description Page for creating a new seminar entry.
 */

import { requireAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeminarForm } from "./SeminarForm";

export default async function NewSeminarPage() {
	await requireAuth();

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Seminar Entry"
				description="Add a new seminar/evidence based discussion entry"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Seminars", href: "/dashboard/student/seminars" },
					{ label: "New" },
				]}
			/>
			<SeminarForm />
		</div>
	);
}
