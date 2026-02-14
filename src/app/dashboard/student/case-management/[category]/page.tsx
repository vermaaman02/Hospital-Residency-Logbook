/**
 * @module CaseManagementCategoryPage
 * @description List all case management entries for a specific category.
 * Shows entries in a table with sub-category, date, diagnosis, competency, tally.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CaseManagementTable } from "@/components/tables/CaseManagementTable";
import {
	getMyCaseManagementEntries,
	submitCaseManagementEntry,
	deleteCaseManagementEntry,
} from "@/actions/case-management";
import { getCategoryBySlug } from "@/lib/constants/case-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

async function CategoryEntries({
	categorySlug,
	categoryEnum,
	categoryLabel,
}: {
	categorySlug: string;
	categoryEnum: string;
	categoryLabel: string;
}) {
	const entries = await getMyCaseManagementEntries(categoryEnum);

	return (
		<CaseManagementTable
			entries={JSON.parse(JSON.stringify(entries))}
			categorySlug={categorySlug}
			categoryLabel={categoryLabel}
			onSubmit={submitCaseManagementEntry}
			onDelete={deleteCaseManagementEntry}
		/>
	);
}

export default async function CaseManagementCategoryPage({ params }: PageParams) {
	const { category: categorySlug } = await params;
	const cat = getCategoryBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student/case-management">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={cat.label}
					description={`${cat.subCategories.length} case types in this category`}
				/>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<CategoryEntries
					categorySlug={categorySlug}
					categoryEnum={cat.enumValue}
					categoryLabel={cat.label}
				/>
			</Suspense>
		</div>
	);
}
