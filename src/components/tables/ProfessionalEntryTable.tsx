/**
 * @module ProfessionalEntryTable
 * @description Reusable table for H1 (Courses), H2 (Conferences), H3 (Research).
 * Displays date, primary text field, secondary text field, status, actions.
 *
 * @see PG Logbook .md — Sections: Courses, Conferences, Research
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Send, Trash2, Pencil, Plus } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface ProfessionalEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	status: string;
	[key: string]: unknown;
}

interface ColumnConfig {
	key: string;
	label: string;
	className?: string;
}

interface ProfessionalEntryTableProps {
	entries: ProfessionalEntry[];
	title: string;
	description: string;
	code: string;
	maxEntries: number;
	columns: ColumnConfig[];
	newEntryHref: string;
	editHrefPrefix: string;
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
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
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [actionId, setActionId] = useState<string | null>(null);

	function handleSubmit(id: string) {
		setActionId(id);
		startTransition(async () => {
			try {
				const result = await onSubmit(id);
				if (result.success) {
					toast.success("Entry submitted for review");
					router.refresh();
				}
			} catch {
				toast.error("Failed to submit entry");
			} finally {
				setActionId(null);
			}
		});
	}

	function handleDelete(id: string) {
		setActionId(id);
		startTransition(async () => {
			try {
				const result = await onDelete(id);
				if (result.success) {
					toast.success("Entry deleted");
					router.refresh();
				}
			} catch {
				toast.error("Failed to delete entry");
			} finally {
				setActionId(null);
			}
		});
	}

	const progressPercent =
		maxEntries > 0 ?
			Math.min(100, Math.round((entries.length / maxEntries) * 100))
		:	0;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								{code}
							</Badge>
							{title}
						</CardTitle>
						<CardDescription className="mt-1">{description}</CardDescription>
					</div>
					<Button size="sm" onClick={() => router.push(newEntryHref)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Entry
					</Button>
				</div>
				<div className="mt-3">
					<div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
						<span>
							{entries.length} of {maxEntries} entries
						</span>
						<span>{progressPercent}%</span>
					</div>
					<div className="h-2 w-full rounded-full bg-muted">
						<div
							className="h-2 rounded-full bg-primary transition-all"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ?
					<div className="border rounded-lg p-8 text-center text-muted-foreground">
						No entries yet. Add your first entry.
					</div>
				:	<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-14">Sl.</TableHead>
									<TableHead className="w-28">Date</TableHead>
									{columns.map((col) => (
										<TableHead key={col.key} className={col.className}>
											{col.label}
										</TableHead>
									))}
									<TableHead className="w-24">Status</TableHead>
									<TableHead className="w-32">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell className="font-medium">{entry.slNo}</TableCell>
										<TableCell>
											{entry.date ?
												format(new Date(entry.date as string), "dd MMM yyyy")
											:	"—"}
										</TableCell>
										{columns.map((col) => (
											<TableCell key={col.key} className={col.className}>
												<span className="line-clamp-2">
													{(entry[col.key] as string) ?? "—"}
												</span>
											</TableCell>
										))}
										<TableCell>
											<StatusBadge status={entry.status as never} />
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												{(entry.status === "DRAFT" ||
													entry.status === "NEEDS_REVISION") && (
													<>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() =>
																router.push(
																	`${editHrefPrefix}/${entry.id}/edit`,
																)
															}
														>
															<Pencil className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() => handleSubmit(entry.id)}
															disabled={isPending && actionId === entry.id}
														>
															{isPending && actionId === entry.id ?
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															:	<Send className="h-3.5 w-3.5" />}
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-destructive"
															onClick={() => handleDelete(entry.id)}
															disabled={isPending && actionId === entry.id}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				}
			</CardContent>
		</Card>
	);
}
