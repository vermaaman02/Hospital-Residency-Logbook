/**
 * @module HelpGuidePage
 * @description Comprehensive, role-aware Help & Guide page for the AIIMS Patna
 * PG Residency Digital Logbook. Covers all modules, workflows, FAQs,
 * and role-specific guidance for Students, Faculty, and HOD.
 *
 * @see copilot-instructions.md — Section 1
 * @see PG Logbook .md — All logbook sections
 */

import { getCurrentRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { HelpGuideClient } from "./HelpGuideClient";

export default async function HelpGuidePage() {
	const role = await getCurrentRole();

	const dashboardHref =
		role === "hod" ? "/dashboard/hod"
		: role === "faculty" ? "/dashboard/faculty"
		: "/dashboard/student";

	return (
		<div className="space-y-4 sm:space-y-6">
			<PageHeader
				title="Help & Guide"
				description="Everything you need to know about the AIIMS Patna PG Residency Digital Logbook"
				breadcrumbs={[
					{ label: "Dashboard", href: dashboardHref },
					{ label: "Help & Guide" },
				]}
			/>
			<HelpGuideClient role={role ?? "student"} />
		</div>
	);
}
