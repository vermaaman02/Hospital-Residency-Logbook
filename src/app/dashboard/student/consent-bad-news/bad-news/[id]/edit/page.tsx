/**
 * @module EditBadNewsLogPage
 * @description Edit an existing breaking bad news entry (H8).
 *
 * @see PG Logbook .md — "Breaking Bad News"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getMyBadNewsLogEntry, updateBadNewsLog } from "@/actions/other-logs";
import { OtherLogEntryForm } from "@/components/forms/OtherLogEntryForm";
import {
	BAD_NEWS_LOG_FIELDS,
	OTHER_LOG_CATEGORIES,
} from "@/lib/constants/other-logs-fields";

interface EditBadNewsPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditBadNewsPage({
	params,
}: EditBadNewsPageProps) {
	const { id } = await params;
	const entry = await getMyBadNewsLogEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED")
		redirect("/dashboard/student/consent-bad-news");

	const H8 = OTHER_LOG_CATEGORIES.BAD_NEWS;

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
					<h1 className="text-2xl font-bold">Edit Bad News Entry</h1>
					<p className="text-muted-foreground">{H8.label}</p>
				</div>
			</div>

			<OtherLogEntryForm
				formType="badNews"
				fields={BAD_NEWS_LOG_FIELDS}
				title="Breaking Bad News"
				description={H8.label}
				redirectPath="/dashboard/student/consent-bad-news"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateBadNewsLog as never}
			/>
		</div>
	);
}
