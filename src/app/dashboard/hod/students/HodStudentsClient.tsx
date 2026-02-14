/**
 * @module HodStudentsClient
 * @description Client component for HOD to view all students with filtering and search.
 */

"use client";

import { useState } from "react";
// Card components available if needed for alternate layout
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Users, GraduationCap } from "lucide-react";

interface StudentData {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	batch: string | null;
	currentSemester: number | null;
	profileImage: string | null;
	logCounts: {
		caseManagement: number;
		procedures: number;
		diagnostics: number;
		imaging: number;
		academic: number;
		evaluations: number;
	};
	totalLogs: number;
	assignedFaculty: { semester: number; facultyName: string }[];
}

interface HodStudentsClientProps {
	students: StudentData[];
}

export function HodStudentsClient({ students }: HodStudentsClientProps) {
	const [search, setSearch] = useState("");
	const [batchFilter, setBatchFilter] = useState<string>("all");
	const [semesterFilter, setSemesterFilter] = useState<string>("all");

	// Unique batches
	const batches = Array.from(
		new Set(students.map((s) => s.batch).filter(Boolean)),
	) as string[];

	const filtered = students.filter((s) => {
		const matchesSearch =
			s.firstName.toLowerCase().includes(search.toLowerCase()) ||
			s.lastName.toLowerCase().includes(search.toLowerCase()) ||
			s.email.toLowerCase().includes(search.toLowerCase());
		const matchesBatch = batchFilter === "all" || s.batch === batchFilter;
		const matchesSemester =
			semesterFilter === "all" ||
			s.currentSemester?.toString() === semesterFilter;
		return matchesSearch && matchesBatch && matchesSemester;
	});

	if (students.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
				<h3 className="text-lg font-medium mb-2">No Students Found</h3>
				<p className="text-sm">
					No students have been registered in the system yet.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search students..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				{batches.length > 0 && (
					<Select value={batchFilter} onValueChange={setBatchFilter}>
						<SelectTrigger className="w-44">
							<SelectValue placeholder="Filter by batch" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Batches</SelectItem>
							{batches.map((b) => (
								<SelectItem key={b} value={b}>
									{b}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<Select value={semesterFilter} onValueChange={setSemesterFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Filter by semester" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Semesters</SelectItem>
						{[1, 2, 3, 4, 5, 6].map((s) => (
							<SelectItem key={s} value={s.toString()}>
								Semester {s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Summary */}
			<p className="text-sm text-muted-foreground">
				Showing {filtered.length} of {students.length} students
			</p>

			{/* Student Table */}
			<div className="border rounded-lg overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="text-left p-3 font-medium">Student</th>
							<th className="text-left p-3 font-medium hidden sm:table-cell">
								Batch
							</th>
							<th className="text-center p-3 font-medium">Semester</th>
							<th className="text-center p-3 font-medium hidden md:table-cell">
								Cases
							</th>
							<th className="text-center p-3 font-medium hidden md:table-cell">
								Procedures
							</th>
							<th className="text-center p-3 font-medium hidden lg:table-cell">
								Diagnostics
							</th>
							<th className="text-center p-3 font-medium hidden lg:table-cell">
								Imaging
							</th>
							<th className="text-center p-3 font-medium">Total</th>
							<th className="text-left p-3 font-medium hidden xl:table-cell">
								Faculty
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((student) => (
							<tr
								key={student.id}
								className="border-b hover:bg-muted/30 transition-colors"
							>
								<td className="p-3">
									<div>
										<p className="font-medium">
											{student.firstName} {student.lastName}
										</p>
										<p className="text-xs text-muted-foreground">
											{student.email}
										</p>
									</div>
								</td>
								<td className="p-3 hidden sm:table-cell">
									{student.batch ?? "—"}
								</td>
								<td className="p-3 text-center">
									<Badge variant="outline">
										{student.currentSemester ?? "—"}
									</Badge>
								</td>
								<td className="p-3 text-center hidden md:table-cell">
									{student.logCounts.caseManagement}
								</td>
								<td className="p-3 text-center hidden md:table-cell">
									{student.logCounts.procedures}
								</td>
								<td className="p-3 text-center hidden lg:table-cell">
									{student.logCounts.diagnostics}
								</td>
								<td className="p-3 text-center hidden lg:table-cell">
									{student.logCounts.imaging}
								</td>
								<td className="p-3 text-center">
									<Badge>{student.totalLogs}</Badge>
								</td>
								<td className="p-3 hidden xl:table-cell">
									{student.assignedFaculty.length > 0 ?
										<div className="space-y-0.5">
											{student.assignedFaculty.map((f, i) => (
												<p key={i} className="text-xs">
													{f.facultyName}{" "}
													<span className="text-muted-foreground">
														(Sem {f.semester})
													</span>
												</p>
											))}
										</div>
									:	<span className="text-xs text-muted-foreground">
											Not assigned
										</span>
									}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{filtered.length === 0 && (
				<div className="text-center py-8 text-muted-foreground">
					<GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No students match your filters.</p>
				</div>
			)}
		</div>
	);
}
