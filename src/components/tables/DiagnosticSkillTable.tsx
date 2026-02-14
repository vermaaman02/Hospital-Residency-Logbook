/**
 * @module DiagnosticSkillTable
 * @description Reusable table for diagnostic skill entries within a single category.
 * Shows skillName, representativeDiagnosis, confidenceLevel, totalTimesPerformed, status.
 *
 * @see PG Logbook .md — "ARTERIAL/ VENOUS BLOOD GAS ANALYSIS", "ELECTROCARDIOGRAPH (ECG) ANALYSIS", "OTHER DIAGNOSTIC ANALYSIS"
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
import { CONFIDENCE_LEVEL_LABELS } from "@/lib/constants/diagnostic-types";

interface DiagnosticSkillEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	[key: string]: unknown;
}

interface DiagnosticSkillTableProps {
	entries: DiagnosticSkillEntry[];
	categoryLabel: string;
	categorySlug: string;
	totalSkills: number;
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
}

const CONFIDENCE_COLORS: Record<string, string> = {
	VC: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	FC: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	SC: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	NC: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function DiagnosticSkillTable({
	entries,
	categoryLabel,
	categorySlug,
	totalSkills,
	onSubmit,
	onDelete,
}: DiagnosticSkillTableProps) {
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
		totalSkills > 0 ?
			Math.min(100, Math.round((entries.length / totalSkills) * 100))
		:	0;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-lg">{categoryLabel}</CardTitle>
						<CardDescription>
							{entries.length} of {totalSkills} skills logged ({progressPercent}
							%)
						</CardDescription>
					</div>
					<Link href={`/dashboard/student/diagnostics/${categorySlug}/new`}>
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
						No diagnostic skills logged yet. Add your first entry.
					</div>
				:	<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">Sl. No.</TableHead>
									<TableHead>Skill / Investigation</TableHead>
									<TableHead>Representative Diagnosis</TableHead>
									<TableHead className="w-32">Confidence</TableHead>
									<TableHead className="w-20">Tally</TableHead>
									<TableHead className="w-24">Status</TableHead>
									<TableHead className="w-32">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell className="font-medium">{entry.slNo}</TableCell>
										<TableCell className="max-w-50 truncate">
											{entry.skillName}
										</TableCell>
										<TableCell className="max-w-50 truncate">
											{entry.representativeDiagnosis || "—"}
										</TableCell>
										<TableCell>
											{entry.confidenceLevel ?
												<Badge
													variant="outline"
													className={
														CONFIDENCE_COLORS[entry.confidenceLevel] ?? ""
													}
												>
													{CONFIDENCE_LEVEL_LABELS[entry.confidenceLevel] ??
														entry.confidenceLevel}
												</Badge>
											:	"—"}
										</TableCell>
										<TableCell className="text-center font-medium">
											{entry.totalTimesPerformed}
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
															href={`/dashboard/student/diagnostics/${categorySlug}/${entry.id}/edit`}
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
														href={`/dashboard/student/diagnostics/${categorySlug}/${entry.id}/edit`}
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
