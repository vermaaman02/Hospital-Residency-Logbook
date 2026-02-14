/**
 * @module NewBadNewsLogPage
 * @description Create a new breaking bad news entry (H8).
 *
 * @see PG Logbook .md — "Breaking Bad News"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createBadNewsLog } from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	BAD_NEWS_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

export default function NewBadNewsPage() {
	const H8 = OTHER_LOG_CATEGORIES.BAD_NEWS;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/consent-bad-news">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Bad News Entry</h1>
					<p className="text-muted-foreground">{H8.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="badNews"
				fields={BAD_NEWS_LOG_FIELDS}
				title="Breaking Bad News"
				description={H8.label}
				redirectPath="/dashboard/student/consent-bad-news"
				onCreateAction={createBadNewsLog as never}
			/>
		</div>
	);
}
