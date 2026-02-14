/**
 * @module DiagnosticsLandingPage
 * @description Landing page showing 3 diagnostic skill categories.
 * ABG Analysis (10 skills), ECG Analysis (10 skills), Other Diagnostic (10 skills).
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

import { Suspense } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, HeartPulse, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyDiagnosticSkillSummary } from "@/actions/diagnostic-skills";
import {
	DIAGNOSTIC_CATEGORY_LABELS,
	DIAGNOSTIC_SKILLS_BY_CATEGORY,
	diagnosticEnumToSlug,
} from "@/lib/constants/diagnostic-types";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
	ABG_ANALYSIS: <Activity className="h-6 w-6 text-red-500" />,
	ECG_ANALYSIS: <HeartPulse className="h-6 w-6 text-blue-500" />,
	OTHER_DIAGNOSTIC: <Microscope className="h-6 w-6 text-green-500" />,
};

async function DiagnosticsContent() {
	const summary = await getMyDiagnosticSkillSummary();
	const categories = Object.keys(DIAGNOSTIC_CATEGORY_LABELS);

	return (
		<div className="grid gap-4 md:grid-cols-3">
			{categories.map((enumValue) => {
				const slug = diagnosticEnumToSlug(enumValue);
				const label = DIAGNOSTIC_CATEGORY_LABELS[enumValue] ?? enumValue;
				const skills =
					DIAGNOSTIC_SKILLS_BY_CATEGORY[
						enumValue as keyof typeof DIAGNOSTIC_SKILLS_BY_CATEGORY
					] ?? [];
				const totalSkills = skills.length;
				const entryCount = summary[enumValue] ?? 0;
				const progressPercent =
					totalSkills > 0 ?
						Math.min(100, Math.round((entryCount / totalSkills) * 100))
					:	0;

				return (
					<Link key={enumValue} href={`/dashboard/student/diagnostics/${slug}`}>
						<Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									{CATEGORY_ICONS[enumValue] ?? (
										<Microscope className="h-6 w-6 text-gray-500" />
									)}
									<Badge variant="outline" className="text-xs">
										{totalSkills} skills
									</Badge>
								</div>
								<CardTitle className="text-base mt-2">{label}</CardTitle>
								<CardDescription>
									{entryCount} of {totalSkills} skills logged
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className="bg-hospital-primary h-2 rounded-full transition-all duration-500"
										style={{ width: `${progressPercent}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground mt-1 text-right">
									{progressPercent}%
								</p>
							</CardContent>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}

export default function DiagnosticsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Diagnostic Skills</h1>
					<p className="text-muted-foreground">
						ABG Analysis, ECG Analysis, and Other Diagnostic Investigations
					</p>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="grid gap-4 md:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader className="pb-3">
									<div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-8" />
									<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2" />
									<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-1" />
								</CardHeader>
								<CardContent>
									<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
								</CardContent>
							</Card>
						))}
					</div>
				}
			>
				<DiagnosticsContent />
			</Suspense>
		</div>
	);
}
