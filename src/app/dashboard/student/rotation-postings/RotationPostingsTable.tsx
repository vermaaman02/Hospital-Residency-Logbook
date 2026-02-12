/**
 * @module RotationPostingsTable
 * @description Client component table for displaying rotation postings with
 * status badges, actions, and submit/delete buttons.
 *
 * @see PG Logbook .md — Columns: Sl. No., Rotation Posting, Date, Total Duration, Faculty Signature
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
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Send, Trash2, Pencil, Badge } from "lucide-react";
import { useTransition } from "react";
import {
	submitRotationPosting,
	deleteRotationPosting,
} from "@/actions/rotation-postings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type EntryStatus } from "@/types";

interface RotationPosting {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: Date | null;
	endDate: Date | null;
	totalDuration: string | null;
	status: string;
	facultyRemark: string | null;
}

interface RotationPostingsTableProps {
	postings: RotationPosting[];
}

export function RotationPostingsTable({
	postings,
}: RotationPostingsTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleSubmit(id: string) {
		startTransition(async () => {
			try {
				await submitRotationPosting(id);
				toast.success("Submitted for review");
				router.refresh();
			} catch {
				toast.error("Failed to submit");
			}
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			try {
				await deleteRotationPosting(id);
				toast.success("Entry deleted");
				router.refresh();
			} catch {
				toast.error("Failed to delete");
			}
		});
	}

	if (postings.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Badge className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
				<p className="text-lg font-medium">No rotation postings yet</p>
				<p className="text-sm mt-1">
					Add your first rotation posting to start tracking your PG rotations.
				</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[70px]">Sl. No.</TableHead>
						<TableHead>Rotation Posting</TableHead>
						<TableHead className="w-[80px]">Type</TableHead>
						<TableHead>Date</TableHead>
						<TableHead>Total Duration</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Faculty Remark</TableHead>
						<TableHead className="w-[140px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{postings.map((posting) => (
						<TableRow key={posting.id}>
							<TableCell className="font-medium">{posting.slNo}</TableCell>
							<TableCell>{posting.rotationName}</TableCell>
							<TableCell>
								<span
									className={
										posting.isElective ?
											"text-blue-600 dark:text-blue-400 text-xs font-medium"
										:	"text-green-600 dark:text-green-400 text-xs font-medium"
									}
								>
									{posting.isElective ? "Elective" : "Core"}
								</span>
							</TableCell>
							<TableCell>
								{posting.startDate ?
									format(new Date(posting.startDate), "dd MMM yyyy")
								:	"—"}
								{posting.endDate ?
									` – ${format(new Date(posting.endDate), "dd MMM yyyy")}`
								:	""}
							</TableCell>
							<TableCell>{posting.totalDuration ?? "—"}</TableCell>
							<TableCell>
								<StatusBadge status={posting.status as EntryStatus} size="sm" />
							</TableCell>
							<TableCell className="text-sm text-muted-foreground">
								{posting.facultyRemark ?? "—"}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-1">
									{(posting.status === "DRAFT" ||
										posting.status === "NEEDS_REVISION") && (
										<>
											<Link
												href={`/dashboard/student/rotation-postings/${posting.id}/edit`}
											>
												<Button variant="ghost" size="icon" title="Edit">
													<Pencil className="h-4 w-4" />
												</Button>
											</Link>
											<Button
												variant="ghost"
												size="icon"
												title="Submit for review"
												onClick={() => handleSubmit(posting.id)}
												disabled={isPending}
											>
												<Send className="h-4 w-4" />
											</Button>
										</>
									)}
									{posting.status === "DRAFT" && (
										<Button
											variant="ghost"
											size="icon"
											title="Delete"
											className="text-destructive hover:text-destructive"
											onClick={() => handleDelete(posting.id)}
											disabled={isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
