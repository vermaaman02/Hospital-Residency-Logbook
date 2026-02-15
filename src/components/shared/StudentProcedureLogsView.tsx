/**
 * @module StudentProcedureLogsView
 * @description Read-only view of a student's procedure log entries.
 * Used by faculty/HOD to view a student's procedure logbook page.
 * Groups entries by category (49 categories).
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
 */

"use client";

import { useState, useMemo } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROCEDURE_CATEGORIES } from "@/lib/constants/procedure-categories";
import { SKILL_LEVEL_LABELS } from "@/lib/constants/procedure-log-fields";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/components/shared/MarkdownEditor";
import type { EntryStatus } from "@/types";

export interface ProcedureLogViewEntry {
	id: string;
	slNo: number;
	procedureCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	totalProcedureTally: number;
	facultyRemark: string | null;
	status: string;
}

const PROCEDURE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
	PROCEDURE_CATEGORIES.map((c) => [c.enumValue, c.label]),
);

interface StudentProcedureLogsViewProps {
	entries: ProcedureLogViewEntry[];
	studentName: string;
}

export function StudentProcedureLogsView({
	entries,
	studentName,
}: StudentProcedureLogsViewProps) {
	const [selectedCategory, setSelectedCategory] = useState("ALL");

	const availableCategories = useMemo(() => {
		const set = new Set<string>();
		entries.forEach((e) => set.add(e.procedureCategory));
		return PROCEDURE_CATEGORIES.filter((c) => set.has(c.enumValue));
	}, [entries]);

	const filtered = useMemo(() => {
		if (selectedCategory === "ALL") return entries;
		return entries.filter((e) => e.procedureCategory === selectedCategory);
	}, [entries, selectedCategory]);

	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;

	const formatDate = (d: string | null) => {
		if (!d) return "—";
		return new Date(d).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<div className="space-y-4">
			{/* Category Filter */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<Select value={selectedCategory} onValueChange={setSelectedCategory}>
					<SelectTrigger className="w-64">
						<SelectValue placeholder="Filter by category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All Categories ({total})</SelectItem>
						{availableCategories.map((cat) => (
							<SelectItem key={cat.enumValue} value={cat.enumValue}>
								{cat.label} (
								{
									entries.filter((e) => e.procedureCategory === cat.enumValue)
										.length
								}
								)
							</SelectItem>
						))}
					</SelectContent>
				</Select>

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

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						{studentName}&apos;s Procedure Log
						{selectedCategory !== "ALL" &&
							` — ${PROCEDURE_CATEGORY_LABELS[selectedCategory] ?? selectedCategory}`}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<div style={{ minWidth: "1300px" }}>
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/40">
										<TableHead className="w-14 text-center">Sl.</TableHead>
										{selectedCategory === "ALL" && (
											<TableHead className="min-w-32">Category</TableHead>
										)}
										<TableHead className="w-24">Date</TableHead>
										<TableHead className="min-w-28">Patient</TableHead>
										<TableHead className="min-w-36">Diagnosis</TableHead>
										<TableHead className="min-w-36">Procedure</TableHead>
										<TableHead className="w-24">Location</TableHead>
										<TableHead className="w-28">Skill Level</TableHead>
										<TableHead className="w-16 text-center">Tally</TableHead>
										<TableHead className="min-w-32">Faculty Remark</TableHead>
										<TableHead className="w-24 text-center">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.length === 0 ?
										<TableRow>
											<TableCell
												colSpan={selectedCategory === "ALL" ? 11 : 10}
												className="text-center py-12 text-muted-foreground"
											>
												No procedure log entries yet.
											</TableCell>
										</TableRow>
									:	filtered.map((entry) => (
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
												{selectedCategory === "ALL" && (
													<TableCell>
														<Badge variant="outline" className="text-xs">
															{PROCEDURE_CATEGORY_LABELS[
																entry.procedureCategory
															] ?? entry.procedureCategory}
														</Badge>
													</TableCell>
												)}
												<TableCell className="text-sm">
													{formatDate(entry.date)}
												</TableCell>
												<TableCell className="text-sm">
													{entry.patientName ?
														<div>
															<div className="line-clamp-1">
																{entry.patientName}
															</div>
															<div className="text-xs text-muted-foreground">
																{entry.patientAge ?? "—"}y /{" "}
																{entry.patientSex ?? "—"}
																{entry.uhid ? ` / ${entry.uhid}` : ""}
															</div>
														</div>
													:	<span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="text-sm">
													{entry.completeDiagnosis ?
														<div
															className="line-clamp-2 prose prose-sm max-w-none"
															dangerouslySetInnerHTML={{
																__html: renderMarkdown(entry.completeDiagnosis),
															}}
														/>
													:	<span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="text-sm">
													{entry.procedureDescription ?
														<div
															className="line-clamp-2 prose prose-sm max-w-none"
															dangerouslySetInnerHTML={{
																__html: renderMarkdown(
																	entry.procedureDescription,
																),
															}}
														/>
													:	<span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="text-sm">
													{entry.performedAtLocation || (
														<span className="text-muted-foreground">—</span>
													)}
												</TableCell>
												<TableCell>
													{entry.skillLevel ?
														<Badge variant="outline" className="text-xs">
															{SKILL_LEVEL_LABELS[entry.skillLevel] ??
																entry.skillLevel}
														</Badge>
													:	<span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="text-center font-mono">
													{entry.totalProcedureTally}
												</TableCell>
												<TableCell className="text-sm">
													{entry.facultyRemark ?
														<div
															className="line-clamp-2 prose prose-sm max-w-none"
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
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
