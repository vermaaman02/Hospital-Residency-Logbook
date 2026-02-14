/**
 * @module StudentAcademicTabs
 * @description Client-side tabs wrapping Case Presentations and Seminar/Evidence
 * Based Discussion tables for the student view.
 *
 * @see PG Logbook .md — "ACADEMIC CASE PRESENTATION AND DISCUSSION"
 * @see PG Logbook .md — "SEMINAR/EVIDENCE BASED DISCUSSION PRESENTED"
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	CasePresentationTable,
	type CasePresentationData,
	type FacultyOption,
} from "./CasePresentationTable";
import {
	SeminarDiscussionTable,
	type SeminarDiscussionData,
} from "./SeminarDiscussionTable";
import { BookOpen, FileText } from "lucide-react";

interface StudentAcademicTabsProps {
	casePresentations: CasePresentationData[];
	seminarDiscussions: SeminarDiscussionData[];
	facultyList: FacultyOption[];
}

export function StudentAcademicTabs({
	casePresentations,
	seminarDiscussions,
	facultyList,
}: StudentAcademicTabsProps) {
	return (
		<Tabs defaultValue="case-presentations" className="space-y-4">
			<TabsList className="grid w-full grid-cols-2 max-w-lg">
				<TabsTrigger
					value="case-presentations"
					className="gap-1.5 text-xs sm:text-sm"
				>
					<BookOpen className="h-4 w-4 hidden sm:inline" />
					Case Presentations
					<span className="ml-1 text-muted-foreground">
						({casePresentations.length})
					</span>
				</TabsTrigger>
				<TabsTrigger
					value="seminar-discussions"
					className="gap-1.5 text-xs sm:text-sm"
				>
					<FileText className="h-4 w-4 hidden sm:inline" />
					Seminars
					<span className="ml-1 text-muted-foreground">
						({seminarDiscussions.length})
					</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="case-presentations">
				<CasePresentationTable
					entries={casePresentations}
					facultyList={facultyList}
				/>
			</TabsContent>

			<TabsContent value="seminar-discussions">
				<SeminarDiscussionTable
					entries={seminarDiscussions}
					facultyList={facultyList}
				/>
			</TabsContent>
		</Tabs>
	);
}
