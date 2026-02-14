/**
 * @module ReviewAcademicTabs
 * @description Client-side tabs wrapping CasePresentationReviewClient and
 * SeminarDiscussionReviewClient for the faculty/HOD review page.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText } from "lucide-react";
import {
	CasePresentationReviewClient,
	type CasePresentationSubmission,
} from "./CasePresentationReviewClient";
import {
	SeminarDiscussionReviewClient,
	type SeminarDiscussionSubmission,
} from "./SeminarDiscussionReviewClient";

interface ReviewAcademicTabsProps {
	casePresentations: CasePresentationSubmission[];
	seminarDiscussions: SeminarDiscussionSubmission[];
	role: "faculty" | "hod";
	autoReviewCasePresentations: boolean;
	autoReviewSeminarDiscussions: boolean;
}

export function ReviewAcademicTabs({
	casePresentations,
	seminarDiscussions,
	role,
	autoReviewCasePresentations,
	autoReviewSeminarDiscussions,
}: ReviewAcademicTabsProps) {
	const cpPending = casePresentations.filter(
		(s) => s.status === "SUBMITTED",
	).length;
	const sdPending = seminarDiscussions.filter(
		(s) => s.status === "SUBMITTED",
	).length;

	return (
		<Tabs defaultValue="case-presentations" className="w-full">
			<TabsList className="grid w-full grid-cols-2 max-w-xl mb-6">
				<TabsTrigger
					value="case-presentations"
					className="gap-2 data-[state=active]:bg-hospital-primary data-[state=active]:text-white"
				>
					<BookOpen className="h-4 w-4" />
					<span className="hidden sm:inline">Case Presentations</span>
					<span className="sm:hidden">Case Pres.</span>
					{cpPending > 0 && (
						<span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
							{cpPending}
						</span>
					)}
				</TabsTrigger>
				<TabsTrigger
					value="seminar-discussions"
					className="gap-2 data-[state=active]:bg-hospital-primary data-[state=active]:text-white"
				>
					<FileText className="h-4 w-4" />
					<span className="hidden sm:inline">Seminars</span>
					<span className="sm:hidden">Seminars</span>
					{sdPending > 0 && (
						<span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
							{sdPending}
						</span>
					)}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="case-presentations">
				<CasePresentationReviewClient
					submissions={casePresentations}
					role={role}
					autoReviewEnabled={autoReviewCasePresentations}
				/>
			</TabsContent>

			<TabsContent value="seminar-discussions">
				<SeminarDiscussionReviewClient
					submissions={seminarDiscussions}
					role={role}
					autoReviewEnabled={autoReviewSeminarDiscussions}
				/>
			</TabsContent>
		</Tabs>
	);
}
