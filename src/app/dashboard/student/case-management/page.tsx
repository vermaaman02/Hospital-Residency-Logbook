/**
 * @module CaseManagementLandingPage
 * @description Student landing page for case management. Shows all 24 categories
 * as cards with entry counts and completion stats.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
 * @see roadmap.md — Section 6D
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMyCaseManagementSummary } from "@/actions/case-management";
import { CASE_CATEGORIES, categoryEnumToSlug } from "@/lib/constants/case-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

async function CaseManagementCards() {
	const summary = await getMyCaseManagementSummary();

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{CASE_CATEGORIES.map((cat) => {
				const slug = categoryEnumToSlug(cat.enumValue);
				const total = summary.totalByCategory[cat.enumValue] ?? 0;
				const signed = summary.signedByCategory[cat.enumValue] ?? 0;
				const subCount = cat.subCategories.length;

				return (
					<Link
						key={cat.enumValue}
						href={`/dashboard/student/case-management/${slug}`}
					>
						<Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between">
									<CardTitle className="text-sm font-medium leading-tight">
										{cat.label}
									</CardTitle>
									<ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2 mb-2">
									<FileText className="h-4 w-4 text-muted-foreground" />
									<span className="text-2xl font-bold">{total}</span>
									<span className="text-sm text-muted-foreground">
										entries
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>{subCount} case types</span>
									{total > 0 && (
										<Badge variant="outline" className="text-xs">
											{signed} signed
										</Badge>
									)}
								</div>
								{total > 0 && (
									<div className="w-full bg-muted rounded-full h-1.5 mt-2">
										<div
											className="bg-hospital-secondary rounded-full h-1.5 transition-all"
											style={{
												width: `${total > 0 ? (signed / total) * 100 : 0}%`,
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

export default function CaseManagementPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Case Management Logs"
				description="Log cases across all 24 emergency medicine categories with 308 case types. Track your competency progression from CBD → S → O → MS → MI."
			/>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				}
			>
				<CaseManagementCards />
			</Suspense>
		</div>
	);
}
