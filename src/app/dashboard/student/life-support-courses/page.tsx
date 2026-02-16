/**
 * @module LifeSupportCoursesPage
 * @description Student page for Life-Support and Skill Development Courses.
 * Inline cell editing with date, course name, conducted@, confidence level.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LifeSupportCoursesClient } from "./LifeSupportCoursesClient";
import {
	getMyCourses,
	getAvailableCourseFaculty,
} from "@/actions/life-support-courses";

async function LifeSupportCoursesContent() {
	const [entries, facultyList] = await Promise.all([
		getMyCourses(),
		getAvailableCourseFaculty(),
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
		<LifeSupportCoursesClient
			entries={serializedEntries}
			facultyList={serializedFaculty}
			studentName={studentName}
		/>
	);
}

export default function LifeSupportCoursesPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-2">
					<GraduationCap className="h-6 w-6 text-hospital-primary" />
					<div>
						<h1 className="text-2xl font-bold">Life-Support Courses</h1>
						<p className="text-muted-foreground">
							Life-support and other skill development courses attended
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
				<LifeSupportCoursesContent />
			</Suspense>
		</div>
	);
}
