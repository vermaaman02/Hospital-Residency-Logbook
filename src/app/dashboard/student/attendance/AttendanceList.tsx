/**
 * @module AttendanceList
 * @description Client component to list and manage weekly attendance sheets.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Send, Trash2, Calendar, Pencil } from "lucide-react";
import { useTransition } from "react";
import {
	submitAttendanceSheet,
	deleteAttendanceSheet,
} from "@/actions/attendance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type EntryStatus } from "@/types";

interface AttendanceEntry {
	id: string;
	day: string;
	date: Date | null;
	presentAbsent: string | null;
	hodName: string | null;
}

interface AttendanceSheet {
	id: string;
	weekStartDate: Date;
	weekEndDate: Date;
	batch: string | null;
	postedDepartment: string | null;
	status: string;
	entries: AttendanceEntry[];
}

interface AttendanceListProps {
	sheets: AttendanceSheet[];
}

export function AttendanceList({ sheets }: AttendanceListProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleSubmit(id: string) {
		startTransition(async () => {
			try {
				await submitAttendanceSheet(id);
				toast.success("Submitted for HOD review");
				router.refresh();
			} catch {
				toast.error("Failed to submit");
			}
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			try {
				await deleteAttendanceSheet(id);
				toast.success("Sheet deleted");
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			}
		});
	}

	if (sheets.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
				<p className="text-lg font-medium">No attendance sheets yet</p>
				<p className="text-sm mt-1">
					Create a new weekly attendance sheet to start logging your clinical
					posting attendance.
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{sheets.map((sheet) => {
				const presentCount = sheet.entries.filter(
					(e) => e.presentAbsent?.toLowerCase() === "present",
				).length;
				const totalEntries = sheet.entries.length;

				return (
					<Card key={sheet.id}>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div>
									<CardTitle className="text-base">
										Week: {format(new Date(sheet.weekStartDate), "dd MMM yyyy")}{" "}
										– {format(new Date(sheet.weekEndDate), "dd MMM yyyy")}
									</CardTitle>
									<div className="flex gap-4 text-sm text-muted-foreground mt-1">
										{sheet.batch && <span>Batch: {sheet.batch}</span>}
										{sheet.postedDepartment && (
											<span>Dept: {sheet.postedDepartment}</span>
										)}
										<span>
											Attendance: {presentCount}/{totalEntries} days
										</span>
									</div>
								</div>
								<StatusBadge status={sheet.status as EntryStatus} size="sm" />
							</div>
						</CardHeader>
						<CardContent>
							{/* Day-wise summary */}
							<div className="grid grid-cols-7 gap-1 mb-3">
								{sheet.entries.map((entry) => (
									<div
										key={entry.id}
										className={`text-center text-xs p-1.5 rounded ${
											entry.presentAbsent?.toLowerCase() === "present" ?
												"bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
											: entry.presentAbsent?.toLowerCase() === "absent" ?
												"bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
											:	"bg-gray-100 dark:bg-gray-800 text-gray-500"
										}`}
									>
										<div className="font-medium">{entry.day.slice(0, 3)}</div>
										<div>{entry.presentAbsent ?? "—"}</div>
									</div>
								))}
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2">
								{(sheet.status === "DRAFT" ||
									sheet.status === "NEEDS_REVISION") && (
									<>
										<Link
											href={`/dashboard/student/attendance/${sheet.id}/edit`}
										>
											<Button variant="outline" size="sm">
												<Pencil className="h-3.5 w-3.5 mr-1" />
												Edit
											</Button>
										</Link>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleSubmit(sheet.id)}
											disabled={isPending}
										>
											<Send className="h-3.5 w-3.5 mr-1" />
											Submit for Review
										</Button>
									</>
								)}
								{sheet.status === "DRAFT" && (
									<Button
										variant="outline"
										size="sm"
										className="text-destructive hover:text-destructive"
										onClick={() => handleDelete(sheet.id)}
										disabled={isPending}
									>
										<Trash2 className="h-3.5 w-3.5 mr-1" />
										Delete
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
