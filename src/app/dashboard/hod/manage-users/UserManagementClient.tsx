/**
 * @module UserManagementClient
 * @description Client component for HOD to manage user roles and faculty-student assignments.
 * Displays user list with role badges, role changing, and assignment management.
 *
 * @see copilot-instructions.md — Section 8
 * @see src/actions/user-management.ts
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setUserRole, assignFacultyToStudent } from "@/actions/user-management";
import { toast } from "sonner";
import {
	Search,
	Shield,
	UserCog,
	GraduationCap,
	UserPlus,
	Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string | undefined;
	imageUrl: string;
	role: string;
	createdAt: number;
}

interface UserManagementClientProps {
	users: UserData[];
}

const roleBadgeVariants: Record<string, string> = {
	hod: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
	faculty: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	student: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	none: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const roleIcons: Record<string, React.ReactNode> = {
	hod: <Shield className="h-3.5 w-3.5" />,
	faculty: <UserCog className="h-3.5 w-3.5" />,
	student: <GraduationCap className="h-3.5 w-3.5" />,
};

export function UserManagementClient({ users }: UserManagementClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [searchQuery, setSearchQuery] = useState("");
	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	const [selectedFaculty, setSelectedFaculty] = useState("");
	const [selectedStudent, setSelectedStudent] = useState("");
	const [selectedSemester, setSelectedSemester] = useState("1");

	const filteredUsers = users.filter((u) => {
		const q = searchQuery.toLowerCase();
		return (
			(u.firstName?.toLowerCase() ?? "").includes(q) ||
			(u.lastName?.toLowerCase() ?? "").includes(q) ||
			(u.email?.toLowerCase() ?? "").includes(q) ||
			u.role.toLowerCase().includes(q)
		);
	});

	const facultyUsers = users.filter((u) => u.role === "faculty");
	const studentUsers = users.filter((u) => u.role === "student");

	function handleRoleChange(userId: string, newRole: string) {
		if (newRole === "none") return;
		startTransition(async () => {
			try {
				await setUserRole(userId, newRole as "hod" | "faculty" | "student");
				toast.success("Role updated successfully");
				router.refresh();
			} catch {
				toast.error("Failed to update role");
			}
		});
	}

	function handleAssignFaculty() {
		if (!selectedFaculty || !selectedStudent) {
			toast.error("Select both faculty and student");
			return;
		}
		startTransition(async () => {
			try {
				const result = await assignFacultyToStudent(
					selectedFaculty,
					selectedStudent,
					parseInt(selectedSemester),
				);
				if (result.success) {
					toast.success("Faculty assigned to student");
					setAssignDialogOpen(false);
					setSelectedFaculty("");
					setSelectedStudent("");
				} else {
					toast.error(result.message ?? "Assignment failed");
				}
			} catch {
				toast.error("Failed to assign faculty");
			}
		});
	}

	function handleSearch(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		router.push(
			`/dashboard/hod/manage-users?search=${encodeURIComponent(searchQuery)}`,
		);
	}

	return (
		<div className="space-y-6">
			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Users</CardDescription>
						<CardTitle className="text-2xl">{users.length}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Faculty Members</CardDescription>
						<CardTitle className="text-2xl">{facultyUsers.length}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Students</CardDescription>
						<CardTitle className="text-2xl">{studentUsers.length}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Search + Actions */}
			<div className="flex flex-col sm:flex-row gap-3">
				<form onSubmit={handleSearch} className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, email, or role..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</form>
				<Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<UserPlus className="h-4 w-4 mr-2" />
							Assign Faculty to Student
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Assign Faculty to Student</DialogTitle>
							<DialogDescription>
								Select a faculty member and a student to create a mentoring
								assignment.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Faculty Member</label>
								<Select
									value={selectedFaculty}
									onValueChange={setSelectedFaculty}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select faculty..." />
									</SelectTrigger>
									<SelectContent>
										{facultyUsers.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.firstName} {f.lastName} — {f.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Student</label>
								<Select
									value={selectedStudent}
									onValueChange={setSelectedStudent}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select student..." />
									</SelectTrigger>
									<SelectContent>
										{studentUsers.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.firstName} {s.lastName} — {s.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Semester</label>
								<Select
									value={selectedSemester}
									onValueChange={setSelectedSemester}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select semester..." />
									</SelectTrigger>
									<SelectContent>
										{[1, 2, 3, 4, 5, 6].map((sem) => (
											<SelectItem key={sem} value={sem.toString()}>
												Semester {sem}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<DialogFooter>
							<Button
								onClick={handleAssignFaculty}
								disabled={isPending || !selectedFaculty || !selectedStudent}
							>
								{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								Assign
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Users</CardTitle>
					<CardDescription>
						Manage roles by selecting from the dropdown. Changes apply
						immediately.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Current Role</TableHead>
								<TableHead>Change Role</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredUsers.length === 0 ?
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground py-8"
									>
										No users found
									</TableCell>
								</TableRow>
							:	filteredUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarImage src={user.imageUrl} />
													<AvatarFallback>
														{(user.firstName?.[0] ?? "") +
															(user.lastName?.[0] ?? "")}
													</AvatarFallback>
												</Avatar>
												<span className="font-medium">
													{user.firstName} {user.lastName}
												</span>
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{user.email ?? "—"}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={
													roleBadgeVariants[user.role] ?? roleBadgeVariants.none
												}
											>
												<span className="flex items-center gap-1">
													{roleIcons[user.role]}
													{user.role === "none" ?
														"Unassigned"
													:	user.role.toUpperCase()}
												</span>
											</Badge>
										</TableCell>
										<TableCell>
											<Select
												defaultValue={user.role}
												onValueChange={(val) => handleRoleChange(user.id, val)}
												disabled={isPending}
											>
												<SelectTrigger className="w-[140px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="hod">HOD</SelectItem>
													<SelectItem value="faculty">Faculty</SelectItem>
													<SelectItem value="student">Student</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
									</TableRow>
								))
							}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
