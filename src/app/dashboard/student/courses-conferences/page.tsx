/**
 * @module CoursesConferencesLandingPage
 * @description Landing for H1 (Courses) and H2 (Conferences) with tabbed sections.
 *
 * @see PG Logbook .md — "Life-Support Courses", "Conference Participation"
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap } from "lucide-react";
import {
	getMyCourseAttended,
	getMyConferenceParticipation,
} from "@/actions/courses-conferences";
import {
	submitCourseAttended,
	deleteCourseAttended,
	submitConferenceParticipation,
	deleteConferenceParticipation,
} from "@/actions/courses-conferences";
import { ProfessionalEntryTable } from "@/components/tables/ProfessionalEntryTable";
import { PROFESSIONAL_CATEGORIES } from "@/lib/constants/professional-fields";

async function CoursesConferencesContent() {
	const [courses, conferences] = await Promise.all([
		getMyCourseAttended(),
		getMyConferenceParticipation(),
	]);

	const serializedCourses = JSON.parse(JSON.stringify(courses));
	const serializedConferences = JSON.parse(JSON.stringify(conferences));

	const H1 = PROFESSIONAL_CATEGORIES.COURSES;
	const H2 = PROFESSIONAL_CATEGORIES.CONFERENCES;

	return (
		<div className="space-y-8">
			<ProfessionalEntryTable
				entries={serializedCourses}
				title={H1.shortLabel}
				description={H1.label}
				code={H1.code}
				maxEntries={H1.maxEntries}
				columns={[
					{ key: "courseName", label: "Course Name" },
					{ key: "conductedAt", label: "Conducted@", className: "w-36" },
					{ key: "confidenceLevel", label: "Confidence", className: "w-28" },
				]}
				newEntryHref="/dashboard/student/courses-conferences/courses/new"
				editHrefPrefix="/dashboard/student/courses-conferences/courses"
				onSubmit={submitCourseAttended as never}
				onDelete={deleteCourseAttended as never}
			/>

			<ProfessionalEntryTable
				entries={serializedConferences}
				title={H2.shortLabel}
				description={H2.label}
				code={H2.code}
				maxEntries={H2.maxEntries}
				columns={[
					{ key: "conferenceName", label: "Conference / Activity" },
					{ key: "conductedAt", label: "Conducted@", className: "w-36" },
					{ key: "participationRole", label: "Role", className: "w-28" },
				]}
				newEntryHref="/dashboard/student/courses-conferences/conferences/new"
				editHrefPrefix="/dashboard/student/courses-conferences/conferences"
				onSubmit={submitConferenceParticipation as never}
				onDelete={deleteConferenceParticipation as never}
			/>
		</div>
	);
}

export default function CoursesConferencesPage() {
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
						<h1 className="text-2xl font-bold">Courses & Conferences</h1>
						<p className="text-muted-foreground">
							Life-support courses and academic conference participation
						</p>
					</div>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="space-y-8">
						{[1, 2].map((i) => (
							<div key={i} className="animate-pulse border rounded-lg p-6">
								<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
								<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6" />
								<div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
							</div>
						))}
					</div>
				}
			>
				<CoursesConferencesContent />
			</Suspense>
		</div>
	);
}
