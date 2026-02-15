/**
 * @module TransportPage
 * @description Student page for H6 — Transport of Critically Ill Patient.
 * Inline editing table with export. Mirrors procedure category pattern.
 *
 * @see PG Logbook .md — "Transport of Critically Ill Patient"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ambulance, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getMyTransportLogs,
	getAvailableOtherLogFaculty,
} from "@/actions/other-logs";
import { TransportClient } from "./TransportClient";
import { OTHER_LOG_CATEGORIES } from "@/lib/constants/other-logs-fields";

async function TransportContent() {
	const H6 = OTHER_LOG_CATEGORIES.TRANSPORT;
	const [entries, facultyList] = await Promise.all([
		getMyTransportLogs(),
		getAvailableOtherLogFaculty(),
	]);

	return (
		<TransportClient
			entries={JSON.parse(JSON.stringify(entries))}
			facultyList={JSON.parse(JSON.stringify(facultyList))}
			categoryLabel={H6.shortLabel}
			maxEntries={H6.maxEntries}
		/>
	);
}

export default function TransportPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<Ambulance className="h-6 w-6 text-hospital-primary" />
					<PageHeader
						title="Transport Logs"
						description="Target: 10 entries — add rows and click to edit inline"
					/>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<TransportContent />
			</Suspense>
		</div>
	);
}
