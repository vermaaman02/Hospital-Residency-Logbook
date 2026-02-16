/**
 * @module ProfilePage
 * @description Universal profile management page for all user roles.
 * Uses Clerk's UserProfile component for photo upload, password change,
 * session management, and device management. Also shows logbook-specific info.
 *
 * @see copilot-instructions.md — Section 8 (Clerk integration)
 */

import { requireAuth, getCurrentRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const user = await currentUser();
	if (!user) redirect("/sign-in");

	const role = await getCurrentRole();

	// Fetch the database user for logbook-specific metadata
	const dbUser = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: {
			id: true,
			batch: true,
			currentSemester: true,
			department: true,
			status: true,
			createdAt: true,
			thesis: {
				select: { topic: true, chiefGuide: true, status: true },
			},
			assignedFaculty: {
				include: {
					faculty: {
						select: { firstName: true, lastName: true },
					},
				},
			},
			assignedStudents: {
				include: {
					student: {
						select: { firstName: true, lastName: true },
					},
				},
			},
		},
	});

	// Compute logbook stats based on role
	let logbookStats: Record<string, number> = {};
	if (role === "student" && dbUser) {
		const dbId = dbUser.id;
		const [cases, procedures, diagnostics, attendance] = await Promise.all([
			prisma.caseManagementLog.count({ where: { userId: dbId } }),
			prisma.procedureLog.count({ where: { userId: dbId } }),
			prisma.diagnosticSkill.count({ where: { userId: dbId } }),
			prisma.attendanceSheet.count({ where: { userId: dbId } }),
		]);
		logbookStats = {
			caseManagement: cases,
			procedures,
			diagnostics,
			attendance,
		};
	} else if (role === "faculty" && dbUser) {
		const signedCount = await prisma.digitalSignature.count({
			where: { signedById: dbUser.id },
		});
		logbookStats = {
			signedEntries: signedCount,
			assignedStudents: dbUser.assignedStudents.length,
		};
	}

	const roleLabel =
		role === "hod" ? "HOD"
		: role === "faculty" ? "Faculty"
		: "Student";
	const dashboardHref =
		role === "hod" ? "/dashboard/hod"
		: role === "faculty" ? "/dashboard/faculty"
		: "/dashboard/student";

	const profileData = {
		clerkId: userId,
		role: roleLabel,
		batch: dbUser?.batch ?? null,
		currentSemester: dbUser?.currentSemester ?? null,
		department: dbUser?.department ?? null,
		status: (dbUser?.status as string) ?? "ACTIVE",
		joinedAt: dbUser?.createdAt?.toISOString() ?? user.createdAt.toString(),
		thesisTopic: dbUser?.thesis?.topic ?? null,
		thesisGuide: dbUser?.thesis?.chiefGuide ?? null,
		thesisStatus: (dbUser?.thesis?.status as string) ?? null,
		assignedFaculty:
			dbUser?.assignedFaculty.map((a) => ({
				semester: a.semester,
				name: `${a.faculty.firstName} ${a.faculty.lastName}`,
			})) ?? [],
		assignedStudents:
			dbUser?.assignedStudents.map((a) => ({
				semester: a.semester,
				name: `${a.student.firstName} ${a.student.lastName}`,
			})) ?? [],
		logbookStats,
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<PageHeader
				title="My Profile"
				description="Manage your account settings, security, and view logbook information"
				breadcrumbs={[
					{ label: "Dashboard", href: dashboardHref },
					{ label: "Profile" },
				]}
			/>
			<ProfileClient profileData={profileData} />
		</div>
	);
}
