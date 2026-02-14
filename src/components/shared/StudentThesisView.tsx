/**
 * @module StudentThesisView
 * @description Read-only view of a student's thesis record (topic, guide, committee).
 * Used by faculty/HOD to view a student's thesis logbook page.
 *
 * @see PG Logbook .md — "THESIS" section
 */

"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, User, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface SemesterRecord {
	id: string;
	semester: number;
	srJrMember: string | null;
	srMember: string | null;
	facultyMember: string | null;
}

export interface ThesisViewData {
	id: string;
	topic: string | null;
	chiefGuide: string | null;
	status: string;
	facultyRemark: string | null;
	semesterRecords: SemesterRecord[];
}

interface StudentThesisViewProps {
	thesis: ThesisViewData | null;
	studentName: string;
}

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-700",
	SUBMITTED: "bg-amber-100 text-amber-700",
	SIGNED: "bg-green-100 text-green-700",
	NEEDS_REVISION: "bg-red-100 text-red-700",
};

export function StudentThesisView({
	thesis,
	studentName,
}: StudentThesisViewProps) {
	if (!thesis) {
		return (
			<Card>
				<CardContent className="py-12 text-center text-muted-foreground">
					<BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="text-lg font-medium">No Thesis Record</p>
					<p className="text-sm mt-1">
						{studentName} has not created a thesis record yet.
					</p>
				</CardContent>
			</Card>
		);
	}

	const filledSemesters = thesis.semesterRecords.filter(
		(r) => r.srJrMember || r.srMember || r.facultyMember,
	).length;

	return (
		<div className="space-y-6">
			{/* Summary Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-50 rounded-lg">
								<FileText className="h-5 w-5 text-hospital-primary" />
							</div>
							<div>
								<p className="text-sm font-semibold">
									{thesis.topic ? "Topic Set" : "No Topic"}
								</p>
								<p className="text-xs text-muted-foreground">Thesis Topic</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-50 rounded-lg">
								<User className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<p className="text-sm font-semibold">
									{thesis.chiefGuide || "Not Assigned"}
								</p>
								<p className="text-xs text-muted-foreground">Chief Guide</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-amber-50 rounded-lg">
								<CalendarDays className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<p className="text-sm font-semibold">{filledSemesters} / 6</p>
								<p className="text-xs text-muted-foreground">
									Semesters Filled
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Thesis Details */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<BookOpen className="h-5 w-5 text-hospital-primary" />
							<CardTitle>Thesis Record</CardTitle>
						</div>
						<Badge
							className={cn(
								"text-xs",
								STATUS_COLORS[thesis.status] ?? "bg-gray-100",
							)}
						>
							{thesis.status === "NEEDS_REVISION" ? "Revision" : thesis.status}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Topic */}
					<div className="rounded-lg border p-4 space-y-3">
						<div>
							<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Thesis Topic
							</label>
							<p className="text-sm font-medium mt-1">
								{thesis.topic || (
									<span className="text-muted-foreground italic">Not set</span>
								)}
							</p>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Chief Guide
							</label>
							<p className="text-sm font-medium mt-1">
								{thesis.chiefGuide || (
									<span className="text-muted-foreground italic">
										Not assigned
									</span>
								)}
							</p>
						</div>
					</div>

					{/* Faculty Remark */}
					{thesis.facultyRemark && (
						<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
							<span className="font-medium">Faculty Remark:</span>{" "}
							{thesis.facultyRemark}
						</div>
					)}

					{/* Semester Committee Table */}
					<div>
						<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Semester-wise Thesis Review Committee
						</label>
						<div className="mt-2 border rounded-lg overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="text-center font-bold w-14">
											Sem
										</TableHead>
										<TableHead className="font-bold text-xs">
											SR/JR Member
										</TableHead>
										<TableHead className="font-bold text-xs">
											SR Member
										</TableHead>
										<TableHead className="font-bold text-xs">
											Faculty Member
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{[1, 2, 3, 4, 5, 6].map((sem) => {
										const record = thesis.semesterRecords.find(
											(r) => r.semester === sem,
										);
										const hasFill =
											record?.srJrMember ||
											record?.srMember ||
											record?.facultyMember;
										return (
											<TableRow
												key={sem}
												className={cn(
													!hasFill && "text-muted-foreground/50",
													hasFill && "bg-green-50/40",
												)}
											>
												<TableCell className="text-center font-bold text-hospital-primary">
													{sem}
												</TableCell>
												<TableCell className="text-sm">
													{record?.srJrMember || (
														<span className="text-muted-foreground/40">—</span>
													)}
												</TableCell>
												<TableCell className="text-sm">
													{record?.srMember || (
														<span className="text-muted-foreground/40">—</span>
													)}
												</TableCell>
												<TableCell className="text-sm">
													{record?.facultyMember || (
														<span className="text-muted-foreground/40">—</span>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
