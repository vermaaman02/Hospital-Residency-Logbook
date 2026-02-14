/**
 * @module AttendancePage
 * @description List all weekly attendance sheets for the current student.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting (MD Emergency Medicine)"
 * @see roadmap.md — Phase 2, A3: Weekly Attendance
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AttendanceList } from "./AttendanceList";

export default async function AttendancePage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const sheets = await prisma.attendanceSheet.findMany({
		where: { userId },
		include: {
			entries: {
				orderBy: { day: "asc" },
			},
		},
		orderBy: { weekStartDate: "desc" },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance Sheet"
				description="Weekly attendance for Clinical Posting (MD Emergency Medicine)"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Attendance" },
				]}
				actions={
					<Link href="/dashboard/student/attendance/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							New Week
						</Button>
					</Link>
				}
			/>
			<AttendanceList sheets={sheets} />
		</div>
	);
}
