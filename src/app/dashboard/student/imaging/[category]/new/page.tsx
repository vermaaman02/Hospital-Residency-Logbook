/**
 * @module NewImagingLogEntryPage
 * @description Create a new imaging log entry for any of the 5 categories.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getImagingBySlug } from "@/lib/constants/imaging-categories";
import { createImagingLogEntry } from "@/actions/imaging-logs";
import { ImagingLogEntryForm } from "@/components/forms/ImagingLogEntryForm";

interface NewImagingEntryPageProps {
	params: Promise<{ category: string }>;
}

export default async function NewImagingEntryPage({
	params,
}: NewImagingEntryPageProps) {
	const { category: slug } = await params;
	const categoryInfo = getImagingBySlug(slug);

	if (!categoryInfo) return notFound();

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href={`/dashboard/student/imaging/${slug}`}>
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Entry</h1>
					<p className="text-muted-foreground">{categoryInfo.label}</p>
				</div>
			</div>

			<ImagingLogEntryForm
				categoryEnum={categoryInfo.enumValue}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				onCreateAction={createImagingLogEntry as never}
			/>
		</div>
	);
}
