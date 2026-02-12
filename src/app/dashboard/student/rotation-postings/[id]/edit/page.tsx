/**
 * @module EditRotationPostingPage
 * @description Edit an existing rotation posting entry.
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RotationPostingForm } from "../../new/RotationPostingForm";
import { type EntryStatus } from "@/types";

export default async function EditRotationPostingPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const { id } = await params;

	const posting = await prisma.rotationPosting.findFirst({
		where: { id, userId },
	});

	if (!posting) notFound();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Rotation Posting"
				description={`Editing: ${posting.rotationName}`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{
						label: "Rotation Postings",
						href: "/dashboard/student/rotation-postings",
					},
					{ label: "Edit" },
				]}
			/>
			<RotationPostingForm
				initialData={{
					id: posting.id,
					rotationName: posting.rotationName,
					isElective: posting.isElective,
					startDate: posting.startDate ?? undefined,
					endDate: posting.endDate ?? undefined,
					totalDuration: posting.totalDuration ?? "",
				}}
				entryStatus={posting.status as EntryStatus}
			/>
		</div>
	);
}
