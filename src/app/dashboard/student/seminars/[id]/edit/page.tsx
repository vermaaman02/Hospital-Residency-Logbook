/**
 * @module Edit Seminar Page
 * @description Edit an existing seminar entry.
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeminarForm } from "../../new/SeminarForm";

interface EditSeminarPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditSeminarPage({
	params,
}: EditSeminarPageProps) {
	const { id } = await params;
	const userId = await requireAuth();

	const entry = await prisma.seminar.findUnique({
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
				title="Edit Seminar"
				description={`Editing entry #${entry.slNo}`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Seminars", href: "/dashboard/student/seminars" },
					{ label: "Edit" },
				]}
			/>
			<SeminarForm initialData={entry} />
		</div>
	);
}
