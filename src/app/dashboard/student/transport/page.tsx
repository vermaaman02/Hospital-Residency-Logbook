/**
 * @module TransportLandingPage
 * @description Landing for H6 — Transport of Critically Ill Patient.
 *
 * @see PG Logbook .md — "Transport of Critically Ill Patient"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ambulance } from "lucide-react";
import {
	getMyTransportLogs,
	submitTransportLog,
	deleteTransportLog,
} from "@/actions/other-logs";
import { OtherLogTable } from "@/components/tables/OtherLogTable";
import { OTHER_LOG_CATEGORIES } from "@/lib/constants/other-logs-fields";

async function TransportContent() {
	const entries = await getMyTransportLogs();
	const serialized = JSON.parse(JSON.stringify(entries));
	const H6 = OTHER_LOG_CATEGORIES.TRANSPORT;

	return (
		<OtherLogTable
			entries={serialized}
			categoryLabel={H6.shortLabel}
			categoryCode={H6.code}
			maxEntries={H6.maxEntries}
			newEntryHref="/dashboard/student/transport/new"
			editHrefPrefix="/dashboard/student/transport"
			onSubmit={submitTransportLog as never}
			onDelete={deleteTransportLog as never}
		/>
	);
}

export default function TransportPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<Ambulance className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Transport Logs</h1>
						<p className="text-muted-foreground">
							Transport of critically ill patients (inter/intra-hospital)
						</p>
					</div>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="animate-pulse border rounded-lg p-6">
						<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
						<div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
					</div>
				}
			>
				<TransportContent />
			</Suspense>
		</div>
	);
}
