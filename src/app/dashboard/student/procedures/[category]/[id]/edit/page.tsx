/**
 * @module EditProcedureLogEntryPage
 * @description Edit an existing procedure log entry.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcedureLogEntryForm } from "@/components/forms/ProcedureLogEntryForm";
import {
	createProcedureLogEntry,
	updateProcedureLogEntry,
} from "@/actions/procedure-logs";
import { getProcedureBySlug } from "@/lib/constants/procedure-categories";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string; id: string }>;
}

export default async function EditProcedureLogEntryPage({
	params,
}: PageParams) {
	const { category: categorySlug, id } = await params;
	const userId = await requireAuth();
	const cat = getProcedureBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	const entry = await prisma.procedureLog.findUnique({
		where: { id },
	});

	if (!entry || entry.userId !== userId) {
		notFound();
	}

	if (entry.status === "SIGNED") {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Procedure Entry — Signed"
					description="This entry has been signed and cannot be edited."
				/>
				<Button variant="outline" asChild>
					<Link href={`/dashboard/student/procedures/${categorySlug}`}>
						<ArrowLeft className="mr-2 h-4 w-4" /> Back
					</Link>
				</Button>
			</div>
		);
	}

	const initialData = {
		date: entry.date ?? new Date(),
		patientInfo: entry.patientInfo ?? "",
		completeDiagnosis: entry.completeDiagnosis ?? "",
		procedureDescription: entry.procedureDescription ?? "",
		performedAtLocation: entry.performedAtLocation ?? "",
		skillLevel: entry.skillLevel ?? undefined,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href={`/dashboard/student/procedures/${categorySlug}`}>
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={`Edit Procedure Entry`}
					description={`Edit procedure entry in ${cat.label}`}
				/>
			</div>

			<ProcedureLogEntryForm
				categoryEnum={cat.enumValue}
				categoryLabel={cat.label}
				categorySlug={categorySlug}
				isCpr={cat.isCpr ?? false}
				initialData={initialData}
				entryId={id}
				onCreateAction={createProcedureLogEntry as never}
				onUpdateAction={updateProcedureLogEntry as never}
			/>
		</div>
	);
}
