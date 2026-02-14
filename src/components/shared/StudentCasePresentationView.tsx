/**
 * @module StudentCasePresentationView
 * @description Read-only view of a student's case presentation entries.
 * Used by faculty/HOD to view a student's logbook page.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
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
import { renderMarkdown } from "@/components/shared/MarkdownEditor";
import { PATIENT_CATEGORY_OPTIONS } from "@/lib/constants/academic-fields";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

export interface CasePresentationViewEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	patientName: string | null;
	patientAge: string | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	category: string | null;
	facultyRemark: string | null;
	status: string;
}

interface StudentCasePresentationViewProps {
	entries: CasePresentationViewEntry[];
	studentName: string;
}

function getCategoryLabel(value: string | null): string {
	if (!value) return "—";
	const match = PATIENT_CATEGORY_OPTIONS.find((o) => o.value === value);
	return match?.label ?? value;
}

export function StudentCasePresentationView({
	entries,
	studentName,
}: StudentCasePresentationViewProps) {
	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						{studentName}&apos;s Case Presentations
					</CardTitle>
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<span>
							<strong className="text-green-600">{signed}</strong> signed
						</span>
						<span>
							<strong className="text-amber-600">{submitted}</strong> pending
						</span>
						<span>
							<strong>{total}</strong> / 20 target
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
								<TableHead className="w-28">Date</TableHead>
								<TableHead>Patient Name</TableHead>
								<TableHead className="w-14 text-center">Age</TableHead>
								<TableHead className="w-14 text-center">Sex</TableHead>
								<TableHead className="w-28">UHID</TableHead>
								<TableHead className="min-w-48">Complete Diagnosis</TableHead>
								<TableHead className="w-36">Category</TableHead>
								<TableHead className="min-w-40">Faculty Remark</TableHead>
								<TableHead className="w-28 text-center">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{entries.length === 0 ?
								<TableRow>
									<TableCell
										colSpan={10}
										className="text-center py-12 text-muted-foreground"
									>
										No case presentation entries yet.
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
										<TableCell className="text-sm">
											{entry.date ?
												format(new Date(entry.date), "dd MMM yyyy")
											:	"—"}
										</TableCell>
										<TableCell className="font-medium text-sm">
											{entry.patientName || "—"}
										</TableCell>
										<TableCell className="text-center text-sm">
											{entry.patientAge || "—"}
										</TableCell>
										<TableCell className="text-center text-sm">
											{entry.patientSex || "—"}
										</TableCell>
										<TableCell className="text-sm font-mono">
											{entry.uhid || "—"}
										</TableCell>
										<TableCell>
											{entry.completeDiagnosis ?
												<div
													className="prose prose-sm max-w-none text-sm line-clamp-3"
													dangerouslySetInnerHTML={{
														__html: renderMarkdown(entry.completeDiagnosis),
													}}
												/>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-sm">
											{getCategoryLabel(entry.category)}
										</TableCell>
										<TableCell>
											{entry.facultyRemark ?
												<div
													className="prose prose-sm max-w-none text-sm line-clamp-2"
													dangerouslySetInnerHTML={{
														__html: renderMarkdown(entry.facultyRemark),
													}}
												/>
											:	<span className="text-muted-foreground">—</span>}
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
