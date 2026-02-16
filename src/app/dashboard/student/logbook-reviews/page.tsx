/**
 * @module LogbookReviewsPage
 * @description Student page for Periodic Logbook Faculty Review.
 * Inline cell editing with review no (SEM 1-6), date, description, role, faculty.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION: PERIODIC LOG BOOK FACULTY REVIEW"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogbookReviewsClient } from "./LogbookReviewsClient";
import {
	getMyLogbookReviews,
	getAvailableLogbookFaculty,
} from "@/actions/logbook-reviews";

async function LogbookReviewsContent() {
	const [entries, facultyList] = await Promise.all([
		getMyLogbookReviews(),
		getAvailableLogbookFaculty(),
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
		<LogbookReviewsClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function LogbookReviewsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<ClipboardCheck className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">
							Periodic Logbook Faculty Review
						</h1>
						<p className="text-muted-foreground">
							Semester-wise faculty review of your residency logbook
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
				<LogbookReviewsContent />
			</Suspense>
		</div>
	);
}
