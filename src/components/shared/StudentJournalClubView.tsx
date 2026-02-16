/**
 * @module StudentJournalClubView
 * @description Read-only view of a student's journal club entries.
 * Used by faculty/HOD to view a student's journal club logbook page.
 *
 * @see PG Logbook .md — "JOURNAL CLUB DISCUSSION/CRITICAL APRAISAL OF LITERATURE PRESENTED"
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

export interface JournalClubViewEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	status: string;
}

interface StudentJournalClubViewProps {
	entries: JournalClubViewEntry[];
	studentName: string;
}

export function StudentJournalClubView({
	entries,
	studentName,
}: StudentJournalClubViewProps) {
	const signed = entries.filter((e) => e.status === "SIGNED").length;
	const submitted = entries.filter((e) => e.status === "SUBMITTED").length;
	const total = entries.length;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						{studentName}&apos;s Journal Clubs
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
								<TableHead className="w-28">Date</TableHead>
								<TableHead className="min-w-56">Journal Article</TableHead>
								<TableHead className="min-w-40">Type of Study</TableHead>
								<TableHead className="min-w-40">Faculty Remark</TableHead>
								<TableHead className="w-28 text-center">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{entries.length === 0 ?
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center py-12 text-muted-foreground"
									>
										No journal club entries yet.
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
										<TableCell>
											{entry.journalArticle ?
												<div
													className="prose prose-sm max-w-none text-sm line-clamp-3"
													dangerouslySetInnerHTML={{
														__html: renderMarkdown(entry.journalArticle),
													}}
												/>
											:	<span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="text-sm">
											{entry.typeOfStudy || "—"}
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
