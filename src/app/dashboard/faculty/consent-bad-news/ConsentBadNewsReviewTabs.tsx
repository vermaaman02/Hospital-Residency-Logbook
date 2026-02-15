/**
 * @module ConsentBadNewsReviewTabs
 * @description Client component that renders two tabs for Consent (H7) and
 * Breaking Bad News (H8) reviews using PatientLogReviewClient.
 */

"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	PatientLogReviewClient,
	type PatientLogSubmission,
} from "@/components/shared/PatientLogReviewClient";
import {
	signConsentLog,
	rejectConsentLog,
	bulkSignConsentLogs,
	signBadNewsLog,
	rejectBadNewsLog,
	bulkSignBadNewsLogs,
} from "@/actions/other-logs";
import { SKILL_LEVEL_LABELS_SOAPI } from "@/lib/constants/other-logs-fields";
import { FileCheck, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConsentBadNewsReviewTabsProps {
	consentSubmissions: PatientLogSubmission[];
	badNewsSubmissions: PatientLogSubmission[];
	role: "faculty" | "hod";
	autoReviewConsent?: boolean;
	autoReviewBadNews?: boolean;
}

export function ConsentBadNewsReviewTabs({
	consentSubmissions,
	badNewsSubmissions,
	role,
	autoReviewConsent,
	autoReviewBadNews,
}: ConsentBadNewsReviewTabsProps) {
	const consentPending = consentSubmissions.filter(
		(s) => s.status === "SUBMITTED",
	).length;
	const badNewsPending = badNewsSubmissions.filter(
		(s) => s.status === "SUBMITTED",
	).length;

	return (
		<Tabs defaultValue="consent" className="space-y-4">
			<TabsList className="grid w-full max-w-md grid-cols-2">
				<TabsTrigger value="consent" className="gap-2">
					<FileCheck className="h-4 w-4" />
					Consent (H7)
					{consentPending > 0 && (
						<Badge
							variant="destructive"
							className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
						>
							{consentPending}
						</Badge>
					)}
				</TabsTrigger>
				<TabsTrigger value="badnews" className="gap-2">
					<HeartHandshake className="h-4 w-4" />
					Bad News (H8)
					{badNewsPending > 0 && (
						<Badge
							variant="destructive"
							className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
						>
							{badNewsPending}
						</Badge>
					)}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="consent">
				<PatientLogReviewClient
					submissions={consentSubmissions}
					role={role}
					moduleLabel="Consent"
					autoReviewEnabled={autoReviewConsent}
					autoReviewKey="consentLogs"
					skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
					studentLinkPrefix={`/dashboard/${role}/consent-bad-news/student`}
					onSign={signConsentLog}
					onReject={rejectConsentLog}
					onBulkSign={bulkSignConsentLogs}
				/>
			</TabsContent>

			<TabsContent value="badnews">
				<PatientLogReviewClient
					submissions={badNewsSubmissions}
					role={role}
					moduleLabel="Bad News"
					autoReviewEnabled={autoReviewBadNews}
					autoReviewKey="badNewsLogs"
					skillLevelLabels={SKILL_LEVEL_LABELS_SOAPI}
					studentLinkPrefix={`/dashboard/${role}/consent-bad-news/student`}
					onSign={signBadNewsLog}
					onReject={rejectBadNewsLog}
					onBulkSign={bulkSignBadNewsLogs}
				/>
			</TabsContent>
		</Tabs>
	);
}
