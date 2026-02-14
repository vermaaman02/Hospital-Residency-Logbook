/**
 * @module StudentRotationPostingView
 * @description Read-only view of a student's rotation posting entries.
 * Used by faculty/HOD to view a student's logbook page.
 *
 * @see PG Logbook .md — "LOG OF ROTATION POSTINGS DURING PG IN EM"
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

export interface RotationPostingViewEntry {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: string | null;
	endDate: string | null;
	totalDuration: string | null;
	durationDays: number | null;
	status: string;
	facultyRemark: string | null;
	createdAt: string;
}

interface StudentRotationPostingViewProps {
	entries: RotationPostingViewEntry[];
	studentName: string;
}

export function StudentRotationPostingView({
	entries,
	studentName,
}: StudentRotationPostingViewProps) {
	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;
	const core = entries.filter((e) => !e.isElective);
	const elective = entries.filter((e) => e.isElective);

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						{studentName}&apos;s Rotation Postings
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
								<TableHead>Rotation Name</TableHead>
								<TableHead className="w-20 text-center">Type</TableHead>
								<TableHead className="w-32">Start Date</TableHead>
								<TableHead className="w-32">End Date</TableHead>
								<TableHead className="w-28">Duration</TableHead>
								<TableHead className="min-w-36">Faculty Remark</TableHead>
								<TableHead className="w-28 text-center">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{/* Core Rotations */}
							{core.length > 0 && (
								<>
									<TableRow className="bg-blue-50/40">
										<TableCell colSpan={8} className="py-1.5">
											<span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
												Core Rotations ({core.length})
											</span>
										</TableCell>
									</TableRow>
									{core.map((entry) => (
										<RotationRow key={entry.id} entry={entry} />
									))}
								</>
							)}
							{/* Elective Rotations */}
							{elective.length > 0 && (
								<>
									<TableRow className="bg-purple-50/40">
										<TableCell colSpan={8} className="py-1.5">
											<span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
												Elective Rotations ({elective.length})
											</span>
										</TableCell>
									</TableRow>
									{elective.map((entry) => (
										<RotationRow key={entry.id} entry={entry} />
									))}
								</>
							)}
							{entries.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={8}
										className="text-center py-12 text-muted-foreground"
									>
										No rotation posting entries yet.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

function RotationRow({ entry }: { entry: RotationPostingViewEntry }) {
	return (
		<TableRow
			className={cn(
				entry.status === "SIGNED" && "bg-green-50/40",
				entry.status === "NEEDS_REVISION" && "bg-amber-50/40",
			)}
		>
			<TableCell className="text-center font-medium text-muted-foreground">
				{entry.slNo}
			</TableCell>
			<TableCell className="font-medium text-sm">
				{entry.rotationName}
			</TableCell>
			<TableCell className="text-center">
				<Badge
					variant={entry.isElective ? "secondary" : "outline"}
					className="text-xs"
				>
					{entry.isElective ? "Elective" : "Core"}
				</Badge>
			</TableCell>
			<TableCell className="text-sm">
				{entry.startDate ?
					format(new Date(entry.startDate), "dd MMM yyyy")
				:	"—"}
			</TableCell>
			<TableCell className="text-sm">
				{entry.endDate ? format(new Date(entry.endDate), "dd MMM yyyy") : "—"}
			</TableCell>
			<TableCell className="text-sm">{entry.totalDuration || "—"}</TableCell>
			<TableCell className="text-sm">
				{entry.facultyRemark || (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell className="text-center">
				<StatusBadge status={entry.status as EntryStatus} size="sm" />
			</TableCell>
		</TableRow>
	);
}
