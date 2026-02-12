/**
 * @module ProcedureLogTable
 * @description Reusable table for procedure log entries within a single category.
 * Shows all logged procedures with date, patient info, diagnosis, skill level, status.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES"
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
import { SKILL_LEVEL_LABELS } from "@/lib/constants/procedure-log-fields";
import { format } from "date-fns";

interface ProcedureLogEntry {
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

interface ProcedureLogTableProps {
	entries: ProcedureLogEntry[];
	categorySlug: string;
	categoryLabel: string;
	maxEntries: number;
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function ProcedureLogTable({
	entries,
	categorySlug,
	categoryLabel,
	maxEntries,
	onSubmit,
	onDelete,
}: ProcedureLogTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [actionType, setActionType] = useState<"submit" | "delete" | null>(
		null,
	);

	function handleSubmit(id: string) {
		setLoadingId(id);
		setActionType("submit");
		startTransition(async () => {
			try {
				await onSubmit(id);
				toast.success("Submitted for review");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to submit");
			} finally {
				setLoadingId(null);
				setActionType(null);
			}
		});
	}

	function handleDelete(id: string) {
		setLoadingId(id);
		setActionType("delete");
		startTransition(async () => {
			try {
				await onDelete(id);
				toast.success("Entry deleted");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to delete");
			} finally {
				setLoadingId(null);
				setActionType(null);
			}
		});
	}

	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const progress = maxEntries > 0 ? Math.round((entries.length / maxEntries) * 100) : 0;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{categoryLabel}</CardTitle>
						<CardDescription>
							{entries.length} of {maxEntries} entries logged, {signedCount}{" "}
							signed
						</CardDescription>
						{/* Progress bar */}
						<div className="mt-2 w-64 bg-hospital-surface rounded-full h-2">
							<div
								className="bg-hospital-primary rounded-full h-2 transition-all"
								style={{ width: `${Math.min(progress, 100)}%` }}
							/>
						</div>
					</div>
					<Button asChild>
						<Link
							href={`/dashboard/student/procedures/${categorySlug}/new`}
						>
							<Plus className="mr-2 h-4 w-4" /> New Entry
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						No procedure entries yet. Click &ldquo;New Entry&rdquo; to log your
						first procedure.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">Sl.</TableHead>
									<TableHead className="w-28">Date</TableHead>
									<TableHead>Patient Info</TableHead>
									<TableHead>Diagnosis</TableHead>
									<TableHead>Procedure</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Skill Level</TableHead>
									<TableHead className="w-28">Status</TableHead>
									<TableHead className="w-28">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => {
									const statusColor =
										ENTRY_STATUS_COLORS[entry.status] ??
										"bg-gray-100 text-gray-700";
									const isLoading = isPending && loadingId === entry.id;
									return (
										<TableRow key={entry.id}>
											<TableCell className="font-mono">
												{entry.slNo}
											</TableCell>
											<TableCell>
												{entry.date
													? format(new Date(entry.date), "dd/MM/yyyy")
													: "—"}
											</TableCell>
											<TableCell className="max-w-[150px] truncate">
												{entry.patientInfo || "—"}
											</TableCell>
											<TableCell className="max-w-[150px] truncate">
												{entry.completeDiagnosis || "—"}
											</TableCell>
											<TableCell className="max-w-[150px] truncate">
												{entry.procedureDescription || "—"}
											</TableCell>
											<TableCell>
												{entry.performedAtLocation || "—"}
											</TableCell>
											<TableCell>
												{entry.skillLevel ? (
													<Badge variant="outline" className="text-xs">
														{entry.skillLevel} —{" "}
														{SKILL_LEVEL_LABELS[entry.skillLevel] ??
															entry.skillLevel}
													</Badge>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell>
												<Badge className={`text-xs ${statusColor}`}>
													{entry.status}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													{entry.status !== "SIGNED" && (
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															asChild
														>
															<Link
																href={`/dashboard/student/procedures/${categorySlug}/${entry.id}/edit`}
															>
																<Edit className="h-3.5 w-3.5" />
															</Link>
														</Button>
													)}
													{entry.status === "DRAFT" && (
														<>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7"
																onClick={() => handleSubmit(entry.id)}
																disabled={isLoading}
															>
																{isLoading && actionType === "submit" ? (
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																) : (
																	<Send className="h-3.5 w-3.5" />
																)}
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-destructive"
																onClick={() => handleDelete(entry.id)}
																disabled={isLoading}
															>
																{isLoading && actionType === "delete" ? (
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																) : (
																	<Trash2 className="h-3.5 w-3.5" />
																)}
															</Button>
														</>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
