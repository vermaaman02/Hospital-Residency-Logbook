/**
 * @module CaseManagementCategoryPage
 * @description Student page for a specific case management category with inline editing table.
 * Auto-initializes sub-category rows. Click row to edit inline.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CaseManagementCategoryClient } from "./CaseManagementCategoryClient";
import {
	getMyCaseManagementEntries,
	getAvailableCaseManagementFaculty,
} from "@/actions/case-management";
import { getCategoryBySlug } from "@/lib/constants/case-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

async function CategoryData({
	categoryEnum,
	categoryLabel,
}: {
	categoryEnum: string;
	categoryLabel: string;
}) {
	const [entries, facultyList] = await Promise.all([
		getMyCaseManagementEntries(categoryEnum),
		getAvailableCaseManagementFaculty(),
	]);

	return (
		<CaseManagementCategoryClient
			entries={JSON.parse(JSON.stringify(entries))}
			facultyList={JSON.parse(JSON.stringify(facultyList))}
			category={categoryEnum}
			categoryLabel={categoryLabel}
		/>
	);
}

export default async function CaseManagementCategoryPage({
	params,
}: PageParams) {
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
					description={`${cat.subCategories.length} case types — click any row to edit inline`}
				/>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<CategoryData categoryEnum={cat.enumValue} categoryLabel={cat.label} />
			</Suspense>
		</div>
	);
}
