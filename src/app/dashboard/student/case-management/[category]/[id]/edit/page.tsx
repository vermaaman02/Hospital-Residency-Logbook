/**
 * @module EditCaseManagementEntryPage
 * @description Edit an existing case management entry.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 */

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CaseManagementEntryForm } from "@/components/forms/CaseManagementEntryForm";
import {
	createCaseManagementEntry,
	updateCaseManagementEntry,
} from "@/actions/case-management";
import {
	getCategoryBySlug,
	getSubCategoryOptions,
} from "@/lib/constants/case-categories";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string; id: string }>;
}

export default async function EditCaseManagementEntryPage({ params }: PageParams) {
	const { category: categorySlug, id } = await params;
	const userId = await requireAuth();
	const cat = getCategoryBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	const entry = await prisma.caseManagementLog.findUnique({
		where: { id },
	});

	if (!entry || entry.userId !== userId) {
		notFound();
	}

	if (entry.status === "SIGNED") {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Case Entry — Signed"
					description="This entry has been signed and cannot be edited."
				/>
				<Button variant="outline" asChild>
					<Link href={`/dashboard/student/case-management/${categorySlug}`}>
						<ArrowLeft className="mr-2 h-4 w-4" /> Back
					</Link>
				</Button>
			</div>
		);
	}

	const subCategoryOptions = getSubCategoryOptions(cat.enumValue);

	const initialData = {
		caseSubCategory: entry.caseSubCategory,
		date: entry.date ?? new Date(),
		patientInfo: entry.patientInfo ?? "",
		completeDiagnosis: entry.completeDiagnosis ?? "",
		competencyLevel: entry.competencyLevel ?? undefined,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href={`/dashboard/student/case-management/${categorySlug}`}>
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={`Edit: ${entry.caseSubCategory}`}
					description={`Edit case entry in ${cat.label}`}
				/>
			</div>

			<CaseManagementEntryForm
				categoryEnum={cat.enumValue}
				categoryLabel={cat.label}
				categorySlug={categorySlug}
				subCategoryOptions={subCategoryOptions}
				initialData={initialData}
				entryId={id}
				onCreateAction={createCaseManagementEntry as never}
				onUpdateAction={updateCaseManagementEntry as never}
			/>
		</div>
	);
}
