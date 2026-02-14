/**
 * @module ConsentBadNewsLandingPage
 * @description Landing for H7 (Informed Consent) and H8 (Breaking Bad News).
 *
 * @see PG Logbook .md — "Taking Informed Consent", "Breaking Bad News"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import {
	getMyConsentLogs,
	submitConsentLog,
	deleteConsentLog,
	getMyBadNewsLogs,
	submitBadNewsLog,
	deleteBadNewsLog,
} from "@/actions/other-logs";
import { OtherLogTable } from "@/components/tables/OtherLogTable";
import { OTHER_LOG_CATEGORIES } from "@/lib/constants/other-logs-fields";

async function ConsentBadNewsContent() {
	const [consentEntries, badNewsEntries] = await Promise.all([
		getMyConsentLogs(),
		getMyBadNewsLogs(),
	]);

	const serializedConsent = JSON.parse(JSON.stringify(consentEntries));
	const serializedBadNews = JSON.parse(JSON.stringify(badNewsEntries));

	const H7 = OTHER_LOG_CATEGORIES.CONSENT;
	const H8 = OTHER_LOG_CATEGORIES.BAD_NEWS;

	return (
		<div className="space-y-8">
			<OtherLogTable
				entries={serializedConsent}
				categoryLabel={H7.shortLabel}
				categoryCode={H7.code}
				maxEntries={H7.maxEntries}
				newEntryHref="/dashboard/student/consent-bad-news/consent/new"
				editHrefPrefix="/dashboard/student/consent-bad-news/consent"
				onSubmit={submitConsentLog as never}
				onDelete={deleteConsentLog as never}
			/>

			<OtherLogTable
				entries={serializedBadNews}
				categoryLabel={H8.shortLabel}
				categoryCode={H8.code}
				maxEntries={H8.maxEntries}
				newEntryHref="/dashboard/student/consent-bad-news/bad-news/new"
				editHrefPrefix="/dashboard/student/consent-bad-news/bad-news"
				onSubmit={submitBadNewsLog as never}
				onDelete={deleteBadNewsLog as never}
			/>
		</div>
	);
}

export default function ConsentBadNewsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<HeartHandshake className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Consent & Bad News</h1>
						<p className="text-muted-foreground">
							Taking informed consent and breaking bad news communication
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
				<ConsentBadNewsContent />
			</Suspense>
		</div>
	);
}
