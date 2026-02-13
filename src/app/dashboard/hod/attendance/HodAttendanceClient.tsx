/**
 * @module HodAttendanceClient
 * @description Client component for HOD to view department attendance.
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceSheet {
	id: string;
	studentName: string;
	batch: string | null;
	currentSemester: number | null;
	weekStart: string;
	weekEnd: string;
	postedDepartment: string | null;
	totalDays: number;
	presentDays: number;
	absentDays: number;
	otherDays: number;
	attendancePercentage: number;
	status: string;
}

interface HodAttendanceClientProps {
	sheets: AttendanceSheet[];
}

export function HodAttendanceClient({ sheets }: HodAttendanceClientProps) {
	const [search, setSearch] = useState("");

	const filtered = sheets.filter((s) =>
		s.studentName.toLowerCase().includes(search.toLowerCase()),
	);

	if (sheets.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-50" />
				<h3 className="text-lg font-medium mb-2">No Attendance Records</h3>
				<p className="text-sm">
					No attendance records have been submitted yet.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filter */}
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search by student name..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			<p className="text-sm text-muted-foreground">
				Showing {filtered.length} of {sheets.length} records
			</p>

			{/* Table */}
			<div className="border rounded-lg overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="text-left p-3 font-medium">Student</th>
							<th className="text-left p-3 font-medium hidden sm:table-cell">
								Week
							</th>
							<th className="text-left p-3 font-medium hidden md:table-cell">
								Department
							</th>
							<th className="text-center p-3 font-medium hidden md:table-cell">
								Present
							</th>
							<th className="text-center p-3 font-medium hidden md:table-cell">
								Absent
							</th>
							<th className="text-center p-3 font-medium hidden lg:table-cell">
								Other
							</th>
							<th className="text-center p-3 font-medium">Attendance %</th>
							<th className="text-center p-3 font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((sheet) => (
							<tr
								key={sheet.id}
								className="border-b hover:bg-muted/30 transition-colors"
							>
								<td className="p-3">
									<p className="font-medium">{sheet.studentName}</p>
									{sheet.batch && (
										<p className="text-xs text-muted-foreground">
											{sheet.batch}
										</p>
									)}
								</td>
								<td className="p-3 hidden sm:table-cell text-xs">
									{sheet.weekStart} — {sheet.weekEnd}
								</td>
								<td className="p-3 hidden md:table-cell">
									{sheet.postedDepartment ?? "—"}
								</td>
								<td className="p-3 text-center hidden md:table-cell">
									{sheet.presentDays}
								</td>
								<td className="p-3 text-center hidden md:table-cell">
									{sheet.absentDays}
								</td>
								<td className="p-3 text-center hidden lg:table-cell">
									{sheet.otherDays}
								</td>
								<td className="p-3 text-center">
									<span
										className={cn(
											"font-medium",
											sheet.attendancePercentage >= 80 ? "text-emerald-600"
											: sheet.attendancePercentage >= 60 ? "text-amber-600"
											: "text-destructive",
										)}
									>
										{sheet.attendancePercentage}%
									</span>
								</td>
								<td className="p-3 text-center">
									<Badge
										variant={
											sheet.status === "SIGNED" ? "default"
											: sheet.status === "SUBMITTED" ?
												"secondary"
											:	"outline"
										}
										className="text-xs"
									>
										{sheet.status}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{filtered.length === 0 && (
				<div className="text-center py-8 text-muted-foreground">
					<CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No attendance records match your search.</p>
				</div>
			)}
		</div>
	);
}
