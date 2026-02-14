/**
 * @module EditConsentLogPage
 * @description Edit an existing informed consent entry (H7).
 *
 * @see PG Logbook .md — "Taking Informed Consent"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getMyConsentLogEntry, updateConsentLog } from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	CONSENT_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

interface EditConsentPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditConsentPage({
	params,
}: EditConsentPageProps) {
	const { id } = await params;
	const entry = await getMyConsentLogEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED")
		redirect("/dashboard/student/consent-bad-news");

	const H7 = OTHER_LOG_CATEGORIES.CONSENT;

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
				<Link href="/dashboard/student/consent-bad-news">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Consent Entry</h1>
					<p className="text-muted-foreground">{H7.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="consent"
				fields={CONSENT_LOG_FIELDS}
				title="Informed Consent"
				description={H7.label}
				redirectPath="/dashboard/student/consent-bad-news"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateConsentLog as never}
			/>
		</div>
	);
}
