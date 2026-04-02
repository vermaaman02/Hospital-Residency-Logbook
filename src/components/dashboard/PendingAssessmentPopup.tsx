"use client";

import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Loader2, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStudentAssessments, getAllAssessments, getFacultyAssessments } from "@/actions/assessments";

interface PendingAssessmentPopupProps {
	role: "student" | "faculty" | "hod";
}

export function PendingAssessmentPopup({ role }: PendingAssessmentPopupProps) {
	const [open, setOpen] = useState(false);
	const [count, setCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		// 1. Check if user dismissed it today
		const dismissedAtStr = localStorage.getItem(`assessment_alert_dismissed_${role}`);
		if (dismissedAtStr) {
			const dismissedAt = new Date(dismissedAtStr);
			if (isSameDay(dismissedAt, new Date())) {
				setLoading(false);
				return; // Already dismissed today
			}
		}

		// 2. Fetch counts
		async function fetchCounts() {
			try {
				let pendingCount = 0;
				if (role === "student") {
					const assessments = await getStudentAssessments();
					// Count assessments that are NOT SUBMITTED/SIGNED 
					pendingCount = assessments.filter(a => {
						if (a.submissions.length === 0) return true;
						return a.submissions[0].status === "DRAFT" || a.submissions[0].status === "NEEDS_REVISION";
					}).length;
				} else if (role === "faculty") {
					const assessments = await getFacultyAssessments();
					pendingCount = assessments.reduce((acc, current) => {
						const pendingSubs = current.submissions.filter(s => s.status === "SUBMITTED").length;
						return acc + pendingSubs;
					}, 0);
				} else if (role === "hod") {
					const assessments = await getAllAssessments();
					pendingCount = assessments.reduce((acc, current) => {
						const pendingSubs = current.submissions.filter(s => s.status === "SUBMITTED").length;
						return acc + pendingSubs;
					}, 0);
				}

				if (pendingCount > 0) {
					setCount(pendingCount);
					setOpen(true);
				}
			} catch (error) {
				console.error("Failed to fetch assessment counts", error);
			} finally {
				setLoading(false);
			}
		}

		fetchCounts();
	}, [role]);

	const handleDismiss = () => {
		localStorage.setItem(`assessment_alert_dismissed_${role}`, new Date().toISOString());
		setOpen(false);
		toast.info("Reminder muted for today");
	};

	const handleAction = () => {
		setOpen(false);
		router.push(`/dashboard/${role}/internal-assessments`);
	};

	if (loading) return null;

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent className="sm:max-w-md">
				<button 
					onClick={() => setOpen(false)} 
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</button>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-hospital-primary">
						<BellRing className="h-5 w-5" />
						Pending Action Required
					</AlertDialogTitle>
					<AlertDialogDescription className="text-base text-hospital-text-secondary mt-2">
						{role === "student" ? (
							<>You currently have <strong className="text-hospital-text-primary text-lg">{count}</strong> internal assessment{count > 1 ? "s" : ""} waiting for your submission.</>
						) : (
							<>You have <strong className="text-hospital-text-primary text-lg">{count}</strong> student submission{count > 1 ? "s" : ""} waiting for evaluation.</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="mt-6 flex gap-2">
					<AlertDialogCancel onClick={handleDismiss} className="mt-0">
						Remind me tomorrow
					</AlertDialogCancel>
					<AlertDialogAction onClick={handleAction} className="bg-hospital-secondary hover:bg-hospital-secondary/90">
						{role === "student" ? "View Assignments" : "Evaluate Now"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
