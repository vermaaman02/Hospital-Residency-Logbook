/**
 * @module ProcedureCategoryPage
 * @description List all procedure log entries for a specific procedure category.
 * Shows entries in a table with date, patient info, diagnosis, skill level, status.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcedureLogTable } from "@/components/tables/ProcedureLogTable";
import {
	getMyProcedureLogEntries,
	submitProcedureLogEntry,
	deleteProcedureLogEntry,
} from "@/actions/procedure-logs";
import { getProcedureBySlug } from "@/lib/constants/procedure-categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ category: string }>;
}

async function ProcedureEntries({
	categorySlug,
	categoryEnum,
	categoryLabel,
	maxEntries,
}: {
	categorySlug: string;
	categoryEnum: string;
	categoryLabel: string;
	maxEntries: number;
}) {
	const entries = await getMyProcedureLogEntries(categoryEnum);

	return (
		<ProcedureLogTable
			entries={JSON.parse(JSON.stringify(entries))}
			categorySlug={categorySlug}
			categoryLabel={categoryLabel}
			maxEntries={maxEntries}
			onSubmit={submitProcedureLogEntry}
			onDelete={deleteProcedureLogEntry}
		/>
	);
}

export default async function ProcedureCategoryPage({ params }: PageParams) {
	const { category: categorySlug } = await params;
	const cat = getProcedureBySlug(categorySlug);

	if (!cat) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student/procedures">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={cat.label}
					description={`Target: ${cat.maxEntries} entries — ${cat.isCpr ? "S / TM / TL tracking" : "S / O / A / PS / PI tracking"}`}
				/>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<ProcedureEntries
					categorySlug={categorySlug}
					categoryEnum={cat.enumValue}
					categoryLabel={cat.label}
					maxEntries={cat.maxEntries}
				/>
			</Suspense>
		</div>
	);
}
