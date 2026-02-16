/**
 * @module HodAnalyticsPage
 * @description Department analytics dashboard for HOD.
 * Fetches comprehensive analytics bundle via server action and
 * renders tabbed dashboard with charts, KPIs, and tables.
 *
 * @see src/actions/hod-analytics.ts — data provider
 * @see roadmap.md — Phase 8, Department Analytics
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { getHodAnalytics } from "@/actions/hod-analytics";
import { HodAnalyticsClient } from "./HodAnalyticsClient";

export default async function HodAnalyticsPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/sign-in");
	}

	const data = await getHodAnalytics();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Department Analytics"
				description="Comprehensive overview of department performance, resident progress, and faculty activity"
			/>
			<HodAnalyticsClient data={JSON.parse(JSON.stringify(data))} />
		</div>
	);
}
