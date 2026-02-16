/**
 * @module QualityImprovementPage
 * @description Student page for Quality Improvement / Patient Safety / Clinical Audit.
 * Inline cell editing with date, description, role, faculty.
 *
 * @see PG Logbook .md — "QUALITY IMPROVEMENT/PATIENT SAFETY INITIATIVE/CLINICAL AUDIT"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QualityImprovementClient } from "./QualityImprovementClient";
import {
	getMyQualityImprovements,
	getAvailableQIFaculty,
} from "@/actions/quality-improvement";

async function QualityImprovementContent() {
	const [entries, facultyList] = await Promise.all([
		getMyQualityImprovements(),
		getAvailableQIFaculty(),
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
		<QualityImprovementClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function QualityImprovementPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<ShieldCheck className="h-6 w-6 text-hospital-secondary" />
					<div>
						<h1 className="text-2xl font-bold">
							Quality Improvement & Patient Safety
						</h1>
						<p className="text-muted-foreground">
							Quality Improvement / Patient Safety Initiative / Clinical Audit
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
				<QualityImprovementContent />
			</Suspense>
		</div>
	);
}
