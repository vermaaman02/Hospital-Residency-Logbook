/**
 * @module StudentCaseManagementView
 * @description Read-only view of a student's case management entries.
 * Used by faculty/HOD to view a student's case management logbook page.
 * Groups entries by category (24 categories).
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
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
import { COMPETENCY_LEVEL_OPTIONS } from "@/lib/constants/case-management-fields";
import {
	CASE_CATEGORIES,
	CASE_CATEGORY_LABELS,
} from "@/lib/constants/case-categories";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/components/shared/MarkdownEditor";
import type { EntryStatus } from "@/types";

export interface CaseManagementViewEntry {
	id: string;
	slNo: number;
	category: string;
	caseSubCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	facultyRemark: string | null;
	status: string;
}

interface StudentCaseManagementViewProps {
	entries: CaseManagementViewEntry[];
	studentName: string;
}

export function StudentCaseManagementView({
	entries,
	studentName,
}: StudentCaseManagementViewProps) {
	const [selectedCategory, setSelectedCategory] = useState("ALL");

	// Get categories that have entries
	const availableCategories = useMemo(() => {
		const set = new Set<string>();
		entries.forEach((e) => set.add(e.category));
		return CASE_CATEGORIES.filter((c) => set.has(c.enumValue));
	}, [entries]);

	const filtered = useMemo(() => {
		if (selectedCategory === "ALL") return entries;
		return entries.filter((e) => e.category === selectedCategory);
	}, [entries, selectedCategory]);

	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;

	const competencyLabel = (val: string | null) => {
		if (!val) return "—";
		return (
			COMPETENCY_LEVEL_OPTIONS.find((cl) => cl.value === val)?.label ?? val
		);
	};

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
								{entries.filter((e) => e.category === cat.enumValue).length})
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
						{studentName}&apos;s Case Management Log
						{selectedCategory !== "ALL" &&
							` — ${CASE_CATEGORY_LABELS[selectedCategory] ?? selectedCategory}`}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<div style={{ minWidth: "1200px" }}>
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/40">
										<TableHead className="w-14 text-center">Sl.</TableHead>
										{selectedCategory === "ALL" && (
											<TableHead className="min-w-32">Category</TableHead>
										)}
										<TableHead className="min-w-44">Case Type</TableHead>
										<TableHead className="w-24">Date</TableHead>
										<TableHead className="min-w-32">Patient</TableHead>
										<TableHead className="min-w-36">Diagnosis</TableHead>
										<TableHead className="w-28">Competency</TableHead>
										<TableHead className="w-16 text-center">Tally</TableHead>
										<TableHead className="min-w-32">Faculty Remark</TableHead>
										<TableHead className="w-24 text-center">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.length === 0 ?
										<TableRow>
											<TableCell
												colSpan={selectedCategory === "ALL" ? 10 : 9}
												className="text-center py-12 text-muted-foreground"
											>
												No case management entries yet.
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
															{CASE_CATEGORY_LABELS[entry.category] ??
																entry.category}
														</Badge>
													</TableCell>
												)}
												<TableCell className="text-sm font-medium">
													{entry.caseSubCategory}
												</TableCell>
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
												<TableCell>
													{entry.competencyLevel ?
														<Badge variant="outline" className="text-xs">
															{competencyLabel(entry.competencyLevel)}
														</Badge>
													:	<span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="text-center font-mono">
													{entry.totalCaseTally}
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
