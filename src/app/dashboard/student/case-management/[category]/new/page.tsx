/**
 * @module NewCaseManagementEntryPage
 * @description Create a new case management entry for a specific category.
 * Dynamically loads sub-category options from constants.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CaseManagementEntryForm } from "@/components/forms/CaseManagementEntryForm";
import { createCaseManagementEntry } from "@/actions/case-management";
import {
	getCategoryBySlug,
	getSubCategoryOptions,
} from "@/lib/constants/case-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

export default async function NewCaseManagementEntryPage({ params }: PageParams) {
	const { category: categorySlug } = await params;
	const cat = getCategoryBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	const subCategoryOptions = getSubCategoryOptions(cat.enumValue);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href={`/dashboard/student/case-management/${categorySlug}`}>
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={`New Entry — ${cat.label}`}
					description={`Log a new case for ${cat.label}`}
				/>
			</div>

			<CaseManagementEntryForm
				categoryEnum={cat.enumValue}
				categoryLabel={cat.label}
				categorySlug={categorySlug}
				subCategoryOptions={subCategoryOptions}
				onCreateAction={createCaseManagementEntry as never}
			/>
		</div>
	);
}
