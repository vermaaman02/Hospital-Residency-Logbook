/**
 * @module ProcedureLogsLandingPage
 * @description Student landing page for procedure logs. Shows all 49 categories
 * as cards with entry counts, progress bars, review status indicators.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 * @see roadmap.md — Section 6E
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMyProcedureLogSummary } from "@/actions/procedure-logs";
import {
	PROCEDURE_CATEGORIES,
	procedureEnumToSlug,
} from "@/lib/constants/procedure-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Syringe,
	ArrowRight,
	CheckCircle2,
	AlertTriangle,
} from "lucide-react";
import Link from "next/link";

async function ProcedureCards() {
	const summary = await getMyProcedureLogSummary();

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{PROCEDURE_CATEGORIES.map((cat) => {
				const slug = procedureEnumToSlug(cat.enumValue);
				const filled = summary.totalByCategory[cat.enumValue] ?? 0;
				const signed = summary.signedByCategory[cat.enumValue] ?? 0;
				const submitted = summary.submittedByCategory[cat.enumValue] ?? 0;
				const needsRevision =
					summary.needsRevisionByCategory[cat.enumValue] ?? 0;
				const progress =
					cat.maxEntries > 0 ? Math.round((filled / cat.maxEntries) * 100) : 0;

				return (
					<Link
						key={cat.enumValue}
						href={`/dashboard/student/procedures/${slug}`}
					>
						<Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between">
									<CardTitle className="text-sm font-medium leading-tight">
										{cat.label}
									</CardTitle>
									<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2 mb-2">
									<Syringe className="h-4 w-4 text-muted-foreground" />
									<span className="text-2xl font-bold">{filled}</span>
									<span className="text-sm text-muted-foreground">
										/ {cat.maxEntries}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>
										{cat.isCpr ? "S / TM / TL" : "S / O / A / PS / PI"}
									</span>
									{signed > 0 && (
										<Badge variant="outline" className="text-xs gap-1">
											<CheckCircle2 className="h-3 w-3 text-green-600" />
											{signed} signed
										</Badge>
									)}
								</div>
								{needsRevision > 0 && (
									<div className="flex items-center gap-1 mt-1.5 text-xs text-orange-600">
										<AlertTriangle className="h-3 w-3" />
										{needsRevision} need
										{needsRevision === 1 ? "s" : ""} revision
									</div>
								)}
								{submitted > 0 && signed < submitted && (
									<div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
										{submitted - signed} pending review
									</div>
								)}
								{filled > 0 && (
									<div className="w-full bg-muted rounded-full h-1.5 mt-2">
										<div
											className={`rounded-full h-1.5 transition-all ${
												progress >= 100 ?
													"bg-hospital-success"
												:	"bg-hospital-primary"
											}`}
											style={{
												width: `${Math.min(progress, 100)}%`,
											}}
										/>
									</div>
								)}
							</CardContent>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}

export default function ProcedureLogsPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Procedure Logs"
				description="Log procedures across all 49 emergency medicine categories with 1000+ entry slots. Track your skill progression from Simulation → Observed → Assisted → Performed."
			/>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<ProcedureCards />
			</Suspense>
		</div>
	);
}
