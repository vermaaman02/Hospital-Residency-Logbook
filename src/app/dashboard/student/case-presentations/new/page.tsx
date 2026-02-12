/**
 * @module New Case Presentation Page
 * @description Form to create a new case presentation entry.
 */

import { requireAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { CasePresentationForm } from "./CasePresentationForm";

export default async function NewCasePresentationPage() {
	await requireAuth();

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Case Presentation"
				description="Add a new academic case presentation entry"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Case Presentations", href: "/dashboard/student/case-presentations" },
					{ label: "New Entry" },
				]}
			/>
			<CasePresentationForm />
		</div>
	);
}
