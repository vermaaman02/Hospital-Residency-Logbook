/**
 * @module RotationPostingsPage
 * @description Unified 3-tab page for Rotation Postings, Thesis, and Training & Mentoring.
 * Matches the physical logbook's LOG OF ROTATION POSTINGS section.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING POST GRADUATION IN EM"
 * @see PG Logbook .md — Thesis section
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
	getMyRotationPostings,
	getAllFacultyForDropdown,
} from "@/actions/rotation-postings";
import { getMyThesis } from "@/actions/thesis";
import { getStudentTrainingRecords } from "@/actions/training-mentoring";
import { RotationPostingsClient } from "./RotationPostingsClient";

export default async function RotationPostingsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const { tab } = await searchParams;
	let clerkId: string;
	try {
		clerkId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const user = await prisma.user.findUnique({
		where: { clerkId },
		select: { id: true, firstName: true, lastName: true },
	});
	if (!user) redirect("/sign-in");

	const studentName =
		`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Student";

	// Fetch all data in parallel
	const [postings, thesis, trainingRecords, facultyList] = await Promise.all([
		getMyRotationPostings(),
		getMyThesis(),
		getStudentTrainingRecords(),
		getAllFacultyForDropdown(),
	]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Log of Rotation Postings"
				description="Log of Rotation Postings During Post Graduation in EM — 7 core + 13 elective departments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Rotation Postings" },
				]}
			/>

			<RotationPostingsClient
				postings={JSON.parse(JSON.stringify(postings))}
				thesis={JSON.parse(JSON.stringify(thesis))}
				trainingRecords={JSON.parse(JSON.stringify(trainingRecords))}
				facultyList={JSON.parse(JSON.stringify(facultyList))}
				defaultTab={tab}
				studentName={studentName}
			/>
		</div>
	);
}
