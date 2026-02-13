/**
 * @module TrainingMentoringTab
 * @description 5-domain radar/circular chart for Training & Mentoring Records.
 * Domains: Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research.
 * Scored 1-5 per semester by faculty. Read-only for students.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

"use client";

import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	Legend,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { Target, Info } from "lucide-react";
import type { TrainingRecordData } from "../RotationPostingsClient";

interface TrainingMentoringTabProps {
	records: TrainingRecordData[];
}

const DOMAIN_LABELS = [
	{ key: "knowledgeScore", label: "Knowledge" },
	{ key: "clinicalSkillScore", label: "Clinical Skills" },
	{ key: "proceduralSkillScore", label: "Procedural Skills" },
	{ key: "softSkillScore", label: "Soft Skills" },
	{ key: "researchScore", label: "Research" },
] as const;

const SCORE_DESCRIPTIONS: Record<number, string> = {
	5: "Exceptional — Far exceeds expectations",
	4: "Exceeds — Above expected standard",
	3: "Meets — Performs at expected standard",
	2: "Inconsistent — Below expectations in some areas",
	1: "Requires Remedial — Needs significant improvement",
};

const SEMESTER_COLORS = [
	"#0066CC", // Semester 1 - Blue
	"#00897B", // Semester 2 - Teal
	"#D32F2F", // Semester 3 - Red
	"#F59E0B", // Semester 4 - Amber
	"#7C3AED", // Semester 5 - Violet
	"#10B981", // Semester 6 - Green
];

export function TrainingMentoringTab({ records }: TrainingMentoringTabProps) {
	// Prepare radar chart data — one entry per domain, each semester as a separate key
	const radarData = useMemo(() => {
		return DOMAIN_LABELS.map(({ key, label }) => {
			const point: Record<string, string | number> = { domain: label };
			for (const record of records) {
				const score = record[key as keyof TrainingRecordData] as number | null;
				point[`Sem ${record.semester}`] = score ?? 0;
			}
			return point;
		});
	}, [records]);

	const sortedRecords = useMemo(
		() => [...records].sort((a, b) => a.semester - b.semester),
		[records],
	);

	const hasAnyData = records.length > 0;

	return (
		<div className="space-y-6">
			{/* Score Legend */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Target className="h-5 w-5 text-hospital-primary" />
						<CardTitle className="text-lg">
							Resident Training & Mentoring Record
						</CardTitle>
					</div>
					<CardDescription>
						5-domain evaluation scored 1-5 per semester by your faculty mentor
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
						<Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
						<div>
							<p className="font-medium text-blue-900 mb-1">
								This section is evaluated by your faculty mentor
							</p>
							<p className="text-blue-700">
								Scores are entered by assigned faculty during periodic reviews.
								You can view your progress here.
							</p>
						</div>
					</div>

					{/* Score scale */}
					<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
						{Object.entries(SCORE_DESCRIPTIONS).map(([score, desc]) => (
							<div
								key={score}
								className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50"
							>
								<span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-hospital-primary text-white font-bold text-xs shrink-0">
									{score}
								</span>
								<span className="text-muted-foreground">{desc}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Radar Chart */}
			{hasAnyData ?
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">Competency Radar Chart</CardTitle>
						<CardDescription>
							Semester-wise visualization of your 5-domain scores
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-100 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart
									data={radarData}
									cx="50%"
									cy="50%"
									outerRadius="80%"
								>
									<PolarGrid strokeDasharray="3 3" />
									<PolarAngleAxis
										dataKey="domain"
										tick={{ fontSize: 12, fill: "#6B7280" }}
									/>
									<PolarRadiusAxis
										angle={90}
										domain={[0, 5]}
										tickCount={6}
										tick={{ fontSize: 10, fill: "#9CA3AF" }}
									/>
									{sortedRecords.map((record) => (
										<Radar
											key={record.semester}
											name={`Sem ${record.semester}`}
											dataKey={`Sem ${record.semester}`}
											stroke={SEMESTER_COLORS[(record.semester - 1) % 6]}
											fill={SEMESTER_COLORS[(record.semester - 1) % 6]}
											fillOpacity={0.15}
											strokeWidth={2}
										/>
									))}
									<Legend />
									<Tooltip />
								</RadarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			:	<Card>
					<CardContent className="py-12 text-center">
						<Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
						<p className="text-muted-foreground font-medium">
							No evaluation records yet
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Your faculty mentor will add evaluation scores during periodic
							reviews
						</p>
					</CardContent>
				</Card>
			}

			{/* Semester Cards */}
			{hasAnyData && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{sortedRecords.map((record) => (
						<SemesterCard key={record.id} record={record} />
					))}
				</div>
			)}

			{/* Unfilled semesters */}
			{hasAnyData && sortedRecords.length < 6 && (
				<div className="flex flex-wrap gap-2">
					{[1, 2, 3, 4, 5, 6]
						.filter((s) => !sortedRecords.find((r) => r.semester === s))
						.map((sem) => (
							<Badge
								key={sem}
								variant="outline"
								className="text-muted-foreground"
							>
								Semester {sem} — Not evaluated yet
							</Badge>
						))}
				</div>
			)}
		</div>
	);
}

// ======================== SUB-COMPONENT: SemesterCard ========================

interface SemesterCardProps {
	record: TrainingRecordData;
}

function SemesterCard({ record }: SemesterCardProps) {
	const semColor = SEMESTER_COLORS[(record.semester - 1) % 6];

	return (
		<Card className="overflow-hidden">
			<div className="h-1.5" style={{ backgroundColor: semColor }} />
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						Semester {record.semester}
					</CardTitle>
					{record.overallScore && (
						<Badge
							style={{
								backgroundColor: `${semColor}20`,
								color: semColor,
								borderColor: `${semColor}40`,
							}}
						>
							Overall: {record.overallScore.toFixed(1)}/5
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{DOMAIN_LABELS.map(({ key, label }) => {
						const score = record[key as keyof TrainingRecordData] as
							| number
							| null;
						return (
							<div key={key} className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">{label}</span>
								<div className="flex items-center gap-2">
									{score ?
										<>
											<div className="flex gap-0.5">
												{[1, 2, 3, 4, 5].map((i) => (
													<div
														key={i}
														className="h-2 w-5 rounded-full"
														style={{
															backgroundColor:
																i <= score ? semColor : "#E5E7EB",
														}}
													/>
												))}
											</div>
											<span className="text-sm font-medium w-4 text-right">
												{score}
											</span>
										</>
									:	<span className="text-xs text-muted-foreground">—</span>}
								</div>
							</div>
						);
					})}
				</div>

				{record.remarks && (
					<div className="mt-3 pt-3 border-t">
						<p className="text-xs text-muted-foreground">Remarks:</p>
						<p className="text-sm mt-0.5">{record.remarks}</p>
					</div>
				)}

				<div className="mt-3 flex items-center justify-between">
					<Badge
						variant={record.status === "SIGNED" ? "default" : "outline"}
						className={
							record.status === "SIGNED" ?
								"bg-green-100 text-green-700 hover:bg-green-100"
							:	""
						}
					>
						{record.status === "SIGNED" ?
							"Approved"
						: record.status === "SUBMITTED" ?
							"Pending Review"
						:	record.status}
					</Badge>
				</div>
			</CardContent>
		</Card>
	);
}
