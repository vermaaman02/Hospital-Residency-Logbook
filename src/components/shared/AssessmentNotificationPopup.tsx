/**
 * @module AssessmentNotificationPopup
 * @description Modal popup for students showing new/pending internal assessments.
 * Auto-opens on dashboard load if there are pending assessments.
 * Uses sessionStorage to avoid re-showing in the same session.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
	ClipboardList,
	Calendar,
	Clock,
	Award,
	AlertCircle,
	ArrowRight,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface PendingAssessment {
	id: string;
	title: string;
	assessmentType: string;
	deadline: string | null;
	maxMarks: number | null;
	createdBy: string;
	batchName: string;
}

interface AssessmentNotificationPopupProps {
	assessments: PendingAssessment[];
}

const SESSION_STORAGE_KEY = "assessment-popup-dismissed";

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
	THEORY: "Theory",
	PRACTICAL: "Practical",
	VIVA: "Viva",
	ASSIGNMENT: "Assignment",
	PROJECT: "Project",
	OTHER: "Other",
};

export function AssessmentNotificationPopup({
	assessments,
}: AssessmentNotificationPopupProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (assessments.length === 0) return;

		// Check if already dismissed this session
		try {
			const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
			if (dismissed) {
				const dismissedIds = JSON.parse(dismissed) as string[];
				const newAssessments = assessments.filter(
					(a) => !dismissedIds.includes(a.id)
				);
				if (newAssessments.length > 0) {
					setIsOpen(true);
				}
			} else {
				setIsOpen(true);
			}
		} catch {
			setIsOpen(true);
		}
	}, [assessments]);

	const handleDismiss = () => {
		setIsOpen(false);
		try {
			sessionStorage.setItem(
				SESSION_STORAGE_KEY,
				JSON.stringify(assessments.map((a) => a.id))
			);
		} catch {
			// Ignore storage errors
		}
	};

	if (assessments.length === 0) return null;

	return (
		<Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg">
						<ClipboardList className="h-5 w-5 text-amber-500" />
						Pending Assessments
					</DialogTitle>
					<DialogDescription>
						You have {assessments.length} assessment{assessments.length > 1 ? "s" : ""}{" "}
						that require your attention.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-2">
					{assessments.map((a) => {
						const isOverdue = a.deadline ? isPast(new Date(a.deadline)) : false;

						return (
							<div
								key={a.id}
								className={`p-3 rounded-lg border transition-colors ${
									isOverdue
										? "border-red-200 bg-red-50/50"
										: "border-border bg-muted/30"
								}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<h4 className="font-semibold text-sm truncate">
											{a.title}
										</h4>
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											<Badge variant="outline" className="text-xs">
												{ASSESSMENT_TYPE_LABELS[a.assessmentType] ??
													a.assessmentType}
											</Badge>
											{a.maxMarks && (
												<span className="text-xs text-muted-foreground flex items-center gap-0.5">
													<Award className="h-3 w-3" />
													{a.maxMarks} marks
												</span>
											)}
										</div>
										{a.deadline && (
											<p
												className={`text-xs mt-1.5 flex items-center gap-1 ${
													isOverdue
														? "text-red-600 font-medium"
														: "text-muted-foreground"
												}`}
											>
												{isOverdue ? (
													<AlertCircle className="h-3 w-3" />
												) : (
													<Calendar className="h-3 w-3" />
												)}
												{isOverdue ? "Overdue: " : "Deadline: "}
												{format(new Date(a.deadline), "dd MMM yyyy, hh:mm a")}
												{!isOverdue && (
													<span className="text-xs opacity-75">
														(
														{formatDistanceToNow(new Date(a.deadline), {
															addSuffix: true,
														})}
														)
													</span>
												)}
											</p>
										)}
										<p className="text-xs text-muted-foreground mt-0.5">
											By {a.createdBy} • {a.batchName}
										</p>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button variant="outline" onClick={handleDismiss} className="flex-1">
						Dismiss
					</Button>
					<Button asChild className="flex-1 gap-1">
						<Link href="/dashboard/student/internal-assessments">
							View All Assessments
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
