/**
 * @module ImagingLogTable
 * @description Reusable table for imaging log entries within a single category.
 * Shows date, patient info, diagnosis, procedure, location, skill level, status.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
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
import { Edit, Send, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ENTRY_STATUS_COLORS } from "@/lib/constants/entry-status";
import { IMAGING_SKILL_LEVEL_LABELS } from "@/lib/constants/imaging-log-fields";
import { format } from "date-fns";

interface ImagingLogEntry {
	id: string;
	slNo: number;
	date: string | Date | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: string | null;
	status: string;
	[key: string]: unknown;
}

interface ImagingLogTableProps {
	entries: ImagingLogEntry[];
	categoryLabel: string;
	categorySlug: string;
	maxEntries: number;
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function ImagingLogTable({
	entries,
	categoryLabel,
	categorySlug,
	maxEntries,
	onSubmit,
	onDelete,
}: ImagingLogTableProps) {
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
					<div className="space-y-1">
						<CardTitle className="text-lg">{categoryLabel}</CardTitle>
						<CardDescription>
							{entries.length} of {maxEntries} entries ({progressPercent}%)
						</CardDescription>
					</div>
					<Link href={`/dashboard/student/imaging/${categorySlug}/new`}>
						<Button size="sm">
							<Plus className="h-4 w-4 mr-1" />
							New Entry
						</Button>
					</Link>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
					<div
						className="bg-hospital-primary h-2 rounded-full transition-all duration-500"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ?
					<div className="text-center py-8 text-muted-foreground">
						No imaging entries logged yet. Add your first entry.
					</div>
				:	<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">Sl. No.</TableHead>
									<TableHead className="w-24">Date</TableHead>
									<TableHead>Patient Info</TableHead>
									<TableHead>Diagnosis</TableHead>
									<TableHead className="w-28">Skill Level</TableHead>
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
												format(new Date(entry.date), "dd MMM yyyy")
											:	"—"}
										</TableCell>
										<TableCell className="max-w-[200px] truncate">
											{entry.patientInfo || "—"}
										</TableCell>
										<TableCell className="max-w-[200px] truncate">
											{entry.completeDiagnosis || "—"}
										</TableCell>
										<TableCell>
											{entry.skillLevel ?
												<Badge variant="outline">
													{IMAGING_SKILL_LEVEL_LABELS[entry.skillLevel] ??
														entry.skillLevel}
												</Badge>
											:	"—"}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={
													ENTRY_STATUS_COLORS[
														entry.status as keyof typeof ENTRY_STATUS_COLORS
													] ?? ""
												}
											>
												{entry.status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												{entry.status === "DRAFT" && (
													<>
														<Link
															href={`/dashboard/student/imaging/${categorySlug}/${entry.id}/edit`}
														>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8"
															>
																<Edit className="h-4 w-4" />
															</Button>
														</Link>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={() => handleSubmit(entry.id)}
															disabled={isPending && actionId === entry.id}
														>
															{isPending && actionId === entry.id ?
																<Loader2 className="h-4 w-4 animate-spin" />
															:	<Send className="h-4 w-4" />}
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-red-600"
															onClick={() => handleDelete(entry.id)}
															disabled={isPending && actionId === entry.id}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
												{entry.status === "NEEDS_REVISION" && (
													<Link
														href={`/dashboard/student/imaging/${categorySlug}/${entry.id}/edit`}
													>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<Edit className="h-4 w-4" />
														</Button>
													</Link>
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
