/**
 * @module ImagingCategoryPage
 * @description Student page for a specific imaging category with inline editing table.
 * Add rows as needed. Click a row to edit inline.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImagingCategoryClient } from "./ImagingCategoryClient";
import {
	getMyImagingLogEntries,
	getAvailableImagingFaculty,
} from "@/actions/imaging-logs";
import { getImagingBySlug } from "@/lib/constants/imaging-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

async function CategoryData({
	categoryEnum,
	categoryLabel,
	maxEntries,
}: {
	categoryEnum: string;
	categoryLabel: string;
	maxEntries: number;
}) {
	const [entries, facultyList] = await Promise.all([
		getMyImagingLogEntries(categoryEnum),
		getAvailableImagingFaculty(),
	]);

	return (
		<ImagingCategoryClient
			entries={JSON.parse(JSON.stringify(entries))}
			facultyList={JSON.parse(JSON.stringify(facultyList))}
			imagingCategory={categoryEnum}
			categoryLabel={categoryLabel}
			maxEntries={maxEntries}
		/>
	);
}

export default async function ImagingCategoryPage({ params }: PageParams) {
	const { category: categorySlug } = await params;
	const cat = getImagingBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student/imaging">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={cat.label}
					description={`Target: ${cat.maxEntries} entries — add rows and click to edit inline`}
				/>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<CategoryData
					categoryEnum={cat.enumValue}
					categoryLabel={cat.label}
					maxEntries={cat.maxEntries}
				/>
			</Suspense>
		</div>
	);
}
