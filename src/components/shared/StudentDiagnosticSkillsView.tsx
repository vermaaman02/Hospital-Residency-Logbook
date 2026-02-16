/**
 * @module StudentDiagnosticSkillsView
 * @description Read-only view of a student's diagnostic skill entries.
 * Three-tab layout: ABG Analysis, ECG Analysis, Other Diagnostic.
 * Used by faculty/HOD to view a specific student's diagnostic logbook.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CONFIDENCE_LEVEL_LABELS } from "@/lib/constants/diagnostic-types";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

export interface DiagnosticSkillViewEntry {
	id: string;
	slNo: number;
	diagnosticCategory: string;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyRemark: string | null;
	status: string;
}

interface StudentDiagnosticSkillsViewProps {
	entries: DiagnosticSkillViewEntry[];
	studentName: string;
}

const CATEGORIES = [
	{ key: "ABG_ANALYSIS", label: "ABG Analysis" },
	{ key: "ECG_ANALYSIS", label: "ECG Analysis" },
	{ key: "OTHER_DIAGNOSTIC", label: "Other Diagnostic" },
] as const;

export function StudentDiagnosticSkillsView({
	entries,
	studentName,
}: StudentDiagnosticSkillsViewProps) {
	const grouped = {
		ABG_ANALYSIS: entries.filter(
			(e) => e.diagnosticCategory === "ABG_ANALYSIS",
		),
		ECG_ANALYSIS: entries.filter(
			(e) => e.diagnosticCategory === "ECG_ANALYSIS",
		),
		OTHER_DIAGNOSTIC: entries.filter(
			(e) => e.diagnosticCategory === "OTHER_DIAGNOSTIC",
		),
	};

	return (
		<Tabs defaultValue="ABG_ANALYSIS" className="space-y-4">
			<TabsList className="grid w-full max-w-lg grid-cols-3">
				{CATEGORIES.map((cat) => (
					<TabsTrigger key={cat.key} value={cat.key}>
						{cat.label} ({grouped[cat.key].length})
					</TabsTrigger>
				))}
			</TabsList>

			{CATEGORIES.map((cat) => (
				<TabsContent key={cat.key} value={cat.key}>
					<SkillTable
						entries={grouped[cat.key]}
						label={cat.label}
						studentName={studentName}
					/>
				</TabsContent>
			))}
		</Tabs>
	);
}

function SkillTable({
	entries,
	label,
	studentName,
}: {
	entries: DiagnosticSkillViewEntry[];
	label: string;
	studentName: string;
}) {
	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;

	const confidenceLabel = (val: string | null) => {
		if (!val) return "—";
		return CONFIDENCE_LEVEL_LABELS[val] ?? val;
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<CardTitle className="text-base">
						{studentName}&apos;s {label} Skills
					</CardTitle>
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<span>
							<strong className="text-green-600">{signed}</strong> signed
						</span>
						<span>
							<strong className="text-amber-600">{submitted}</strong> pending
						</span>
						<span>
							<strong>{total}</strong> total
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/40">
								<TableHead className="w-14 text-center">Sl.</TableHead>
								<TableHead className="min-w-48">Diagnostic Skill</TableHead>
								<TableHead className="min-w-44">
									Representative Diagnosis
								</TableHead>
								<TableHead className="w-32">Confidence</TableHead>
								<TableHead className="w-20 text-center">Tally</TableHead>
								<TableHead className="min-w-36">Faculty Remark</TableHead>
								<TableHead className="w-28 text-center">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{entries.length === 0 ?
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center py-12 text-muted-foreground"
									>
										No {label.toLowerCase()} entries yet.
									</TableCell>
								</TableRow>
							:	entries.map((entry) => (
									<TableRow
										key={entry.id}
										className={cn(
											entry.status === "SIGNED" && "bg-green-50/40",
											entry.status === "NEEDS_REVISION" && "bg-amber-50/40",
										)}
									>
										<TableCell className="text-center font-medium text-muted-foreground">
											{entry.slNo}
										</TableCell>
										<TableCell className="text-sm font-medium">
											{entry.skillName}
										</TableCell>
										<TableCell className="text-sm">
											{entry.representativeDiagnosis || "—"}
										</TableCell>
										<TableCell>
											{entry.confidenceLevel ?
												<Badge variant="outline" className="text-xs">
													{confidenceLabel(entry.confidenceLevel)}
												</Badge>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-center font-mono">
											{entry.totalTimesPerformed}
										</TableCell>
										<TableCell className="text-sm">
											{entry.facultyRemark || (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-center">
											<StatusBadge
												status={entry.status as EntryStatus}
												size="sm"
											/>
										</TableCell>
									</TableRow>
								))
							}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
