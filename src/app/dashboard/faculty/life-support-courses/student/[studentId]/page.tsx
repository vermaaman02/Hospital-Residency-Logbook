/**
 * @module FacultyStudentCoursesPage
 * @description Faculty page to view a specific student's life-support courses.
 *
 * @see PG Logbook .md — "LIFE-SUPPORT AND OTHER SKILL DEVELOPMENT COURSES ATTENDED"
 * @see actions/life-support-courses.ts — getStudentCourses
 */

import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getStudentCourses } from "@/actions/life-support-courses";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
	params: Promise<{ studentId: string }>;
}

export default async function FacultyStudentCoursesPage({ params }: Props) {
	const { role } = await requireRole(["faculty", "hod"]);
	const { studentId } = await params;

	// Get student info
	const student = await prisma.user.findUnique({
		where: { id: studentId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			currentSemester: true,
			batchRelation: { select: { name: true } },
		},
	});

	if (!student) notFound();

	const courses = await getStudentCourses(studentId);

	const stats = {
		total: courses.length,
		signed: courses.filter((c) => c.status === "SIGNED").length,
		pending: courses.filter((c) => c.status === "SUBMITTED").length,
		needsRevision: courses.filter((c) => c.status === "NEEDS_REVISION").length,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link href={`/dashboard/${role}/life-support-courses`}>
					<Button variant="ghost" size="sm" className="gap-1.5">
						<ArrowLeft className="h-4 w-4" />
						Back
					</Button>
				</Link>
			</div>

			<PageHeader
				title={`${student.firstName} ${student.lastName}'s Courses`}
				description={`${student.batchRelation?.name ?? "Unknown Batch"} · Semester ${student.currentSemester ?? "?"}`}
			/>

			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatCard label="Total" count={stats.total} color="default" />
				<StatCard label="Signed" count={stats.signed} color="green" />
				<StatCard label="Pending" count={stats.pending} color="amber" />
				<StatCard
					label="Needs Revision"
					count={stats.needsRevision}
					color="red"
				/>
			</div>

			{/* Table */}
			<Card>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-12 text-center font-bold">
										Sl.
									</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Date
									</TableHead>
									<TableHead className="min-w-48 font-bold">
										Course Name
									</TableHead>
									<TableHead className="w-40 font-bold">Conducted At</TableHead>
									<TableHead className="w-28 text-center font-bold">
										Confidence
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Status
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{courses.map((entry) => (
									<TableRow
										key={entry.id}
										className={cn(
											entry.status === "SIGNED" && "bg-green-50/50",
											entry.status === "NEEDS_REVISION" && "bg-orange-50/50",
											entry.status === "DRAFT" && "bg-gray-50/30",
										)}
									>
										<TableCell className="text-center font-medium">
											{entry.slNo}.
										</TableCell>
										<TableCell className="text-center text-sm">
											{entry.date ?
												format(new Date(entry.date), "dd/MM/yyyy")
											:	"—"}
										</TableCell>
										<TableCell className="text-sm">
											{entry.courseName ?? (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{entry.conductedAt ?? (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-center">
											{entry.confidenceLevel ?
												<span
													className={cn(
														"px-2 py-0.5 rounded text-xs",
														entry.confidenceLevel === "VC" &&
															"bg-green-100 text-green-700",
														entry.confidenceLevel === "FC" &&
															"bg-blue-100 text-blue-700",
														entry.confidenceLevel === "SC" &&
															"bg-amber-100 text-amber-700",
														entry.confidenceLevel === "NC" &&
															"bg-red-100 text-red-700",
													)}
												>
													{entry.confidenceLevel}
												</span>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-center">
											<StatusBadge
												status={entry.status as EntryStatus}
												size="sm"
											/>
										</TableCell>
									</TableRow>
								))}
								{courses.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={6}
											className="text-center py-10 text-muted-foreground"
										>
											No courses logged yet.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({
	label,
	count,
	color,
}: {
	label: string;
	count: number;
	color: "default" | "amber" | "green" | "red";
}) {
	const colors = {
		default: "bg-gray-50 border-gray-200 text-gray-700",
		amber: "bg-amber-50 border-amber-200 text-amber-700",
		green: "bg-green-50 border-green-200 text-green-700",
		red: "bg-red-50 border-red-200 text-red-700",
	};

	return (
		<div className={cn("rounded-lg border p-3", colors[color])}>
			<div className="text-2xl font-bold">{count}</div>
			<div className="text-xs">{label}</div>
		</div>
	);
}
