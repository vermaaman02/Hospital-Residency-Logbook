/**
 * @module Edit Case Presentation Page
 * @description Edit an existing case presentation entry.
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CasePresentationForm } from "../../new/CasePresentationForm";

interface EditCasePresentationPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditCasePresentationPage({
	params,
}: EditCasePresentationPageProps) {
	const { id } = await params;
	const userId = await requireAuth();

	const entry = await prisma.casePresentation.findUnique({
		where: { id },
	});

	if (!entry || entry.userId !== userId) {
		notFound();
	}

	if (entry.status === "SIGNED") {
		notFound();
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Case Presentation"
				description={`Editing entry #${entry.slNo}`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Case Presentations", href: "/dashboard/student/case-presentations" },
					{ label: "Edit" },
				]}
			/>
			<CasePresentationForm initialData={entry} />
		</div>
	);
}
