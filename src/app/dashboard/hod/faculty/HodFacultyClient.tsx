/**
 * @module HodFacultyClient
 * @description Client component for HOD to view faculty members and their workload.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, GraduationCap, Users, FileCheck } from "lucide-react";

interface FacultyData {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	profileImage: string | null;
	joinedAt: string;
	studentCount: number;
	signatureCount: number;
	students: {
		name: string;
		semester: number;
		batch: string | null;
	}[];
}

interface HodFacultyClientProps {
	faculty: FacultyData[];
}

export function HodFacultyClient({ faculty }: HodFacultyClientProps) {
	const [search, setSearch] = useState("");

	const filtered = faculty.filter(
		(f) =>
			f.firstName.toLowerCase().includes(search.toLowerCase()) ||
			f.lastName.toLowerCase().includes(search.toLowerCase()) ||
			f.email.toLowerCase().includes(search.toLowerCase()),
	);

	if (faculty.length === 0) {
		return (
			<div className="text-center py-16 text-muted-foreground">
				<GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
				<h3 className="text-lg font-medium mb-2">No Faculty Found</h3>
				<p className="text-sm">
					No faculty members have been registered. Use Manage Users to assign
					the Faculty role.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search faculty..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			<p className="text-sm text-muted-foreground">
				{filtered.length} faculty member{filtered.length !== 1 ? "s" : ""}
			</p>

			{/* Faculty Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{filtered.map((member) => (
					<Card key={member.id} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">
								{member.firstName} {member.lastName}
							</CardTitle>
							<p className="text-xs text-muted-foreground">{member.email}</p>
						</CardHeader>
						<CardContent className="space-y-3">
							{/* Stats */}
							<div className="flex gap-4">
								<div className="flex items-center gap-1.5 text-sm">
									<Users className="h-4 w-4 text-blue-500" />
									<span>
										{member.studentCount} student
										{member.studentCount !== 1 ? "s" : ""}
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-sm">
									<FileCheck className="h-4 w-4 text-green-500" />
									<span>{member.signatureCount} signed</span>
								</div>
							</div>

							{/* Assigned Students */}
							{member.students.length > 0 ?
								<div>
									<p className="text-xs font-medium text-muted-foreground mb-1.5">
										Assigned Students
									</p>
									<div className="flex flex-wrap gap-1.5">
										{member.students.map((s, i) => (
											<Badge
												key={i}
												variant="secondary"
												className="text-xs font-normal"
											>
												{s.name} (Sem {s.semester})
											</Badge>
										))}
									</div>
								</div>
							:	<p className="text-xs text-muted-foreground italic">
									No students assigned
								</p>
							}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
