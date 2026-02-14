/**
 * @module StudentTrainingView
 * @description Read-only view of a student's 5-domain training & mentoring records.
 * Used by faculty/HOD to view a student's semester-wise evaluations.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
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
import { Target, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrainingRecord {
	id: string;
	userId: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	remarks: string | null;
	status: string;
}

interface StudentTrainingViewProps {
	records: TrainingRecord[];
	studentName: string;
}

const DOMAINS = [
	{
		key: "knowledgeScore" as const,
		label: "Knowledge",
		shortLabel: "Know.",
		color: "#0066CC",
	},
	{
		key: "clinicalSkillScore" as const,
		label: "Clinical Skills",
		shortLabel: "Clinical",
		color: "#00897B",
	},
	{
		key: "proceduralSkillScore" as const,
		label: "Procedural Skills",
		shortLabel: "Proc.",
		color: "#D32F2F",
	},
	{
		key: "softSkillScore" as const,
		label: "Soft Skills",
		shortLabel: "Soft",
		color: "#F59E0B",
	},
	{
		key: "researchScore" as const,
		label: "Research",
		shortLabel: "Research",
		color: "#7C3AED",
	},
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];

export function StudentTrainingView({
	records,
	studentName,
}: StudentTrainingViewProps) {
	const getRecord = (sem: number) => records.find((r) => r.semester === sem);

	const evaluatedCount = records.filter((r) =>
		DOMAINS.some((d) => r[d.key] !== null),
	).length;

	const latestOverall = records
		.filter((r) => r.overallScore !== null)
		.sort((a, b) => b.semester - a.semester)[0]?.overallScore;

	if (records.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center text-muted-foreground">
					<Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="text-lg font-medium">No Evaluations Yet</p>
					<p className="text-sm mt-1">
						{studentName} has no training & mentoring evaluations recorded.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-50 rounded-lg">
								<Target className="h-5 w-5 text-hospital-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{evaluatedCount} / 6</p>
								<p className="text-xs text-muted-foreground">
									Semesters Evaluated
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-50 rounded-lg">
								<Star className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{latestOverall?.toFixed(1) ?? "—"}
								</p>
								<p className="text-xs text-muted-foreground">
									Latest Overall Score
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-50 rounded-lg">
								<TrendingUp className="h-5 w-5 text-purple-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">5</p>
								<p className="text-xs text-muted-foreground">Domains Tracked</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Evaluation Table */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Target className="h-5 w-5 text-hospital-primary" />
						<CardTitle>Semester-wise 5-Domain Evaluation</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-180">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-20 text-center font-bold">
										Sem
									</TableHead>
									{DOMAINS.map((d) => (
										<TableHead key={d.key} className="font-bold text-center">
											<div className="flex items-center justify-center gap-1">
												<span
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: d.color }}
												/>
												<span className="hidden lg:inline">{d.label}</span>
												<span className="lg:hidden">{d.shortLabel}</span>
											</div>
										</TableHead>
									))}
									<TableHead className="w-20 text-center font-bold">
										Overall
									</TableHead>
									<TableHead className="w-24 text-center font-bold">
										Status
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{SEMESTERS.map((sem) => {
									const record = getRecord(sem);
									const hasData =
										record && DOMAINS.some((d) => record[d.key] !== null);

									return (
										<TableRow
											key={sem}
											className={cn(!hasData && "text-muted-foreground/60")}
										>
											<TableCell className="text-center font-bold text-hospital-primary">
												{sem}
											</TableCell>
											{DOMAINS.map((domain) => {
												const score = record?.[domain.key];
												return (
													<TableCell key={domain.key} className="text-center">
														{score ?
															<div className="flex items-center justify-center gap-1">
																<div className="flex gap-0.5">
																	{[1, 2, 3, 4, 5].map((i) => (
																		<div
																			key={i}
																			className="h-1.5 w-3 rounded-full"
																			style={{
																				backgroundColor:
																					i <= score ? domain.color : "#E5E7EB",
																			}}
																		/>
																	))}
																</div>
																<span className="text-xs font-medium">
																	{score}
																</span>
															</div>
														:	<span className="text-muted-foreground/40 italic text-xs">
																—
															</span>
														}
													</TableCell>
												);
											})}
											<TableCell className="text-center font-medium">
												{record?.overallScore ?
													<span className="font-bold">
														{record.overallScore.toFixed(1)}
													</span>
												:	"—"}
											</TableCell>
											<TableCell className="text-center">
												{record ?
													<Badge
														variant={
															record.status === "SIGNED" ? "default" : "outline"
														}
														className={cn(
															"text-xs",
															record.status === "SIGNED" &&
																"bg-green-100 text-green-700 hover:bg-green-100",
															record.status === "SUBMITTED" &&
																"text-amber-600 border-amber-300",
														)}
													>
														{record.status === "SIGNED" ?
															"Approved"
														: record.status === "SUBMITTED" ?
															"Pending"
														:	record.status}
													</Badge>
												:	<span className="text-xs text-muted-foreground/40">
														—
													</span>
												}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{/* Remarks Section */}
					{records.some((r) => r.remarks) && (
						<div className="mt-4 space-y-2 px-2 sm:px-0">
							<h4 className="text-sm font-semibold text-muted-foreground">
								Remarks
							</h4>
							{records
								.filter((r) => r.remarks)
								.sort((a, b) => a.semester - b.semester)
								.map((r) => (
									<div
										key={r.id}
										className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
									>
										<span className="font-medium text-amber-900">
											Semester {r.semester}:
										</span>{" "}
										<span className="text-amber-800">{r.remarks}</span>
									</div>
								))}
						</div>
					)}

					{/* Score Legend */}
					<div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground px-2 sm:px-0">
						<span className="font-medium">Scale:</span>
						<span>1 = Remedial</span>
						<span>2 = Inconsistent</span>
						<span>3 = Meets</span>
						<span>4 = Exceeds</span>
						<span>5 = Exceptional</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
