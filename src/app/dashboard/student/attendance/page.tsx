/**
 * @module Student Attendance Page
 * @description Day-by-day attendance tracking with per-entry submission & review.
 * Matches physical logbook "Attendance Sheet for Clinical Posting (MD Emergency Medicine)".
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 */

import { requireAuth, getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceClient } from "./AttendanceClient";
import {
	getMyAttendanceAnalytics,
	getMyHolidays,
	getMyAttendanceConfig,
} from "@/actions/attendance";

export default async function StudentAttendancePage() {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) redirect("/sign-in");

	// Fetch profile image directly from Clerk (works without webhooks)
	let clerkImageUrl: string | undefined;
	try {
		const clerkUser = await getAuthenticatedUser();
		clerkImageUrl = clerkUser.imageUrl ?? undefined;

		// Sync Clerk profile image to DB if missing or outdated
		if (clerkImageUrl && clerkImageUrl !== user.profileImage) {
			await prisma.user.update({
				where: { id: user.id },
				data: { profileImage: clerkImageUrl },
			});
		}
	} catch {
		// Non-critical — fall back to DB value
	}

	const profileImage = clerkImageUrl ?? user.profileImage ?? undefined;

	const [entries, facultyUsers, analytics, holidays, currentRotation, config] =
		await Promise.all([
			prisma.attendanceEntry.findMany({
				where: { attendanceSheet: { userId: user.id } },
				include: {
					attendanceSheet: {
						select: {
							id: true,
							postedDepartment: true,
							batch: true,
							weekStartDate: true,
						},
					},
				},
				orderBy: { date: "desc" },
			}),
			prisma.user.findMany({
				where: {
					role: { in: ["HOD", "FACULTY"] },
					status: "ACTIVE",
				},
				select: { firstName: true, lastName: true },
				orderBy: { firstName: "asc" },
			}),
			getMyAttendanceAnalytics(),
			getMyHolidays(),
			prisma.rotationPosting.findFirst({
				where: {
					userId: user.id,
					startDate: { lte: new Date() },
					endDate: { gte: new Date() },
				},
				select: { rotationName: true },
				orderBy: { startDate: "desc" },
			}),
			getMyAttendanceConfig(),
		]);

	const serializedEntries = JSON.parse(JSON.stringify(entries));
	const serializedHolidays = JSON.parse(JSON.stringify(holidays));
	const serializedConfig = config ? JSON.parse(JSON.stringify(config)) : null;
	const facultyNames = facultyUsers.map((u) => `${u.firstName} ${u.lastName}`);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance — Clinical Posting"
				description="Daily attendance log — MD Emergency Medicine"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Attendance" },
				]}
			/>
			<AttendanceClient
				entries={serializedEntries}
				userBatch={user.batch ?? ""}
				userId={user.id}
				userName={`${user.firstName} ${user.lastName}`}
				userProfileImage={profileImage}
				facultyNames={facultyNames}
				analytics={analytics}
				holidays={serializedHolidays}
				currentDepartment={currentRotation?.rotationName ?? ""}
				config={serializedConfig}
			/>
		</div>
	);
}
