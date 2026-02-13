/**
 * @module ReviewTabsClient
 * @description 3-tab layout for faculty/HOD rotation-postings review page.
 * Tab 1: Rotation Postings (sign/reject submissions)
 * Tab 2: Thesis (view student thesis records)
 * Tab 3: Training & Mentoring (evaluate students on 5-point scale)
 * HOD gets an "Auto Review" toggle per tab to auto-approve submissions.
 *
 * @see PG Logbook .md — Rotation Postings, Thesis, Training & Mentoring
 */

"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RotateCcw, BookOpen, HeartHandshake, Loader2 } from "lucide-react";
import {
	RotationReviewClient,
	type RotationSubmission,
} from "./RotationReviewClient";
import {
	ThesisReviewClient,
	type ThesisForReview,
} from "../thesis-review/ThesisReviewClient";
import {
	FacultyTrainingForm,
	type Student,
	type ExistingRecord,
} from "../training-mentoring/FacultyTrainingForm";
import { toggleAutoReview } from "@/actions/auto-review";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface AutoReviewSettings {
	rotationPostings: boolean;
	thesis: boolean;
	trainingMentoring: boolean;
}

interface ReviewTabsClientProps {
	role: "faculty" | "hod";
	submissions: RotationSubmission[];
	theses: ThesisForReview[];
	trainingStudents: Student[];
	trainingRecords: ExistingRecord[];
	autoReviewSettings?: AutoReviewSettings;
}

export function ReviewTabsClient({
	role,
	submissions,
	theses,
	trainingStudents,
	trainingRecords,
	autoReviewSettings,
}: ReviewTabsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("rotations");
	const [settings, setSettings] = useState<AutoReviewSettings>(
		autoReviewSettings ?? {
			rotationPostings: false,
			thesis: false,
			trainingMentoring: false,
		},
	);

	function handleToggle(
		category: "rotationPostings" | "thesis" | "trainingMentoring",
		enabled: boolean,
	) {
		setSettings((prev) => ({ ...prev, [category]: enabled }));
		startTransition(async () => {
			try {
				await toggleAutoReview(category, enabled);
				toast.success(
					`Auto review ${enabled ? "enabled" : "disabled"} for ${
						category === "rotationPostings" ? "Rotation Postings"
						: category === "thesis" ? "Thesis"
						: "Training & Mentoring"
					}`,
				);
				router.refresh();
			} catch {
				setSettings((prev) => ({ ...prev, [category]: !enabled }));
				toast.error("Failed to update auto review setting");
			}
		});
	}

	const autoReviewKey =
		activeTab === "rotations" ? "rotationPostings"
		: activeTab === "thesis" ? "thesis"
		: "trainingMentoring";
	const autoReviewLabel =
		activeTab === "rotations" ? "Rotation Postings"
		: activeTab === "thesis" ? "Thesis"
		: "Training & Mentoring";

	return (
		<Tabs
			defaultValue="rotations"
			className="space-y-4"
			onValueChange={setActiveTab}
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
				<TabsList className="grid w-full sm:w-auto grid-cols-3">
					<TabsTrigger
						value="rotations"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<RotateCcw className="h-4 w-4" />
						<span className="hidden sm:inline">Rotation Postings</span>
						<span className="sm:hidden">Rotations</span>
					</TabsTrigger>
					<TabsTrigger
						value="thesis"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<BookOpen className="h-4 w-4" />
						<span>Thesis</span>
					</TabsTrigger>
					<TabsTrigger
						value="training"
						className="flex items-center gap-2 text-xs sm:text-sm"
					>
						<HeartHandshake className="h-4 w-4" />
						<span className="hidden sm:inline">Training & Mentoring</span>
						<span className="sm:hidden">Training</span>
					</TabsTrigger>
				</TabsList>

				{/* HOD Auto-Review Toggle */}
				{role === "hod" && (
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
						{isPending && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						<Label
							htmlFor="auto-review-toggle"
							className="text-xs font-medium text-muted-foreground cursor-pointer"
						>
							Auto Review ({autoReviewLabel})
						</Label>
						<Switch
							id="auto-review-toggle"
							checked={settings[autoReviewKey]}
							onCheckedChange={(checked) =>
								handleToggle(autoReviewKey, checked)
							}
							disabled={isPending}
						/>
					</div>
				)}
			</div>

			<TabsContent value="rotations">
				<RotationReviewClient submissions={submissions} role={role} />
			</TabsContent>

			<TabsContent value="thesis">
				<ThesisReviewClient theses={theses} role={role} />
			</TabsContent>

			<TabsContent value="training">
				<FacultyTrainingForm
					students={trainingStudents}
					existingRecords={trainingRecords}
				/>
			</TabsContent>
		</Tabs>
	);
}
