/**
 * @module ConsentBadNewsPage
 * @description Student page for H7 (Informed Consent) and H8 (Breaking Bad News).
 * Inline editing tables with export. Mirrors procedure category pattern.
 *
 * @see PG Logbook .md — "Taking Informed Consent", "Breaking Bad News"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HeartHandshake, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getMyConsentLogs,
	getMyBadNewsLogs,
	getAvailableOtherLogFaculty,
} from "@/actions/other-logs";
import { ConsentBadNewsClient } from "./ConsentBadNewsClient";
import { OTHER_LOG_CATEGORIES } from "@/lib/constants/other-logs-fields";

async function ConsentBadNewsContent() {
	const H7 = OTHER_LOG_CATEGORIES.CONSENT;
	const H8 = OTHER_LOG_CATEGORIES.BAD_NEWS;

	const [consentEntries, badNewsEntries, facultyList] = await Promise.all([
		getMyConsentLogs(),
		getMyBadNewsLogs(),
		getAvailableOtherLogFaculty(),
	]);

	return (
		<ConsentBadNewsClient
			consentEntries={JSON.parse(JSON.stringify(consentEntries))}
			badNewsEntries={JSON.parse(JSON.stringify(badNewsEntries))}
			facultyList={JSON.parse(JSON.stringify(facultyList))}
			consentLabel={H7.shortLabel}
			badNewsLabel={H8.shortLabel}
			consentMax={H7.maxEntries}
			badNewsMax={H8.maxEntries}
		/>
	);
}

export default function ConsentBadNewsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<HeartHandshake className="h-6 w-6 text-hospital-primary" />
					<PageHeader
						title="Consent & Bad News"
						description="Taking informed consent and breaking bad news — add rows and click to edit inline"
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
				<ConsentBadNewsContent />
			</Suspense>
		</div>
	);
}
