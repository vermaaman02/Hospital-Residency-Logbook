/**
 * @module ImagingCategoryPage
 * @description List page for imaging log entries in a specific category.
 * Resolves slug → enum value, fetches entries, renders ImagingLogTable.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getImagingBySlug } from "@/lib/constants/imaging-categories";
import {
	getMyImagingLogEntries,
	submitImagingLogEntry,
	deleteImagingLogEntry,
} from "@/actions/imaging-logs";
import { ImagingLogTable } from "@/components/tables/ImagingLogTable";

interface ImagingCategoryPageProps {
	params: Promise<{ category: string }>;
}

export default async function ImagingCategoryPage({
	params,
}: ImagingCategoryPageProps) {
	const { category: slug } = await params;
	const categoryInfo = getImagingBySlug(slug);

	if (!categoryInfo) return notFound();

	const rawEntries = await getMyImagingLogEntries(categoryInfo.enumValue);
	const entries = JSON.parse(JSON.stringify(rawEntries));

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/imaging">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">{categoryInfo.label}</h1>
					<p className="text-muted-foreground">
						Track your imaging analysis entries and skill progression
					</p>
				</div>
			</div>

			<ImagingLogTable
				entries={entries}
				categoryLabel={categoryInfo.label}
				categorySlug={slug}
				maxEntries={categoryInfo.maxEntries}
				onSubmit={submitImagingLogEntry as never}
				onDelete={deleteImagingLogEntry as never}
			/>
		</div>
	);
}
