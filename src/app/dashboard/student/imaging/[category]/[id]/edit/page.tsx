/**
 * @module EditImagingLogEntryPage
 * @description Edit an existing imaging log entry. Pre-populates form with existing data.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getImagingBySlug } from "@/lib/constants/imaging-categories";
import {
	getMyImagingLogEntry,
	updateImagingLogEntry,
} from "@/actions/imaging-logs";
import { ImagingLogEntryForm } from "@/components/forms/ImagingLogEntryForm";

interface EditImagingEntryPageProps {
	params: Promise<{ category: string; id: string }>;
}

export default async function EditImagingEntryPage({
	params,
}: EditImagingEntryPageProps) {
	const { category: slug, id } = await params;
	const categoryInfo = getImagingBySlug(slug);

	if (!categoryInfo) return notFound();

	const entry = await getMyImagingLogEntry(id);
	if (!entry) return notFound();

	if (entry.status === "SIGNED") {
		redirect(`/dashboard/student/imaging/${slug}`);
	}

	const initialData: Record<string, unknown> = {
		imagingCategory: entry.imagingCategory,
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
				<Link href={`/dashboard/student/imaging/${slug}`}>
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Entry</h1>
					<p className="text-muted-foreground">{categoryInfo.label}</p>
				</div>
			</div>

			<ImagingLogEntryForm
				categoryEnum={categoryInfo.enumValue}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => {}) as never}
				onUpdateAction={updateImagingLogEntry as never}
			/>
		</div>
	);
}
