/**
 * @module ResearchActivitiesPage
 * @description Student page for Other Research/Team Building/Teaching & Training/
 * Community Outreach Activity. Inline cell editing with date, activity,
 * conducted@, participation role.
 *
 * @see PG Logbook .md — "OTHER RESEARCH/ TEAM BUILDING/TEACHING & TRAINING/ COMMUNITY OUTREACH ACTIVITY"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResearchActivitiesClient } from "./ResearchActivitiesClient";
import {
	getMyResearchActivities,
	getAvailableResearchFaculty,
} from "@/actions/research-activities";

async function ResearchActivitiesContent() {
	const [entries, facultyList] = await Promise.all([
		getMyResearchActivities(),
		getAvailableResearchFaculty(),
	]);

	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({
		where: { clerkId },
		select: { firstName: true, lastName: true },
	});

	const studentName =
		user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Student";

	const serializedEntries = JSON.parse(JSON.stringify(entries));
	const serializedFaculty = JSON.parse(JSON.stringify(facultyList));

	return (
		<ResearchActivitiesClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function ResearchActivitiesPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<FlaskConical className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Research & Outreach</h1>
						<p className="text-muted-foreground">
							Research, team building, teaching & training, community outreach
							activities
						</p>
					</div>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-hospital-primary" />
					</div>
				}
			>
				<ResearchActivitiesContent />
			</Suspense>
		</div>
	);
}
