/**
 * @module TrainingMentoringView
 * @description Displays the 5-point scale training & mentoring records per semester.
 * Read-only for students; faculty edits via their dashboard.
 *
 * @see PG Logbook .md — "RESIDENT TRAINING & MENTORING RECORD"
 */

"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { type EntryStatus } from "@/types";
import { ClipboardCheck, Star } from "lucide-react";

const SCORE_DESCRIPTIONS: Record<number, string> = {
	5: "Exceptional",
	4: "Exceeds expected standards",
	3: "Meets expected standards",
	2: "Inconsistent Performance",
	1: "Requires remedial training",
};

const SCORE_COLORS: Record<number, string> = {
	5: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300",
	4: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
	3: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300",
	2: "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
	1: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300",
};

interface TrainingRecord {
	id: string;
	semester: number;
	score: number;
	remarks: string | null;
	status: string;
}

interface TrainingMentoringViewProps {
	records: TrainingRecord[];
}

const SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

export function TrainingMentoringView({ records }: TrainingMentoringViewProps) {
	return (
		<div className="space-y-6">
			{/* Score Legend */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Rating Scale</CardTitle>
					<CardDescription>
						Faculty evaluates residents using this 5-point scale
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
						{[5, 4, 3, 2, 1].map((score) => (
							<div
								key={score}
								className={`flex items-center gap-2 p-3 rounded-lg ${SCORE_COLORS[score]}`}
							>
								<span className="text-lg font-bold">{score}</span>
								<span className="text-xs">{SCORE_DESCRIPTIONS[score]}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Semester Records */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{SEMESTERS.map((sem) => {
					const record = records.find((r) => r.semester === sem);

					return (
						<Card key={sem} className={record ? "" : "opacity-60"}>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">Semester {sem}</CardTitle>
									{record && (
										<StatusBadge
											status={record.status as EntryStatus}
											size="sm"
										/>
									)}
								</div>
							</CardHeader>
							<CardContent>
								{record ?
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											<div
												className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${SCORE_COLORS[record.score]}`}
											>
												<Star className="h-4 w-4" />
												{record.score} — {SCORE_DESCRIPTIONS[record.score]}
											</div>
										</div>
										{record.remarks && (
											<div className="text-sm text-muted-foreground bg-muted p-3 rounded">
												<span className="font-medium">Remarks: </span>
												{record.remarks}
											</div>
										)}
									</div>
								:	<div className="text-center py-4 text-muted-foreground">
										<ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
										<p className="text-sm">Not yet evaluated</p>
										<p className="text-xs mt-1">
											Your faculty will assess you during this semester
										</p>
									</div>
								}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
