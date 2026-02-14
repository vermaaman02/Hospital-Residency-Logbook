/**
 * @module CaseManagementTable
 * @description Reusable table for case management entries within a single category.
 * Shows all logged cases with sub-category, date, diagnosis, competency, tally, status.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT"
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
import { COMPETENCY_LEVEL_OPTIONS } from "@/lib/constants/case-management-fields";
import { format } from "date-fns";

interface CaseManagementEntry {
	id: string;
	slNo: number;
	caseSubCategory: string;
	date: string | Date | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	competencyLevel: string | null;
	totalCaseTally: number;
	status: string;
	[key: string]: unknown;
}

interface CaseManagementTableProps {
	entries: CaseManagementEntry[];
	categorySlug: string;
	categoryLabel: string;
	onSubmit: (id: string) => Promise<{ success: boolean }>;
	onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function CaseManagementTable({
	entries,
	categorySlug,
	categoryLabel,
	onSubmit,
	onDelete,
}: CaseManagementTableProps) {
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
	const competencyLabel = (val: string | null) => {
		if (!val) return "—";
		return COMPETENCY_LEVEL_OPTIONS.find((o) => o.value === val)?.label ?? val;
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{categoryLabel}</CardTitle>
						<CardDescription>
							{entries.length} entries logged, {signedCount} signed
						</CardDescription>
					</div>
					<Button asChild>
						<Link
							href={`/dashboard/student/case-management/${categorySlug}/new`}
						>
							<Plus className="mr-2 h-4 w-4" /> New Entry
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ?
					<div className="text-center py-8 text-muted-foreground">
						No case entries yet. Click &ldquo;New Entry&rdquo; to log your first
						case.
					</div>
				:	<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">Sl.</TableHead>
									<TableHead>Case Category</TableHead>
									<TableHead className="w-28">Date</TableHead>
									<TableHead>Patient Info</TableHead>
									<TableHead>Diagnosis</TableHead>
									<TableHead>Competency</TableHead>
									<TableHead className="w-14">Tally</TableHead>
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
											<TableCell className="font-mono">{entry.slNo}</TableCell>
											<TableCell className="font-medium max-w-45 truncate">
												{entry.caseSubCategory}
											</TableCell>
											<TableCell>
												{entry.date ?
													format(new Date(entry.date), "dd/MM/yyyy")
												:	"—"}
											</TableCell>
											<TableCell className="max-w-37.5 truncate">
												{entry.patientInfo || "—"}
											</TableCell>
											<TableCell className="max-w-45 truncate">
												{entry.completeDiagnosis || "—"}
											</TableCell>
											<TableCell>
												{entry.competencyLevel ?
													<Badge variant="outline" className="text-xs">
														{competencyLabel(entry.competencyLevel)}
													</Badge>
												:	"—"}
											</TableCell>
											<TableCell className="text-center font-mono">
												{entry.totalCaseTally}
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
																href={`/dashboard/student/case-management/${categorySlug}/${entry.id}/edit`}
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
																{isLoading && actionType === "submit" ?
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																:	<Send className="h-3.5 w-3.5" />}
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7 text-destructive"
																onClick={() => handleDelete(entry.id)}
																disabled={isLoading}
															>
																{isLoading && actionType === "delete" ?
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																:	<Trash2 className="h-3.5 w-3.5" />}
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
				}
			</CardContent>
		</Card>
	);
}
