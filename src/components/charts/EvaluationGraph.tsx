/**
 * @module EvaluationGraph
 * @description Interactive radar + bar chart showing 5-domain x 6-semester evaluation scores.
 * Uses Recharts. Matches the physical logbook "RESIDENT EVALUATION GRAPH" layout.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 * @see roadmap.md — Phase 8, I2
 */

"use client";

import {
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	Legend,
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SemesterData {
	semester: string;
	Knowledge: number;
	"Clinical Skills": number;
	"Procedural Skills": number;
	"Soft Skills": number;
	Research: number;
	theoryMarks: string | null;
	practicalMarks: string | null;
}

interface EvaluationGraphProps {
	data: SemesterData[];
	studentName?: string;
}

const DOMAIN_COLORS = {
	Knowledge: "#0066CC",
	"Clinical Skills": "#00897B",
	"Procedural Skills": "#D32F2F",
	"Soft Skills": "#F59E0B",
	Research: "#8B5CF6",
} as const;

const SEMESTER_COLORS = [
	"#0066CC",
	"#00897B",
	"#D32F2F",
	"#F59E0B",
	"#8B5CF6",
	"#EC4899",
];

export function EvaluationGraph({ data, studentName }: EvaluationGraphProps) {
	// Transform data for radar per semester
	const domains = [
		"Knowledge",
		"Clinical Skills",
		"Procedural Skills",
		"Soft Skills",
		"Research",
	] as const;

	const radarData = domains.map((domain) => {
		const point: Record<string, string | number> = { domain };
		data.forEach((semData) => {
			point[semData.semester] = semData[domain];
		});
		return point;
	});

	// Filter semesters that have data
	const activeSemesters = data.filter((d) =>
		domains.some((domain) => d[domain] > 0),
	);

	const hasData = activeSemesters.length > 0;

	return (
		<div className="space-y-6">
			{studentName && (
				<p className="text-sm text-muted-foreground">
					Evaluation graph for{" "}
					<span className="font-medium text-foreground">{studentName}</span>
				</p>
			)}

			{!hasData ?
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<p className="text-muted-foreground">
							No evaluation scores recorded yet. Faculty will fill scores during
							periodic reviews.
						</p>
					</CardContent>
				</Card>
			:	<Tabs defaultValue="radar" className="w-full">
					<TabsList>
						<TabsTrigger value="radar">Radar Chart</TabsTrigger>
						<TabsTrigger value="bar">Bar Chart</TabsTrigger>
						<TabsTrigger value="table">Table View</TabsTrigger>
					</TabsList>

					{/* Radar Chart */}
					<TabsContent value="radar">
						<Card>
							<CardHeader>
								<CardTitle>Competency Radar — All Semesters</CardTitle>
								<CardDescription>
									5 domains scored 1-5 per semester. Outer ring = 5 (Excellent)
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={420}>
									<RadarChart data={radarData}>
										<PolarGrid />
										<PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
										<PolarRadiusAxis
											angle={90}
											domain={[0, 5]}
											tick={{ fontSize: 10 }}
										/>
										{activeSemesters.map((sem, idx) => (
											<Radar
												key={sem.semester}
												name={sem.semester}
												dataKey={sem.semester}
												stroke={SEMESTER_COLORS[idx % SEMESTER_COLORS.length]}
												fill={SEMESTER_COLORS[idx % SEMESTER_COLORS.length]}
												fillOpacity={0.15}
											/>
										))}
										<Legend />
									</RadarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Bar Chart */}
					<TabsContent value="bar">
						<Card>
							<CardHeader>
								<CardTitle>Domain Scores by Semester</CardTitle>
								<CardDescription>
									Grouped bar chart showing progression across semesters
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={420}>
									<BarChart data={data}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="semester" />
										<YAxis domain={[0, 5]} />
										<Tooltip />
										<Legend />
										{domains.map((domain) => (
											<Bar
												key={domain}
												dataKey={domain}
												fill={DOMAIN_COLORS[domain]}
												radius={[2, 2, 0, 0]}
											/>
										))}
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Table View */}
					<TabsContent value="table">
						<Card>
							<CardHeader>
								<CardTitle>Evaluation Scores Table</CardTitle>
								<CardDescription>
									Matching the physical logbook&apos;s evaluation graph layout
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-48">Domain</TableHead>
												{data.map((sem) => (
													<TableHead key={sem.semester} className="text-center">
														{sem.semester}
													</TableHead>
												))}
											</TableRow>
										</TableHeader>
										<TableBody>
											{domains.map((domain) => (
												<TableRow key={domain}>
													<TableCell className="font-medium">
														{domain}
													</TableCell>
													{data.map((sem) => (
														<TableCell
															key={sem.semester}
															className="text-center"
														>
															{sem[domain] > 0 ?
																<Badge
																	variant={
																		sem[domain] >= 4 ? "default"
																		: sem[domain] >= 3 ?
																			"secondary"
																		:	"destructive"
																	}
																>
																	{sem[domain]}
																</Badge>
															:	<span className="text-muted-foreground">—</span>}
														</TableCell>
													))}
												</TableRow>
											))}
											{/* End Semester Assessment rows */}
											<TableRow>
												<TableCell className="font-medium">
													Theory Marks
												</TableCell>
												{data.map((sem) => (
													<TableCell key={sem.semester} className="text-center">
														{sem.theoryMarks || "—"}
													</TableCell>
												))}
											</TableRow>
											<TableRow>
												<TableCell className="font-medium">
													Practical Marks
												</TableCell>
												{data.map((sem) => (
													<TableCell key={sem.semester} className="text-center">
														{sem.practicalMarks || "—"}
													</TableCell>
												))}
											</TableRow>
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			}
		</div>
	);
}
