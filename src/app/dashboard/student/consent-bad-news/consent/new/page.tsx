/**
 * @module NewConsentLogPage
 * @description Create a new informed consent entry (H7).
 *
 * @see PG Logbook .md — "Taking Informed Consent"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createConsentLog } from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	CONSENT_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

export default function NewConsentPage() {
	const H7 = OTHER_LOG_CATEGORIES.CONSENT;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/consent-bad-news">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Consent Entry</h1>
					<p className="text-muted-foreground">{H7.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="consent"
				fields={CONSENT_LOG_FIELDS}
				title="Informed Consent"
				description={H7.label}
				redirectPath="/dashboard/student/consent-bad-news"
				onCreateAction={createConsentLog as never}
			/>
		</div>
	);
}
