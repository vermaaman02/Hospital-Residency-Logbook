/**
 * @module NewTransportLogPage
 * @description Create a new transport of critically ill patient entry (H6).
 *
 * @see PG Logbook .md — "Transport of Critically Ill Patient"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createTransportLog } from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	TRANSPORT_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

export default function NewTransportPage() {
	const H6 = OTHER_LOG_CATEGORIES.TRANSPORT;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/transport">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Transport Entry</h1>
					<p className="text-muted-foreground">{H6.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="transport"
				fields={TRANSPORT_LOG_FIELDS}
				title="Transport Log"
				description={H6.label}
				redirectPath="/dashboard/student/transport"
				onCreateAction={createTransportLog as never}
			/>
		</div>
	);
}
