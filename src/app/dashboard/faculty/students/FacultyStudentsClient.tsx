/**
 * @module FacultyStudentsClient
 * @description Client component for displaying faculty's assigned students.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Search,
	Users,
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	BookOpen,
} from "lucide-react";

interface StudentData {
	assignmentId: string;
	semester: number;
	studentId: string;
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
		casePresentations: number;
		seminars: number;
		journalClubs: number;
	};
}

interface FacultyStudentsClientProps {
	students: StudentData[];
}

export function FacultyStudentsClient({
	students,
}: FacultyStudentsClientProps) {
	const [search, setSearch] = useState("");

	const filtered = students.filter(
		(s) =>
			s.firstName.toLowerCase().includes(search.toLowerCase()) ||
			s.lastName.toLowerCase().includes(search.toLowerCase()) ||
			s.email.toLowerCase().includes(search.toLowerCase()),
	);

	const totalLogs = (s: StudentData) =>
		Object.values(s.logCounts).reduce((a, b) => a + b, 0);

	if (students.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
				<h3 className="text-lg font-medium mb-2">No Students Assigned</h3>
				<p className="text-sm">
					Student assignments are managed by the HOD. Contact the HOD to get
					students assigned to you.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search students..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			{/* Summary */}
			<p className="text-sm text-muted-foreground">
				{filtered.length} student{filtered.length !== 1 ? "s" : ""} assigned
			</p>

			{/* Student Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{filtered.map((student) => (
					<Card
						key={student.assignmentId}
						className="hover:shadow-md transition-shadow"
					>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div>
									<CardTitle className="text-base">
										{student.firstName} {student.lastName}
									</CardTitle>
									<p className="text-xs text-muted-foreground mt-1">
										{student.email}
									</p>
								</div>
								<Badge variant="outline">
									Sem {student.currentSemester ?? student.semester}
								</Badge>
							</div>
							{student.batch && (
								<p className="text-xs text-muted-foreground">
									Batch: {student.batch}
								</p>
							)}
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground mb-2">
									Logbook Entries ({totalLogs(student)} total)
								</p>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="flex items-center gap-1.5">
										<ClipboardList className="h-3 w-3 text-blue-500" />
										<span>Cases: {student.logCounts.caseManagement}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<Syringe className="h-3 w-3 text-green-500" />
										<span>Procedures: {student.logCounts.procedures}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<Activity className="h-3 w-3 text-orange-500" />
										<span>Diagnostics: {student.logCounts.diagnostics}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<Scan className="h-3 w-3 text-purple-500" />
										<span>Imaging: {student.logCounts.imaging}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<BookOpen className="h-3 w-3 text-teal-500" />
										<span>
											Academic:{" "}
											{student.logCounts.casePresentations +
												student.logCounts.seminars +
												student.logCounts.journalClubs}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
