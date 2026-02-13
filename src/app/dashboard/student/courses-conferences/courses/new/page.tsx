/**
 * @module NewCourseAttendedPage
 * @description Create a new Life-Support / Skill Course entry (H1).
 *
 * @see PG Logbook .md — "Life-Support and Other Skill Development Courses Attended"
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createCourseAttended } from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	COURSE_ATTENDED_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

export default function NewCoursePage() {
	const H1 = PROFESSIONAL_CATEGORIES.COURSES;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/courses-conferences">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">New Course Entry</h1>
					<p className="text-muted-foreground">{H1.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="course"
				fields={COURSE_ATTENDED_FIELDS}
				title="Course Entry"
				description={H1.label}
				redirectPath="/dashboard/student/courses-conferences"
				onCreateAction={createCourseAttended as never}
			/>
		</div>
	);
}
