/**
 * @module ProfessionalEntryTable
 * @description Generic table component for professional entries.
 * Used by Courses & Conferences, Research, and Disaster QI modules.
 *
 * @note This is a minimal placeholder. For Life-Support Courses, use
 * the dedicated LifeSupportCoursesTable component instead.
 */

"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

interface ColumnDef {
	key: string;
	label: string;
	className?: string;
	render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface ProfessionalEntryTableProps {
	entries: Record<string, unknown>[];
	title: string;
	description: string;
	code: string;
	maxEntries: number;
	columns: ColumnDef[];
	newEntryHref: string;
	editHrefPrefix?: string;
	onSubmit?: (id: string) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
}

export function ProfessionalEntryTable({
	entries,
	title,
	description,
	code,
	maxEntries,
	columns,
	newEntryHref,
	editHrefPrefix,
	onSubmit,
	onDelete,
}: ProfessionalEntryTableProps) {
	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const draftCount = entries.filter((e) => e.status === "DRAFT").length;

	const renderCell = (col: ColumnDef, entry: Record<string, unknown>) => {
		const value = entry[col.key];
		if (col.render) return col.render(value, entry);
		if (col.key === "date" && value) {
			return format(new Date(value as string), "dd/MM/yyyy");
		}
		return String(value ?? "—");
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<span className="text-sm font-semibold bg-muted px-2 py-0.5 rounded">
							{code}
						</span>
						{title}
					</CardTitle>
					<CardDescription>{description}</CardDescription>
					<p className="text-xs text-muted-foreground mt-1">
						{signedCount} of {maxEntries} entries signed
					</p>
				</div>
				{entries.length < maxEntries && (
					<Link href={newEntryHref}>
						<Button size="sm" className="gap-1.5">
							<Plus className="h-4 w-4" />
							Add Entry
						</Button>
					</Link>
				)}
			</CardHeader>
			<CardContent className="p-0 overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="w-12 text-center font-bold">Sl.</TableHead>
							<TableHead className="w-28 text-center font-bold">Date</TableHead>
							{columns.map((col) => (
								<TableHead
									key={col.key}
									className={cn("font-bold", col.className)}
								>
									{col.label}
								</TableHead>
							))}
							<TableHead className="w-24 text-center font-bold">
								Status
							</TableHead>
							<TableHead className="w-28 text-center font-bold">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{entries.map((entry, idx) => (
							<TableRow
								key={String(entry.id)}
								className={cn(
									entry.status === "SIGNED" && "bg-green-50/50",
									entry.status === "NEEDS_REVISION" && "bg-orange-50/50",
								)}
							>
								<TableCell className="text-center font-medium">
									{idx + 1}.
								</TableCell>
								<TableCell className="text-center text-sm">
									{entry.date ?
										format(new Date(entry.date as string), "dd/MM/yy")
									:	"—"}
								</TableCell>
								{columns.map((col) => (
									<TableCell
										key={col.key}
										className={cn("text-sm", col.className)}
									>
										{renderCell(col, entry)}
									</TableCell>
								))}
								<TableCell className="text-center">
									<StatusBadge status={entry.status as EntryStatus} size="sm" />
								</TableCell>
								<TableCell className="text-center">
									{entry.status === "DRAFT" && onDelete && (
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive"
											onClick={() => onDelete(String(entry.id))}
											title="Delete"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
						{entries.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={columns.length + 4}
									className="text-center py-8 text-muted-foreground"
								>
									No entries yet. Add your first entry.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
