/**
 * @module NewProcedureLogEntryPage
 * @description Create a new procedure log entry for a specific category.
 * Dynamically selects skill level options (S/O/A/PS/PI vs S/TM/TL) based on CPR status.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcedureLogEntryForm } from "@/components/forms/ProcedureLogEntryForm";
import { createProcedureLogEntry } from "@/actions/procedure-logs";
import { getProcedureBySlug } from "@/lib/constants/procedure-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

export default async function NewProcedureLogEntryPage({
	params,
}: PageParams) {
	const { category: categorySlug } = await params;
	const cat = getProcedureBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href={`/dashboard/student/procedures/${categorySlug}`}>
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={`New Entry — ${cat.label}`}
					description={`Log a new procedure for ${cat.label}`}
				/>
			</div>

			<ProcedureLogEntryForm
				categoryEnum={cat.enumValue}
				categoryLabel={cat.label}
				categorySlug={categorySlug}
				isCpr={cat.isCpr ?? false}
				onCreateAction={createProcedureLogEntry as never}
			/>
		</div>
	);
}
