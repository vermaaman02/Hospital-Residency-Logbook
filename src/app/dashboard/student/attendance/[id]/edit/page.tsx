/**
 * @module EditAttendancePage
 * @description Edit an existing attendance sheet.
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceSheetForm } from "../../new/AttendanceSheetForm";

export default async function EditAttendancePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const { id } = await params;

	const sheet = await prisma.attendanceSheet.findFirst({
		where: { id, userId },
		include: {
			entries: {
				orderBy: { day: "asc" },
			},
		},
	});

	if (!sheet) notFound();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Attendance Sheet"
				description="Update your weekly attendance record"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Attendance", href: "/dashboard/student/attendance" },
					{ label: "Edit" },
				]}
			/>
			<AttendanceSheetForm
				initialData={{
					id: sheet.id,
					weekStartDate: sheet.weekStartDate,
					weekEndDate: sheet.weekEndDate,
					batch: sheet.batch,
					postedDepartment: sheet.postedDepartment,
					entries: sheet.entries.map((e) => ({
						day: e.day,
						date: e.date,
						presentAbsent: e.presentAbsent,
						hodName: e.hodName,
					})),
				}}
			/>
		</div>
	);
}
