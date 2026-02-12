/**
 * @module ClinicalSkillsTable
 * @description Reusable table for clinical skills (Adult & Pediatric).
 * Shows all 10 skills with confidence levels, tally, status, and actions.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Edit, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CONFIDENCE_LEVELS } from "@/lib/constants/clinical-skills";
import { ENTRY_STATUS_COLORS } from "@/lib/constants/entry-status";

interface ClinicalSkillEntry {
	id: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	status: string;
	[key: string]: unknown;
}

interface ClinicalSkillsTableProps {
	entries: ClinicalSkillEntry[];
	type: "adult" | "pediatric";
	onInitialize: () => Promise<{ initialized: boolean }>;
	onSubmit: (type: "adult" | "pediatric", id: string) => Promise<{ success: boolean }>;
}

export function ClinicalSkillsTable({
	entries,
	type,
	onInitialize,
	onSubmit,
}: ClinicalSkillsTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	// Auto-initialize if no entries exist
	useEffect(() => {
		if (entries.length === 0) {
			startTransition(async () => {
				try {
					const result = await onInitialize();
					if (result.initialized) {
						router.refresh();
					}
				} catch {
					toast.error("Failed to initialize skills");
				}
			});
		}
	}, [entries.length, onInitialize, router]);

	function handleSubmit(id: string) {
		setLoadingId(id);
		startTransition(async () => {
			try {
				await onSubmit(type, id);
				toast.success("Submitted for review");
				router.refresh();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to submit");
			} finally {
				setLoadingId(null);
			}
		});
	}

	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const confidenceLabel = (val: string | null) => {
		if (!val) return "—";
		return CONFIDENCE_LEVELS.find((cl) => cl.value === val)?.label ?? val;
	};
	const label = type === "adult" ? "Adult" : "Pediatric";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Clinical Skills — {label}</CardTitle>
						<CardDescription>
							{signedCount} of 10 skills signed off
						</CardDescription>
					</div>
					<Badge variant="outline" className="text-sm">
						{signedCount}/10
					</Badge>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-muted rounded-full h-2 mt-2">
					<div
						className="bg-hospital-secondary rounded-full h-2 transition-all"
						style={{ width: `${(signedCount / 10) * 100}%` }}
					/>
				</div>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						{isPending
							? "Initializing skills..."
							: "No skills found. Refresh to initialize."}
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">Sl.</TableHead>
									<TableHead>Clinical Skill ({label} Patient)</TableHead>
									<TableHead>Representative Diagnosis</TableHead>
									<TableHead>Confidence</TableHead>
									<TableHead className="w-16">Tally</TableHead>
									<TableHead className="w-24">Status</TableHead>
									<TableHead className="w-24">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map((entry) => {
									const statusColor =
										ENTRY_STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-700";
									return (
										<TableRow key={entry.id}>
											<TableCell className="font-mono">
												{entry.slNo}
											</TableCell>
											<TableCell className="font-medium">
												{entry.skillName}
											</TableCell>
											<TableCell className="max-w-[200px] truncate">
												{entry.representativeDiagnosis || (
													<span className="text-muted-foreground italic">
														Not filled
													</span>
												)}
											</TableCell>
											<TableCell>
												{entry.confidenceLevel ? (
													<Badge variant="outline" className="text-xs">
														{confidenceLabel(entry.confidenceLevel)}
													</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-center font-mono">
												{entry.totalTimesPerformed}
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
																href={`/dashboard/student/clinical-skills/${type}/${entry.id}/edit`}
															>
																<Edit className="h-3.5 w-3.5" />
															</Link>
														</Button>
													)}
													{entry.status === "DRAFT" &&
														entry.confidenceLevel && (
															<Button
																variant="ghost"
																size="icon"
																className="h-7 w-7"
																onClick={() => handleSubmit(entry.id)}
																disabled={isPending && loadingId === entry.id}
															>
																{isPending && loadingId === entry.id ? (
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																) : (
																	<Send className="h-3.5 w-3.5" />
																)}
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
				)}
			</CardContent>
		</Card>
	);
}
