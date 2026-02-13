/**
 * @module ImagingLandingPage
 * @description Landing page showing 5 imaging categories with progress tracking.
 * G1-G5: Ultrasound/Echo, POCUS Trauma, X-Ray/CT Non-Trauma, X-Ray/CT/MRI Brain, X-Ray/CT Trauma.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
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
import { ArrowLeft, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyImagingLogSummary } from "@/actions/imaging-logs";
import {
	IMAGING_CATEGORIES,
	imagingEnumToSlug,
} from "@/lib/constants/imaging-categories";

async function ImagingContent() {
	const summary = await getMyImagingLogSummary();

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{IMAGING_CATEGORIES.map((cat) => {
				const slug = imagingEnumToSlug(cat.enumValue);
				const entryCount = summary[cat.enumValue] ?? 0;
				const progressPercent =
					cat.maxEntries > 0 ?
						Math.min(100, Math.round((entryCount / cat.maxEntries) * 100))
					:	0;

				return (
					<Link key={cat.enumValue} href={`/dashboard/student/imaging/${slug}`}>
						<Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<Scan className="h-6 w-6 text-hospital-primary" />
									<Badge variant="outline" className="text-xs">
										{cat.code}
									</Badge>
								</div>
								<CardTitle className="text-base mt-2">{cat.label}</CardTitle>
								<CardDescription>
									{entryCount} of {cat.maxEntries} entries
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

export default function ImagingPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Imaging Logs</h1>
					<p className="text-muted-foreground">
						Ultrasound, POCUS, X-Ray, CT Scan, and MRI imaging analysis
					</p>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{IMAGING_CATEGORIES.map((cat) => (
							<Card key={cat.enumValue} className="animate-pulse">
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
				<ImagingContent />
			</Suspense>
		</div>
	);
}
