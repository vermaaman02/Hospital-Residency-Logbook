/**
 * @module EditTransportLogPage
 * @description Edit an existing transport log entry (H6).
 *
 * @see PG Logbook .md — "Transport of Critically Ill Patient"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyTransportLogEntry,
	updateTransportLog,
} from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	TRANSPORT_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

interface EditTransportPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditTransportPage({
	params,
}: EditTransportPageProps) {
	const { id } = await params;
	const entry = await getMyTransportLogEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED") redirect("/dashboard/student/transport");

	const H6 = OTHER_LOG_CATEGORIES.TRANSPORT;

	const initialData: Record<string, unknown> = {
		date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
		patientInfo: entry.patientInfo ?? "",
		completeDiagnosis: entry.completeDiagnosis ?? "",
		procedureDescription: entry.procedureDescription ?? "",
		performedAtLocation: entry.performedAtLocation ?? "",
		skillLevel: entry.skillLevel ?? "",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/transport">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Transport Entry</h1>
					<p className="text-muted-foreground">{H6.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="transport"
				fields={TRANSPORT_LOG_FIELDS}
				title="Transport Log"
				description={H6.label}
				redirectPath="/dashboard/student/transport"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateTransportLog as never}
			/>
		</div>
	);
}
