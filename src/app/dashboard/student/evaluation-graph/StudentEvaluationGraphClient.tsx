/**
 * @module StudentEvaluationGraphClient
 * @description Client component for students to view their evaluation graph (read-only).
 * Shows radar chart and semester-wise table with scores.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 */

"use client";

import dynamic from "next/dynamic";
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
import { BarChart3, Target, Info, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvaluationGraphEntry } from "@/actions/evaluation-graph";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	exportEvaluationGraphToExcel,
	type EvaluationGraphExportRow,
} from "@/lib/export/export-excel";
import { toast } from "sonner";

// Lazy load the chart component
const EvaluationGraph = dynamic(
	() =>
		import("@/components/charts/EvaluationGraph").then(
			(mod) => mod.EvaluationGraph,
		),
	{
		ssr: false,
		loading: () => (
			<div className="h-80 flex items-center justify-center text-muted-foreground">
				Loading chart...
			</div>
		),
	},
);

interface StudentEvaluationGraphClientProps {
	records: EvaluationGraphEntry[];
	studentName?: string;
}

const DOMAINS = [
	{
		key: "knowledgeScore",
		label: "Knowledge",
		shortLabel: "Know.",
		color: "#0066CC",
	},
	{
		key: "clinicalSkillScore",
		label: "Clinical Skills",
		shortLabel: "Clinical",
		color: "#00897B",
	},
	{
		key: "proceduralSkillScore",
		label: "Procedural Skills",
		shortLabel: "Proc.",
		color: "#D32F2F",
	},
	{
		key: "softSkillScore",
		label: "Soft Skills",
		shortLabel: "Soft",
		color: "#F59E0B",
	},
	{
		key: "researchScore",
		label: "Research",
		shortLabel: "Research",
		color: "#7C3AED",
	},
] as const;

const SEMESTERS = [1, 2, 3, 4, 5, 6];

export function StudentEvaluationGraphClient({
	records,
	studentName = "Student",
}: StudentEvaluationGraphClientProps) {
	const getRecord = (sem: number) => records.find((r) => r.semester === sem);

	const hasAnyRecords = records.length > 0;

	const handleExport = () => {
		const exportRows: EvaluationGraphExportRow[] = records.map((r) => ({
			semester: r.semester,
			knowledgeScore: r.knowledgeScore,
			clinicalSkillScore: r.clinicalSkillScore,
			proceduralSkillScore: r.proceduralSkillScore,
			softSkillScore: r.softSkillScore,
			researchScore: r.researchScore,
			overallScore: r.overallScore,
			theoryMarks: r.theoryMarks ?? null,
			practicalMarks: r.practicalMarks ?? null,
			remarks: r.remarks ?? null,
			status: r.status,
		}));
		exportEvaluationGraphToExcel(exportRows, studentName);
		toast.success("Exported evaluation graph to Excel");
	};

	// Transform data for EvaluationGraph chart component
	const chartData = SEMESTERS.map((sem) => {
		const record = getRecord(sem);
		return {
			semester: `Sem ${sem}`,
			Knowledge: record?.knowledgeScore ?? 0,
			"Clinical Skills": record?.clinicalSkillScore ?? 0,
			"Procedural Skills": record?.proceduralSkillScore ?? 0,
			"Soft Skills": record?.softSkillScore ?? 0,
			Research: record?.researchScore ?? 0,
			theoryMarks: record?.theoryMarks ?? null,
			practicalMarks: record?.practicalMarks ?? null,
		};
	});

	if (!hasAnyRecords) {
		return (
			<Card>
				<CardContent className="p-8 text-center">
					<Target className="h-12 w-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
					<p className="text-lg font-medium text-muted-foreground">
						No Evaluations Yet
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						Your faculty or HOD will complete your semester evaluations
						periodically. Check back later.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Export & Info */}
			<div className="flex justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={handleExport}
					disabled={!hasAnyRecords}
				>
					<Download className="h-4 w-4 mr-1" />
					Export
				</Button>
			</div>

			{/* Info Alert */}
			<Alert>
				<Info className="h-4 w-4" />
				<AlertTitle>Read-Only View</AlertTitle>
				<AlertDescription>
					This evaluation graph is completed by your faculty or HOD. You can
					view your progress but cannot edit these scores.
				</AlertDescription>
			</Alert>

			{/* Radar Chart */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5 text-hospital-primary" />
						<CardTitle>Evaluation Graph</CardTitle>
					</div>
					<CardDescription>
						5-domain performance visualization across semesters
					</CardDescription>
				</CardHeader>
				<CardContent>
					<EvaluationGraph data={chartData} />
				</CardContent>
			</Card>

			{/* Semester-wise Table */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Semester-wise Scores</CardTitle>
					<CardDescription>
						Detailed scores for each domain per semester
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6 overflow-x-auto">
					<div className="border rounded-lg min-w-200">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="w-16 text-center font-bold">
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
									<TableHead className="w-16 text-center font-bold">
										Theory
									</TableHead>
									<TableHead className="w-16 text-center font-bold">
										Practical
									</TableHead>
									<TableHead className="w-16 text-center font-bold">
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
										record &&
										DOMAINS.some(
											(d) =>
												(record[d.key as keyof EvaluationGraphEntry] as
													| number
													| null) !== null,
										);

									return (
										<TableRow
											key={sem}
											className={cn(hasData ? "" : "text-muted-foreground/60")}
										>
											<TableCell className="text-center font-medium">
												{sem}
											</TableCell>
											{DOMAINS.map((domain) => {
												const score = record?.[
													domain.key as keyof EvaluationGraphEntry
												] as number | null;
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
														:	<span className="text-muted-foreground/40 text-xs">
																—
															</span>
														}
													</TableCell>
												);
											})}
											<TableCell className="text-center text-sm">
												{record?.theoryMarks ?? "—"}
											</TableCell>
											<TableCell className="text-center text-sm">
												{record?.practicalMarks ?? "—"}
											</TableCell>
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
															"Signed"
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
						<div className="mt-4 space-y-2">
							<h4 className="font-medium text-sm">Remarks</h4>
							{records
								.filter((r) => r.remarks)
								.map((r) => (
									<div
										key={r.id}
										className="bg-muted/50 rounded-lg p-3 text-sm"
									>
										<span className="font-medium text-hospital-primary">
											Semester {r.semester}:
										</span>{" "}
										{r.remarks}
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
