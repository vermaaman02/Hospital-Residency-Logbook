/**
 * @module ConferencesPage
 * @description Student page for Conference and Other Academic Activity Participation.
 * Inline cell editing with date, conference name, conducted@, participation role.
 *
 * @see PG Logbook .md — "CONFERENCE AND OTHER ACADEMIC ACTIVITY PARTICIPATION"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConferencesClient } from "./ConferencesClient";
import {
	getMyConferences,
	getAvailableConferenceFaculty,
} from "@/actions/conferences";

async function ConferencesContent() {
	const [entries, facultyList] = await Promise.all([
		getMyConferences(),
		getAvailableConferenceFaculty(),
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
		<ConferencesClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function ConferencesPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<Award className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Conference Participation</h1>
						<p className="text-muted-foreground">
							Conferences and other academic activity participation
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
				<ConferencesContent />
			</Suspense>
		</div>
	);
}
