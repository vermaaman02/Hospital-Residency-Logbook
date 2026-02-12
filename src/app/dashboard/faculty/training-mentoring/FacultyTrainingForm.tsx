/**
 * @module FacultyTrainingForm
 * @description Faculty evaluates assigned students using 5-point scale for each semester.
 */

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Star } from "lucide-react";
import { upsertTrainingRecord } from "@/actions/training-mentoring";
import { useRouter } from "next/navigation";

interface Student {
	id: string;
	clerkId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
}

interface ExistingRecord {
	id: string;
	userId: string;
	semester: number;
	score: number;
	remarks: string | null;
	status: string;
}

interface FacultyTrainingFormProps {
	students: Student[];
	existingRecords: ExistingRecord[];
}

const SCORE_OPTIONS = [
	{ value: "5", label: "5 — Exceptional" },
	{ value: "4", label: "4 — Exceeds expected standards" },
	{ value: "3", label: "3 — Meets expected standards" },
	{ value: "2", label: "2 — Inconsistent Performance" },
	{ value: "1", label: "1 — Requires remedial training" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6];

export function FacultyTrainingForm({ students, existingRecords }: FacultyTrainingFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedStudent, setSelectedStudent] = useState<string>("");
	const [selectedSemester, setSelectedSemester] = useState<string>("");
	const [score, setScore] = useState<string>("");
	const [remarks, setRemarks] = useState("");

	// Pre-fill if editing existing record
	function handleStudentChange(studentId: string) {
		setSelectedStudent(studentId);
		setSelectedSemester("");
		setScore("");
		setRemarks("");
	}

	function handleSemesterChange(sem: string) {
		setSelectedSemester(sem);
		const existing = existingRecords.find(
			(r) => r.userId === selectedStudent && r.semester === parseInt(sem),
		);
		if (existing) {
			setScore(existing.score.toString());
			setRemarks(existing.remarks ?? "");
		} else {
			setScore("");
			setRemarks("");
		}
	}

	function handleSave() {
		if (!selectedStudent || !selectedSemester || !score) {
			toast.error("Please fill all required fields");
			return;
		}

		startTransition(async () => {
			try {
				await upsertTrainingRecord(selectedStudent, {
					semester: parseInt(selectedSemester),
					score: parseInt(score),
					remarks: remarks || undefined,
				});
				toast.success("Training record saved");
				router.refresh();
			} catch {
				toast.error("Failed to save record");
			}
		});
	}

	if (students.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Star className="h-12 w-12 mx-auto mb-3 opacity-40" />
				<p className="text-lg font-medium">No assigned students</p>
				<p className="text-sm mt-1">
					Ask the HOD to assign students to you from the Manage Users page.
				</p>
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Evaluate Student</CardTitle>
				<CardDescription>
					Select a student and semester, then assign a score (1-5)
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Student</label>
						<Select value={selectedStudent} onValueChange={handleStudentChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select student..." />
							</SelectTrigger>
							<SelectContent>
								{students.map((s) => (
									<SelectItem key={s.id} value={s.id}>
										{s.firstName} {s.lastName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Semester</label>
						<Select
							value={selectedSemester}
							onValueChange={handleSemesterChange}
							disabled={!selectedStudent}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select semester..." />
							</SelectTrigger>
							<SelectContent>
								{SEMESTERS.map((sem) => {
									const existing = existingRecords.find(
										(r) => r.userId === selectedStudent && r.semester === sem,
									);
									return (
										<SelectItem key={sem} value={sem.toString()}>
											Semester {sem}{existing ? ` (Score: ${existing.score})` : ""}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Score (1-5)</label>
						<Select
							value={score}
							onValueChange={setScore}
							disabled={!selectedSemester}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select score..." />
							</SelectTrigger>
							<SelectContent>
								{SCORE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium">Remarks (Optional)</label>
					<Textarea
						placeholder="Add any remarks about the student's performance..."
						value={remarks}
						onChange={(e) => setRemarks(e.target.value)}
						rows={3}
						disabled={!selectedSemester}
					/>
				</div>

				<div className="flex justify-end">
					<Button
						onClick={handleSave}
						disabled={isPending || !selectedStudent || !selectedSemester || !score}
					>
						{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						<Save className="h-4 w-4 mr-2" />
						Save Evaluation
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
