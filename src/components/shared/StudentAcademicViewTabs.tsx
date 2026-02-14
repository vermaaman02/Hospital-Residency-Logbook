/**
 * @module StudentAcademicViewTabs
 * @description Tabbed read-only view of a student's case presentations and
 * seminar discussions. Used on faculty/HOD student detail pages.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText } from "lucide-react";
import {
	StudentCasePresentationView,
	type CasePresentationViewEntry,
} from "@/components/shared/StudentCasePresentationView";
import {
	StudentSeminarDiscussionView,
	type SeminarDiscussionViewEntry,
} from "@/components/shared/StudentSeminarDiscussionView";

interface StudentAcademicViewTabsProps {
	casePresentations: CasePresentationViewEntry[];
	seminarDiscussions: SeminarDiscussionViewEntry[];
	studentName: string;
}

export function StudentAcademicViewTabs({
	casePresentations,
	seminarDiscussions,
	studentName,
}: StudentAcademicViewTabsProps) {
	return (
		<Tabs defaultValue="case-presentations" className="w-full">
			<TabsList className="grid w-full grid-cols-2 max-w-xl mb-6">
				<TabsTrigger
					value="case-presentations"
					className="gap-2 data-[state=active]:bg-hospital-primary data-[state=active]:text-white"
				>
					<BookOpen className="h-4 w-4" />
					Case Presentations
					<span className="ml-1 text-xs text-muted-foreground">
						({casePresentations.length})
					</span>
				</TabsTrigger>
				<TabsTrigger
					value="seminar-discussions"
					className="gap-2 data-[state=active]:bg-hospital-primary data-[state=active]:text-white"
				>
					<FileText className="h-4 w-4" />
					Seminars
					<span className="ml-1 text-xs text-muted-foreground">
						({seminarDiscussions.length})
					</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="case-presentations">
				<StudentCasePresentationView
					entries={casePresentations}
					studentName={studentName}
				/>
			</TabsContent>

			<TabsContent value="seminar-discussions">
				<StudentSeminarDiscussionView
					entries={seminarDiscussions}
					studentName={studentName}
				/>
			</TabsContent>
		</Tabs>
	);
}
