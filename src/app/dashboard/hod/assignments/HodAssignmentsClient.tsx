/**
 * @module HodAssignmentsClient
 * @description Client component for managing faculty-student assignments.
 */

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	assignFacultyToStudent,
	removeFacultyAssignment,
} from "@/actions/user-management";
import { Plus, Trash2, Search, ClipboardList, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AssignmentData {
	id: string;
	semester: number;
	createdAt: string;
	faculty: { id: string; name: string; email: string };
	student: {
		id: string;
		name: string;
		email: string;
		batch: string | null;
		currentSemester: number | null;
	};
}

interface HodAssignmentsClientProps {
	assignments: AssignmentData[];
	facultyOptions: { id: string; name: string }[];
	studentOptions: {
		id: string;
		name: string;
		currentSemester: number | null;
	}[];
}

export function HodAssignmentsClient({
	assignments,
	facultyOptions,
	studentOptions,
}: HodAssignmentsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [search, setSearch] = useState("");
	const [selectedFaculty, setSelectedFaculty] = useState<string>("");
	const [selectedStudent, setSelectedStudent] = useState<string>("");
	const [selectedSemester, setSelectedSemester] = useState<string>("1");
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const filtered = assignments.filter(
		(a) =>
			a.faculty.name.toLowerCase().includes(search.toLowerCase()) ||
			a.student.name.toLowerCase().includes(search.toLowerCase()),
	);

	function handleCreate() {
		if (!selectedFaculty || !selectedStudent) {
			setMessage({
				type: "error",
				text: "Please select both faculty and student",
			});
			return;
		}
		setMessage(null);
		startTransition(async () => {
			const result = await assignFacultyToStudent(
				selectedFaculty,
				selectedStudent,
				parseInt(selectedSemester),
			);
			if (result.success) {
				setMessage({
					type: "success",
					text: "Assignment created successfully",
				});
				setSelectedFaculty("");
				setSelectedStudent("");
				router.refresh();
			} else {
				setMessage({
					type: "error",
					text: result.message ?? "Failed to create assignment",
				});
			}
		});
	}

	function handleRemove(id: string) {
		startTransition(async () => {
			await removeFacultyAssignment(id);
			setMessage({ type: "success", text: "Assignment removed" });
			router.refresh();
		});
	}

	return (
		<div className="space-y-6">
			{/* Create New Assignment */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Create New Assignment
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-3">
						<Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Select Faculty" />
							</SelectTrigger>
							<SelectContent>
								{facultyOptions.map((f) => (
									<SelectItem key={f.id} value={f.id}>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={selectedStudent} onValueChange={setSelectedStudent}>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Select Student" />
							</SelectTrigger>
							<SelectContent>
								{studentOptions.map((s) => (
									<SelectItem key={s.id} value={s.id}>
										{s.name}{" "}
										{s.currentSemester ? `(Sem ${s.currentSemester})` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={selectedSemester}
							onValueChange={setSelectedSemester}
						>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Semester" />
							</SelectTrigger>
							<SelectContent>
								{[1, 2, 3, 4, 5, 6].map((s) => (
									<SelectItem key={s} value={s.toString()}>
										Sem {s}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button onClick={handleCreate} disabled={isPending}>
							{isPending ?
								<Loader2 className="h-4 w-4 animate-spin" />
							:	<Plus className="h-4 w-4" />}
							<span className="ml-1">Assign</span>
						</Button>
					</div>

					{message && (
						<p
							className={`mt-2 text-sm ${message.type === "success" ? "text-emerald-600" : "text-destructive"}`}
						>
							{message.text}
						</p>
					)}
				</CardContent>
			</Card>

			{/* Current Assignments */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium">
						Current Assignments ({assignments.length})
					</h3>
					<div className="relative max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9 h-8 text-sm"
						/>
					</div>
				</div>

				{filtered.length === 0 ?
					<div className="text-center py-8 text-muted-foreground">
						<ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p>
							{assignments.length === 0 ?
								"No assignments created yet."
							:	"No assignments match your search."}
						</p>
					</div>
				:	<div className="border rounded-lg overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/50">
									<th className="text-left p-3 font-medium">Faculty</th>
									<th className="text-left p-3 font-medium">Student</th>
									<th className="text-center p-3 font-medium">Semester</th>
									<th className="text-left p-3 font-medium hidden sm:table-cell">
										Batch
									</th>
									<th className="text-right p-3 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((a) => (
									<tr
										key={a.id}
										className="border-b hover:bg-muted/30 transition-colors"
									>
										<td className="p-3">
											<p className="font-medium">{a.faculty.name}</p>
											<p className="text-xs text-muted-foreground">
												{a.faculty.email}
											</p>
										</td>
										<td className="p-3">
											<p className="font-medium">{a.student.name}</p>
											<p className="text-xs text-muted-foreground">
												{a.student.email}
											</p>
										</td>
										<td className="p-3 text-center">
											<Badge variant="outline">Sem {a.semester}</Badge>
										</td>
										<td className="p-3 hidden sm:table-cell">
											{a.student.batch ?? "—"}
										</td>
										<td className="p-3 text-right">
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() => handleRemove(a.id)}
												disabled={isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				}
			</div>
		</div>
	);
}
