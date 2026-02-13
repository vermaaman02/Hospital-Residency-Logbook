/**
 * @module RotationPostingsClient
 * @description Client-side orchestrator with 3 tabs:
 * 1. Rotation Postings (form + notebook display)
 * 2. Thesis Topic (topic, guide, semester records)
 * 3. Training & Mentoring Record (5-domain radar chart)
 *
 * @see PG Logbook .md — LOG OF ROTATION POSTINGS, Thesis, Training & Mentoring
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotationPostingsTab } from "./tabs/RotationPostingsTab";
import { ThesisTopicTab } from "./tabs/ThesisTopicTab";
import { TrainingMentoringTab } from "./tabs/TrainingMentoringTab";
import { RotateCcw, GraduationCap, Target } from "lucide-react";

// ======================== TYPE DEFINITIONS ========================

export interface RotationPostingData {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: string | null;
	endDate: string | null;
	totalDuration: string | null;
	durationDays: number | null;
	facultyId: string | null;
	status: string;
	facultyRemark: string | null;
	createdAt: string;
}

export interface ThesisSemesterRecordData {
	id: string;
	thesisId: string;
	semester: number;
	srJrMember: string | null;
	srMember: string | null;
	facultyMember: string | null;
}

export interface ThesisData {
	id: string;
	userId: string;
	topic: string | null;
	chiefGuide: string | null;
	semesterRecords: ThesisSemesterRecordData[];
}

export interface TrainingRecordData {
	id: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	evaluatedById: string | null;
	remarks: string | null;
	status: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

interface RotationPostingsClientProps {
	postings: RotationPostingData[];
	thesis: ThesisData;
	trainingRecords: TrainingRecordData[];
	facultyList: FacultyOption[];
	defaultTab?: string;
}

const TAB_MAP: Record<string, string> = {
	thesis: "thesis",
	training: "training",
};

export function RotationPostingsClient({
	postings,
	thesis,
	trainingRecords,
	facultyList,
	defaultTab,
}: RotationPostingsClientProps) {
	const resolvedTab =
		(defaultTab && TAB_MAP[defaultTab]) || "rotation-postings";

	return (
		<Tabs defaultValue={resolvedTab} className="w-full">
			<TabsList className="grid w-full grid-cols-3 h-auto">
				<TabsTrigger
					value="rotation-postings"
					className="flex items-center gap-2 py-2.5 text-xs sm:text-sm"
				>
					<RotateCcw className="h-4 w-4 shrink-0" />
					<span className="hidden sm:inline">Rotation Postings</span>
					<span className="sm:hidden">Rotations</span>
				</TabsTrigger>
				<TabsTrigger
					value="thesis"
					className="flex items-center gap-2 py-2.5 text-xs sm:text-sm"
				>
					<GraduationCap className="h-4 w-4 shrink-0" />
					<span className="hidden sm:inline">Thesis Topic</span>
					<span className="sm:hidden">Thesis</span>
				</TabsTrigger>
				<TabsTrigger
					value="training"
					className="flex items-center gap-2 py-2.5 text-xs sm:text-sm"
				>
					<Target className="h-4 w-4 shrink-0" />
					<span className="hidden sm:inline">Training & Mentoring</span>
					<span className="sm:hidden">Training</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="rotation-postings" className="mt-6">
				<RotationPostingsTab postings={postings} facultyList={facultyList} />
			</TabsContent>

			<TabsContent value="thesis" className="mt-6">
				<ThesisTopicTab thesis={thesis} facultyList={facultyList} />
			</TabsContent>

			<TabsContent value="training" className="mt-6">
				<TrainingMentoringTab records={trainingRecords} />
			</TabsContent>
		</Tabs>
	);
}
