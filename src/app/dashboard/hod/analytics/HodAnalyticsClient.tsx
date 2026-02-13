/**
 * @module HodAnalyticsClient
 * @description Client component for the HOD department analytics dashboard.
 * Displays summary cards, per-student progress table, and faculty workload.
 *
 * @see roadmap.md — Phase 8, Department Analytics
 */

"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
	Users,
	UserCheck,
	Stethoscope,
	Syringe,
	Activity,
	MonitorSpeaker,
	GraduationCap,
	CheckCircle,
	BarChart3,
} from "lucide-react";

interface StudentRow {
	id: string;
	firstName: string;
	lastName: string;
	batch: string | null;
	currentSemester: number | null;
	_count: {
		caseManagementLogs: number;
		procedureLogs: number;
		diagnosticSkills: number;
		imagingLogs: number;
		casePresentations: number;
		evaluations: number;
	};
}

interface FacultyRow {
	id: string;
	firstName: string;
	lastName: string;
	_count: {
		assignedStudents: number;
	};
}

interface DepartmentStats {
	totalStudents: number;
	totalFaculty: number;
	totalCases: number;
	totalProcedures: number;
	totalDiagnostics: number;
	totalImaging: number;
	totalAcademics: number;
	signedEvals: number;
	totalEvals: number;
	signOffRate: number;
}

interface HodAnalyticsClientProps {
	students: StudentRow[];
	faculty: FacultyRow[];
	departmentStats: DepartmentStats;
}

export function HodAnalyticsClient({
	students,
	faculty,
	departmentStats,
}: HodAnalyticsClientProps) {
	const stats = departmentStats;

	return (
		<div className="space-y-8">
			{/* Department Summary Cards */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<Users className="h-8 w-8 text-blue-600" />
							<p className="text-2xl font-bold">{stats.totalStudents}</p>
							<p className="text-xs text-muted-foreground">Students</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<UserCheck className="h-8 w-8 text-indigo-600" />
							<p className="text-2xl font-bold">{stats.totalFaculty}</p>
							<p className="text-xs text-muted-foreground">Faculty</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<Stethoscope className="h-8 w-8 text-teal-600" />
							<p className="text-2xl font-bold">{stats.totalCases}</p>
							<p className="text-xs text-muted-foreground">Case Logs</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<Syringe className="h-8 w-8 text-orange-600" />
							<p className="text-2xl font-bold">{stats.totalProcedures}</p>
							<p className="text-xs text-muted-foreground">Procedures</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<Activity className="h-8 w-8 text-red-600" />
							<p className="text-2xl font-bold">{stats.totalDiagnostics}</p>
							<p className="text-xs text-muted-foreground">Diagnostics</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Second row: More stats */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<MonitorSpeaker className="h-6 w-6 text-purple-600" />
							<div>
								<p className="text-xl font-bold">{stats.totalImaging}</p>
								<p className="text-xs text-muted-foreground">Imaging Logs</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<GraduationCap className="h-6 w-6 text-green-600" />
							<div>
								<p className="text-xl font-bold">{stats.totalAcademics}</p>
								<p className="text-xs text-muted-foreground">Academic Logs</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<CheckCircle className="h-6 w-6 text-emerald-600" />
							<div>
								<p className="text-xl font-bold">
									{stats.signedEvals}/{stats.totalEvals}
								</p>
								<p className="text-xs text-muted-foreground">Evals Signed</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<BarChart3 className="h-6 w-6 text-amber-600" />
							<div>
								<p className="text-xl font-bold">{stats.signOffRate}%</p>
								<p className="text-xs text-muted-foreground">Sign-off Rate</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Per-Student Progress Table */}
			<Card>
				<CardHeader>
					<CardTitle>Student Progress Overview</CardTitle>
					<CardDescription>
						Log counts per student across all modules
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Student</TableHead>
									<TableHead>Batch</TableHead>
									<TableHead>Sem</TableHead>
									<TableHead className="text-center">Cases</TableHead>
									<TableHead className="text-center">Procedures</TableHead>
									<TableHead className="text-center">Diagnostics</TableHead>
									<TableHead className="text-center">Imaging</TableHead>
									<TableHead className="text-center">Academics</TableHead>
									<TableHead className="text-center">Evals</TableHead>
									<TableHead className="text-center">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{students.map((s) => {
									const total =
										s._count.caseManagementLogs +
										s._count.procedureLogs +
										s._count.diagnosticSkills +
										s._count.imagingLogs +
										s._count.casePresentations;
									return (
										<TableRow key={s.id}>
											<TableCell className="font-medium whitespace-nowrap">
												{s.firstName} {s.lastName}
											</TableCell>
											<TableCell>{s.batch || "—"}</TableCell>
											<TableCell>{s.currentSemester || "—"}</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">
													{s._count.caseManagementLogs}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">
													{s._count.procedureLogs}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">
													{s._count.diagnosticSkills}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">{s._count.imagingLogs}</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">
													{s._count.casePresentations}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline">{s._count.evaluations}</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge>{total}</Badge>
											</TableCell>
										</TableRow>
									);
								})}
								{students.length === 0 && (
									<TableRow>
										<TableCell colSpan={10} className="text-center py-8">
											No students found
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Faculty Workload */}
			<Card>
				<CardHeader>
					<CardTitle>Faculty Workload</CardTitle>
					<CardDescription>
						Number of student assignments per faculty member
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{faculty.map((f) => {
							const maxAssignments = Math.max(
								...faculty.map((x) => x._count.assignedStudents),
								1,
							);
							const pct = Math.round(
								(f._count.assignedStudents / maxAssignments) * 100,
							);
							return (
								<div key={f.id} className="space-y-1">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium">
											{f.firstName} {f.lastName}
										</span>
										<span className="text-muted-foreground">
											{f._count.assignedStudents} assignments
										</span>
									</div>
									<Progress value={pct} className="h-2" />
								</div>
							);
						})}
						{faculty.length === 0 && (
							<p className="text-center text-muted-foreground py-4">
								No faculty members found
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
