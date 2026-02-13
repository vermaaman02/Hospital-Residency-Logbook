/**
 * @module ManageUsersClient
 * @description Tab-based client component orchestrating user management.
 * Tabs: Users, Batches, Promote Students, Create User.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FolderPlus, GraduationCap, UserPlus } from "lucide-react";
import { UsersTab } from "./tabs/UsersTab";
import { BatchesTab } from "./tabs/BatchesTab";
import { PromoteTab } from "./tabs/PromoteTab";
import { CreateUserTab } from "./tabs/CreateUserTab";

// ======================== TYPES ========================

export interface UserData {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	imageUrl: string;
	role: "hod" | "faculty" | "student";
	status: string;
	bannedUntil: string | null;
	banReason: string | null;
	batch: string | null;
	batchId: string | null;
	batchName: string | null;
	currentSemester: number | null;
	clerkBanned: boolean;
	createdAt: string;
}

export interface BatchFacultyData {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

export interface BatchData {
	id: string;
	name: string;
	currentSemester: number;
	startDate: string;
	endDate: string | null;
	isActive: boolean;
	description: string | null;
	studentCount: number;
	facultyCount: number;
	assignedFaculty: BatchFacultyData[];
	createdAt: string;
}

interface ManageUsersClientProps {
	users: UserData[];
	batches: BatchData[];
}

export function ManageUsersClient({ users, batches }: ManageUsersClientProps) {
	const totalUsers = users.length;
	const students = users.filter((u) => u.role === "student");
	const faculty = users.filter((u) => u.role === "faculty");
	const bannedUsers = users.filter(
		(u) => u.status === "BANNED" || u.status === "TEMPORARILY_BANNED",
	);

	return (
		<div className="space-y-6">
			{/* Stats Row */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<StatCard label="Total Users" value={totalUsers} color="blue" />
				<StatCard label="Students" value={students.length} color="green" />
				<StatCard label="Faculty" value={faculty.length} color="purple" />
				<StatCard label="Banned" value={bannedUsers.length} color="red" />
			</div>

			{/* Tabs */}
			<Tabs defaultValue="users" className="space-y-4">
				<TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
					<TabsTrigger value="users" className="gap-2 text-xs sm:text-sm">
						<Users className="h-4 w-4 hidden sm:block" />
						Users
					</TabsTrigger>
					<TabsTrigger value="batches" className="gap-2 text-xs sm:text-sm">
						<FolderPlus className="h-4 w-4 hidden sm:block" />
						Batches
					</TabsTrigger>
					<TabsTrigger value="promote" className="gap-2 text-xs sm:text-sm">
						<GraduationCap className="h-4 w-4 hidden sm:block" />
						Promote
					</TabsTrigger>
					<TabsTrigger value="create" className="gap-2 text-xs sm:text-sm">
						<UserPlus className="h-4 w-4 hidden sm:block" />
						Create User
					</TabsTrigger>
				</TabsList>

				<TabsContent value="users">
					<UsersTab users={users} batches={batches} />
				</TabsContent>

				<TabsContent value="batches">
					<BatchesTab batches={batches} facultyUsers={faculty} />
				</TabsContent>

				<TabsContent value="promote">
					<PromoteTab students={students} batches={batches} />
				</TabsContent>

				<TabsContent value="create">
					<CreateUserTab batches={batches} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ======================== STAT CARD ========================

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: "blue" | "green" | "purple" | "red";
}) {
	const colorMap = {
		blue: "bg-blue-50 border-blue-200 text-blue-700",
		green: "bg-green-50 border-green-200 text-green-700",
		purple: "bg-purple-50 border-purple-200 text-purple-700",
		red: "bg-red-50 border-red-200 text-red-700",
	};

	return (
		<div className={`rounded-lg border p-4 ${colorMap[color]}`}>
			<p className="text-sm font-medium opacity-80">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
