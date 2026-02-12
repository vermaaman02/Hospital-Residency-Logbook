/**
 * @module FacultyReviewsClient
 * @description Client component for faculty to review and sign-off student entries.
 */

"use client";

import { useState, useTransition } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	signRotationPosting,
	rejectRotationPosting,
} from "@/actions/rotation-postings";
import { signAttendanceSheet } from "@/actions/attendance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, X, Loader2, FileText, Calendar } from "lucide-react";

interface UserInfo {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
}

interface PendingRotation {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: Date | null;
	endDate: Date | null;
	totalDuration: string | null;
	user: UserInfo;
}

interface AttendanceEntry {
	id: string;
	day: string;
	presentAbsent: string | null;
}

interface PendingAttendance {
	id: string;
	weekStartDate: Date;
	weekEndDate: Date;
	batch: string | null;
	postedDepartment: string | null;
	entries: AttendanceEntry[];
	user: UserInfo;
}

interface FacultyReviewsClientProps {
	pendingRotations: PendingRotation[];
	pendingAttendance: PendingAttendance[];
	isHod: boolean;
}

export function FacultyReviewsClient({
	pendingRotations,
	pendingAttendance,
	isHod,
}: FacultyReviewsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [rejectTarget, setRejectTarget] = useState<{
		id: string;
		type: string;
	} | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	function handleSignRotation(id: string) {
		startTransition(async () => {
			try {
				await signRotationPosting(id);
				toast.success("Rotation posting signed");
				router.refresh();
			} catch {
				toast.error("Failed to sign");
			}
		});
	}

	function handleRejectRotation() {
		if (!rejectTarget || !rejectRemark.trim()) {
			toast.error("Please provide a remark");
			return;
		}
		startTransition(async () => {
			try {
				await rejectRotationPosting(rejectTarget.id, rejectRemark);
				toast.success("Revision requested");
				setRejectDialogOpen(false);
				setRejectRemark("");
				router.refresh();
			} catch {
				toast.error("Failed to reject");
			}
		});
	}

	function handleSignAttendance(id: string) {
		startTransition(async () => {
			try {
				await signAttendanceSheet(id);
				toast.success("Attendance sheet signed");
				router.refresh();
			} catch {
				toast.error("Failed to sign");
			}
		});
	}

	function openRejectDialog(id: string, type: string) {
		setRejectTarget({ id, type });
		setRejectRemark("");
		setRejectDialogOpen(true);
	}

	const totalPending = pendingRotations.length + pendingAttendance.length;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Badge variant="outline" className="text-sm">
					{totalPending} pending review{totalPending !== 1 ? "s" : ""}
				</Badge>
			</div>

			<Tabs defaultValue="rotations">
				<TabsList>
					<TabsTrigger value="rotations">
						<FileText className="h-4 w-4 mr-1" />
						Rotations ({pendingRotations.length})
					</TabsTrigger>
					{isHod && (
						<TabsTrigger value="attendance">
							<Calendar className="h-4 w-4 mr-1" />
							Attendance ({pendingAttendance.length})
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="rotations" className="mt-4 space-y-4">
					{pendingRotations.length === 0 ?
						<div className="border rounded-lg p-8 text-center text-muted-foreground">
							No pending rotation postings to review
						</div>
					:	pendingRotations.map((rotation) => (
							<Card key={rotation.id}>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-base">
												{rotation.rotationName}
											</CardTitle>
											<CardDescription>
												{rotation.user.firstName} {rotation.user.lastName} — Sl.
												No. {rotation.slNo}
												{rotation.isElective && " (Elective)"}
											</CardDescription>
										</div>
										<Badge
											variant="outline"
											className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
										>
											Submitted
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
										{rotation.startDate && (
											<span>
												{format(new Date(rotation.startDate), "dd MMM yyyy")}
												{rotation.endDate &&
													` – ${format(new Date(rotation.endDate), "dd MMM yyyy")}`}
											</span>
										)}
										{rotation.totalDuration && (
											<span>Duration: {rotation.totalDuration}</span>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											onClick={() => handleSignRotation(rotation.id)}
											disabled={isPending}
										>
											{isPending ?
												<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
											:	<Check className="h-3.5 w-3.5 mr-1" />}
											Sign Off
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => openRejectDialog(rotation.id, "rotation")}
											disabled={isPending}
										>
											<X className="h-3.5 w-3.5 mr-1" />
											Request Revision
										</Button>
									</div>
								</CardContent>
							</Card>
						))
					}
				</TabsContent>

				{isHod && (
					<TabsContent value="attendance" className="mt-4 space-y-4">
						{pendingAttendance.length === 0 ?
							<div className="border rounded-lg p-8 text-center text-muted-foreground">
								No pending attendance sheets to review
							</div>
						:	pendingAttendance.map((sheet) => {
								const presentDays = sheet.entries.filter(
									(e) => e.presentAbsent?.toLowerCase() === "present",
								).length;

								return (
									<Card key={sheet.id}>
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<div>
													<CardTitle className="text-base">
														Week:{" "}
														{format(new Date(sheet.weekStartDate), "dd MMM")} –{" "}
														{format(new Date(sheet.weekEndDate), "dd MMM yyyy")}
													</CardTitle>
													<CardDescription>
														{sheet.user.firstName} {sheet.user.lastName}
														{sheet.postedDepartment &&
															` — ${sheet.postedDepartment}`}
														{` — ${presentDays}/${sheet.entries.length} days present`}
													</CardDescription>
												</div>
												<Badge
													variant="outline"
													className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
												>
													Submitted
												</Badge>
											</div>
										</CardHeader>
										<CardContent>
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													onClick={() => handleSignAttendance(sheet.id)}
													disabled={isPending}
												>
													{isPending ?
														<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
													:	<Check className="h-3.5 w-3.5 mr-1" />}
													Sign Off
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})
						}
					</TabsContent>
				)}
			</Tabs>

			{/* Reject Dialog */}
			<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Revision</DialogTitle>
						<DialogDescription>
							Provide a remark explaining what needs to be revised.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Enter your remark..."
						value={rejectRemark}
						onChange={(e) => setRejectRemark(e.target.value)}
						rows={4}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRejectDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleRejectRotation}
							disabled={isPending || !rejectRemark.trim()}
						>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Request Revision
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
