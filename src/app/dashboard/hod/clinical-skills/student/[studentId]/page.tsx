/**
 * @module HOD Clinical Skill Student View
 * @description HOD view of a specific student's clinical skill entries (read-only).
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

import { requireRole } from "@/lib/auth";
import { getStudentClinicalSkills } from "@/actions/clinical-skills";
import { getStudentBasicInfo } from "@/actions/case-presentations";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentClinicalSkillView } from "@/components/shared/StudentClinicalSkillView";

interface PageProps {
	params: Promise<{ studentId: string }>;
}

export default async function HodClinicalSkillStudentPage({
	params,
}: PageProps) {
	await requireRole(["hod"]);
	const { studentId } = await params;

	const [adultEntries, pediatricEntries, student] = await Promise.all([
		getStudentClinicalSkills(studentId, "adult"),
		getStudentClinicalSkills(studentId, "pediatric"),
		getStudentBasicInfo(studentId),
	]);

	const adultSerialized = JSON.parse(JSON.stringify(adultEntries));
	const pediatricSerialized = JSON.parse(JSON.stringify(pediatricEntries));
	const studentName = `${student.firstName} ${student.lastName}`;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`${studentName} — Clinical Skills`}
				description={`${student.batchRelation?.name ?? "—"} · Semester ${student.currentSemester ?? "—"} — View Only`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{
						label: "Clinical Skills",
						href: "/dashboard/hod/clinical-skills",
					},
					{ label: studentName },
				]}
			/>
			<StudentClinicalSkillView
				adultEntries={adultSerialized}
				pediatricEntries={pediatricSerialized}
				studentName={studentName}
			/>
		</div>
	);
}
