/**
 * @module AcademicEntryTable
 * @description Reusable table component for all academic entries
 * (Case Presentations, Seminars, Journal Clubs).
 * Renders common columns + optional extra columns per module.
 *
 * @see PG Logbook .md — Academic sections
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { format } from "date-fns";
import { Edit, Trash2, Send, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ENTRY_STATUS_COLORS } from "@/lib/constants/entry-status";

interface AcademicEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	status: string;
	facultyRemark: string | null;
	[key: string]: unknown;
}

interface AcademicEntryTableProps {
	entries: AcademicEntry[];
	title: string;
	description: string;
	targetCount: number;
	newEntryHref: string;
	columns: {
		key: string;
		label: string;
		render?: (entry: AcademicEntry) => React.ReactNode;
	}[];
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function AcademicEntryTable({
	entries,
	title,
	description,
	targetCount,
	newEntryHref,
	columns,
	onSubmit,
	onDelete,
}: AcademicEntryTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	const signedCount = entries.filter((e) => e.status === "SIGNED").length;

	function handleSubmit(id: string) {
		setLoadingId(id);
		startTransition(async () => {
			try {
				await onSubmit(id);
				toast.success("Submitted for review");
				router.refresh();
			} catch {
				toast.error("Failed to submit");
			} finally {
				setLoadingId(null);
			}
		});
	}

	function handleDelete(id: string) {
		if (!confirm("Delete this draft entry?")) return;
		setLoadingId(id);
		startTransition(async () => {
			try {
				await onDelete(id);
				toast.success("Entry deleted");
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			} finally {
				setLoadingId(null);
			}
		});
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
						<p className="text-sm text-muted-foreground mt-1">
							Progress: {signedCount} of {targetCount} entries signed
						</p>
					</div>
					<Button asChild>
						<Link href={newEntryHref}>
							<Plus className="h-4 w-4 mr-2" />
							New Entry
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ?
					<div className="text-center py-8 text-muted-foreground">
						No entries yet. Add your first entry.
					</div>
				:	<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">Sl. No.</TableHead>
									<TableHead className="w-28">Date</TableHead>
									{columns.map((col) => (
										<TableHead key={col.key}>{col.label}</TableHead>
									))}
									<TableHead>Status</TableHead>
									<TableHead>Faculty Remark</TableHead>
									<TableHead className="w-32">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => {
									const statusColor =
										ENTRY_STATUS_COLORS[
											entry.status as keyof typeof ENTRY_STATUS_COLORS
										] ?? "default";
									const isLoading = isPending && loadingId === entry.id;
									const isDraft = entry.status === "DRAFT";
									const canSubmit =
										isDraft || entry.status === "NEEDS_REVISION";

									return (
										<TableRow key={entry.id}>
											<TableCell className="font-medium">
												{entry.slNo}
											</TableCell>
											<TableCell>
												{entry.date ?
													format(new Date(entry.date), "dd/MM/yyyy")
												:	"—"}
											</TableCell>
											{columns.map((col) => (
												<TableCell key={col.key}>
													{col.render ?
														col.render(entry)
													:	((entry[col.key] as string) ?? "—")}
												</TableCell>
											))}
											<TableCell>
												<Badge
													variant={
														statusColor as
															| "default"
															| "secondary"
															| "destructive"
															| "outline"
													}
												>
													{entry.status}
												</Badge>
											</TableCell>
											<TableCell className="max-w-37.5 truncate">
												{entry.facultyRemark ?? "—"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													{canSubmit && (
														<>
															<Button
																size="icon"
																variant="ghost"
																onClick={() =>
																	router.push(
																		`${newEntryHref.replace("/new", "")}/${entry.id}/edit`,
																	)
																}
																disabled={isLoading}
															>
																<Edit className="h-4 w-4" />
															</Button>
															<Button
																size="icon"
																variant="ghost"
																onClick={() => handleSubmit(entry.id)}
																disabled={isLoading}
																title="Submit for review"
															>
																{isLoading ?
																	<Loader2 className="h-4 w-4 animate-spin" />
																:	<Send className="h-4 w-4" />}
															</Button>
														</>
													)}
													{isDraft && (
														<Button
															size="icon"
															variant="ghost"
															className="text-destructive"
															onClick={() => handleDelete(entry.id)}
															disabled={isLoading}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				}
			</CardContent>
		</Card>
	);
}
