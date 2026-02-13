/**
 * @module DisasterQiLandingPage
 * @description Landing for H4 (Disaster Drills) and H5 (Quality Improvement).
 *
 * @see PG Logbook .md — "Major Incident / Disaster Drill", "QI / Patient Safety"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import {
	getMyDisasterDrills,
	submitDisasterDrill,
	deleteDisasterDrill,
	getMyQualityImprovements,
	submitQualityImprovement,
	deleteQualityImprovement,
} from "@/actions/disaster-qi";
import { ProfessionalEntryTable } from "@/components/tables/ProfessionalEntryTable";
import { PROFESSIONAL_CATEGORIES } from "@/lib/constants/professional-fields";

async function DisasterQiContent() {
	const [drills, qiEntries] = await Promise.all([
		getMyDisasterDrills(),
		getMyQualityImprovements(),
	]);

	const serializedDrills = JSON.parse(JSON.stringify(drills));
	const serializedQi = JSON.parse(JSON.stringify(qiEntries));

	const H4 = PROFESSIONAL_CATEGORIES.DISASTER;
	const H5 = PROFESSIONAL_CATEGORIES.QI;

	return (
		<div className="space-y-8">
			<ProfessionalEntryTable
				entries={serializedDrills}
				title={H4.shortLabel}
				description={H4.label}
				code={H4.code}
				maxEntries={H4.maxEntries}
				columns={[
					{ key: "description", label: "Description" },
					{ key: "roleInActivity", label: "Role", className: "w-36" },
				]}
				newEntryHref="/dashboard/student/disaster-qi/disaster/new"
				editHrefPrefix="/dashboard/student/disaster-qi/disaster"
				onSubmit={submitDisasterDrill as never}
				onDelete={deleteDisasterDrill as never}
			/>

			<ProfessionalEntryTable
				entries={serializedQi}
				title={H5.shortLabel}
				description={H5.label}
				code={H5.code}
				maxEntries={H5.maxEntries}
				columns={[
					{ key: "description", label: "Description" },
					{ key: "roleInActivity", label: "Role", className: "w-36" },
				]}
				newEntryHref="/dashboard/student/disaster-qi/qi/new"
				editHrefPrefix="/dashboard/student/disaster-qi/qi"
				onSubmit={submitQualityImprovement as never}
				onDelete={deleteQualityImprovement as never}
			/>
		</div>
	);
}

export default function DisasterQiPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<Shield className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Disaster & QI</h1>
						<p className="text-muted-foreground">
							Disaster management drills and quality improvement initiatives
						</p>
					</div>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="space-y-8">
						{[1, 2].map((i) => (
							<div key={i} className="animate-pulse border rounded-lg p-6">
								<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
								<div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
							</div>
						))}
					</div>
				}
			>
				<DisasterQiContent />
			</Suspense>
		</div>
	);
}
