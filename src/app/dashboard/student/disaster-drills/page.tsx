/**
 * @module DisasterDrillsPage
 * @description Student page for Major Incident Planning / Disaster Drills / Mass Casualty.
 * Inline cell editing with date, description, role, faculty.
 *
 * @see PG Logbook .md — "MAJOR INCIDENT PLANNING/ DISASTER MANAGEMENT DRILL/ MASS CASUALTY MANAGEMENT/PREHOSPITAL EM"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Siren, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DisasterDrillsClient } from "./DisasterDrillsClient";
import {
	getMyDisasterDrills,
	getAvailableDisasterFaculty,
} from "@/actions/disaster-drills";

async function DisasterDrillsContent() {
	const [entries, facultyList] = await Promise.all([
		getMyDisasterDrills(),
		getAvailableDisasterFaculty(),
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
		<DisasterDrillsClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function DisasterDrillsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<Siren className="h-6 w-6 text-hospital-accent" />
					<div>
						<h1 className="text-2xl font-bold">
							Disaster Management & Mass Casualty
						</h1>
						<p className="text-muted-foreground">
							Major Incident Planning / Disaster Drills / Prehospital EM
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
				<DisasterDrillsContent />
			</Suspense>
		</div>
	);
}
