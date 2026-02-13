/**
 * @module EditCourseAttendedPage
 * @description Edit an existing course entry (H1).
 *
 * @see PG Logbook .md — "Life-Support and Other Skill Development Courses Attended"
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
	getMyCourseAttendedEntry,
	updateCourseAttended,
} from "@/actions/courses-conferences";
import { ProfessionalEntryForm } from "@/components/forms/ProfessionalEntryForm";
import {
	COURSE_ATTENDED_FIELDS,
	PROFESSIONAL_CATEGORIES,
} from "@/lib/constants/professional-fields";

interface EditCoursePageProps {
	params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
	const { id } = await params;
	const entry = await getMyCourseAttendedEntry(id);
	if (!entry) return notFound();
	if (entry.status === "SIGNED")
		redirect("/dashboard/student/courses-conferences");

	const H1 = PROFESSIONAL_CATEGORIES.COURSES;

	const initialData: Record<string, unknown> = {
		date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
		courseName: entry.courseName ?? "",
		conductedAt: entry.conductedAt ?? "",
		confidenceLevel: entry.confidenceLevel ?? "",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/student/courses-conferences">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Edit Course Entry</h1>
					<p className="text-muted-foreground">{H1.label}</p>
				</div>
			</div>

			<ProfessionalEntryForm
				formType="course"
				fields={COURSE_ATTENDED_FIELDS}
				title="Course Entry"
				description={H1.label}
				redirectPath="/dashboard/student/courses-conferences"
				initialData={initialData}
				entryId={id}
				onCreateAction={(() => ({ success: false })) as never}
				onUpdateAction={updateCourseAttended as never}
			/>
		</div>
	);
}
