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
import { getEnabledRotationsForStudent } from "@/actions/rotation-posting-config";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";
import { RotationPostingsClient } from "./RotationPostingsClient";

interface StudentRotationScopeSource {
	batchId: string | null;
	batch: string | null;
	currentSemester: number | null;
	departmentId: string | null;
	department: string | null;
}

async function resolveStudentRotationScope(user: StudentRotationScopeSource) {
	const batchById =
		user.batchId ?
			await prisma.batch.findUnique({
				where: { id: user.batchId },
				select: { id: true, currentSemester: true },
			})
		:	null;
	const batchByName =
		!batchById && user.batch ?
			await prisma.batch.findFirst({
				where: { name: user.batch },
				select: { id: true, currentSemester: true },
			})
		:	null;
	const fallbackBatch =
		!batchById && !batchByName ?
			await prisma.batch.findFirst({
				where: { isActive: true },
				orderBy: { name: "asc" },
				select: { id: true, currentSemester: true },
			})
		:	null;

	const departmentById =
		user.departmentId ?
			await prisma.department.findUnique({
				where: { id: user.departmentId },
				select: { id: true },
			})
		:	null;
	const departmentByName =
		!departmentById && user.department ?
			await prisma.department.findFirst({
				where: { name: user.department },
				select: { id: true },
			})
		:	null;
	const fallbackDepartment =
		!departmentById && !departmentByName ?
			await prisma.department.findFirst({
				where: { isActive: true },
				orderBy: { name: "asc" },
				select: { id: true },
			})
		:	null;

	return {
		batchId: batchById?.id ?? batchByName?.id ?? fallbackBatch?.id ?? null,
		semester:
			user.currentSemester ??
			batchById?.currentSemester ??
			batchByName?.currentSemester ??
			fallbackBatch?.currentSemester ??
			null,
		departmentId:
			departmentById?.id ??
			departmentByName?.id ??
			fallbackDepartment?.id ??
			null,
	};
}

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
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batchId: true,
			batch: true,
			currentSemester: true,
			departmentId: true,
			department: true,
		},
	});
	if (!user) redirect("/sign-in");

	const studentName =
		`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Student";
	const rotationScope = await resolveStudentRotationScope(user);
	const fallbackDisabledRotations = ROTATION_POSTINGS.map((rotation) => ({
		rotationSlNo: rotation.slNo,
		rotationName: rotation.name,
		isElective: rotation.isElective,
		isEnabled: false,
	}));

	// Fetch enabled rotations (fail-closed: unresolved scope = all disabled)
	let enabledRotations = fallbackDisabledRotations;
	if (
		rotationScope.batchId &&
		rotationScope.semester &&
		rotationScope.departmentId
	) {
		try {
			enabledRotations = await getEnabledRotationsForStudent(
				rotationScope.batchId,
				rotationScope.semester,
				rotationScope.departmentId,
				user.id,
			);
		} catch (error) {
			console.error("[FETCH_ENABLED_ROTATIONS]", error);
			enabledRotations = fallbackDisabledRotations;
		}
	}

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
				enabledRotations={JSON.parse(JSON.stringify(enabledRotations))}
				defaultTab={tab}
				studentName={studentName}
				userId={user.id}
			/>
		</div>
	);
}
