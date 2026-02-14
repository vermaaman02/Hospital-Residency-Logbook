/**
 * @module CreateUserTab
 * @description Form for HOD to create new student/faculty accounts via Clerk.
 * Generates a Clerk account with email+password and syncs to local DB.
 *
 * @see copilot-instructions.md — Section 8, Clerk Authentication
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { createUser } from "@/actions/user-management";
import { toast } from "sonner";
import {
	UserPlus,
	Loader2,
	Eye,
	EyeOff,
	CheckCircle2,
	Copy,
	GraduationCap,
	Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { BatchData } from "../ManageUsersClient";

interface CreateUserTabProps {
	batches: BatchData[];
}

interface CreatedUser {
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	batchName?: string;
}

export function CreateUserTab({ batches }: CreateUserTabProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [showPassword, setShowPassword] = useState(false);

	// Form fields
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<"student" | "faculty">("student");
	const [batchId, setBatchId] = useState<string>("");

	// Results
	const [recentlyCreated, setRecentlyCreated] = useState<CreatedUser[]>([]);

	const activeBatches = batches.filter((b) => b.isActive);

	function generatePassword() {
		const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
		let pwd = "";
		for (let i = 0; i < 12; i++) {
			pwd += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		setPassword(pwd);
	}

	function resetForm() {
		setFirstName("");
		setLastName("");
		setEmail("");
		setPassword("");
		setRole("student");
		setBatchId("");
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}

		startTransition(async () => {
			try {
				const result = await createUser({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					email: email.trim().toLowerCase(),
					password,
					role,
					batchId: role === "student" && batchId ? batchId : undefined,
				});

				if (result.success) {
					const selectedBatch = batches.find((b) => b.id === batchId);
					toast.success(
						`User "${firstName} ${lastName}" created successfully!`,
					);
					setRecentlyCreated((prev) => [
						{
							firstName,
							lastName,
							email: email.trim().toLowerCase(),
							role,
							batchName: selectedBatch?.name,
						},
						...prev,
					]);
					resetForm();
					router.refresh();
				} else {
					toast.error(result.message ?? "Failed to create user");
				}
			} catch {
				toast.error("Failed to create user");
			}
		});
	}

	function copyCredentials(user: CreatedUser) {
		const text = `Email: ${user.email}\nRole: ${user.role}`;
		navigator.clipboard.writeText(text);
		toast.success("Credentials copied to clipboard");
	}

	return (
		<div className="grid lg:grid-cols-3 gap-6">
			{/* Create Form */}
			<div className="lg:col-span-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<UserPlus className="h-5 w-5" />
							Create New User
						</CardTitle>
						<CardDescription>
							Create a new student or faculty account. A Clerk account will be
							generated with the provided credentials.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-5">
							{/* Name Row */}
							<div className="grid sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="firstName">
										First Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="firstName"
										placeholder="Rahul"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										disabled={isPending}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lastName">
										Last Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="lastName"
										placeholder="Kumar"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										disabled={isPending}
									/>
								</div>
							</div>

							{/* Email */}
							<div className="space-y-2">
								<Label htmlFor="email">
									Email <span className="text-red-500">*</span>
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="rahul.kumar@aiims.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={isPending}
								/>
							</div>

							{/* Password */}
							<div className="space-y-2">
								<Label htmlFor="password">
									Password <span className="text-red-500">*</span>
								</Label>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<Input
											id="password"
											type={showPassword ? "text" : "password"}
											placeholder="Minimum 8 characters"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											disabled={isPending}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										>
											{showPassword ?
												<EyeOff className="h-4 w-4" />
											:	<Eye className="h-4 w-4" />}
										</button>
									</div>
									<Button
										type="button"
										variant="outline"
										onClick={generatePassword}
										disabled={isPending}
									>
										Generate
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Must be at least 8 characters. Share the password securely
									with the user.
								</p>
							</div>

							{/* Role */}
							<div className="space-y-2">
								<Label>
									Role <span className="text-red-500">*</span>
								</Label>
								<div className="grid grid-cols-2 gap-3">
									<button
										type="button"
										disabled={isPending}
										onClick={() => setRole("student")}
										className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
											role === "student" ?
												"border-blue-500 bg-blue-50 ring-1 ring-blue-500"
											:	"border-border hover:bg-muted/50"
										}`}
									>
										<GraduationCap
											className={`h-5 w-5 ${role === "student" ? "text-blue-600" : "text-muted-foreground"}`}
										/>
										<div className="text-left">
											<p className="font-medium text-sm">Student</p>
											<p className="text-xs text-muted-foreground">
												PG Resident
											</p>
										</div>
									</button>
									<button
										type="button"
										disabled={isPending}
										onClick={() => {
											setRole("faculty");
											setBatchId("");
										}}
										className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
											role === "faculty" ?
												"border-teal-500 bg-teal-50 ring-1 ring-teal-500"
											:	"border-border hover:bg-muted/50"
										}`}
									>
										<Stethoscope
											className={`h-5 w-5 ${role === "faculty" ? "text-teal-600" : "text-muted-foreground"}`}
										/>
										<div className="text-left">
											<p className="font-medium text-sm">Faculty</p>
											<p className="text-xs text-muted-foreground">
												Supervising Doctor
											</p>
										</div>
									</button>
								</div>
							</div>

							{/* Batch (only for student) */}
							{role === "student" && (
								<div className="space-y-2">
									<Label>Batch (optional)</Label>
									<Select value={batchId} onValueChange={setBatchId}>
										<SelectTrigger>
											<SelectValue placeholder="Select a batch" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No Batch</SelectItem>
											{activeBatches.map((b) => (
												<SelectItem key={b.id} value={b.id}>
													{b.name} — Semester {b.currentSemester}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										Student will inherit the batch&apos;s current semester.
									</p>
								</div>
							)}

							{/* Submit */}
							<Button
								type="submit"
								disabled={isPending}
								className="w-full gap-2"
							>
								{isPending ?
									<Loader2 className="h-4 w-4 animate-spin" />
								:	<UserPlus className="h-4 w-4" />}
								Create User
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>

			{/* Recently Created */}
			<div>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recently Created</CardTitle>
						<CardDescription>Users created in this session.</CardDescription>
					</CardHeader>
					<CardContent>
						{recentlyCreated.length === 0 ?
							<p className="text-sm text-muted-foreground text-center py-8">
								No users created yet in this session.
							</p>
						:	<div className="space-y-3">
								{recentlyCreated.map((user, i) => (
									<div
										key={`${user.email}-${i}`}
										className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
									>
										<CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="font-medium text-sm truncate">
												{user.firstName} {user.lastName}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{user.email}
											</p>
											<div className="flex items-center gap-2 mt-1">
												<Badge variant="secondary" className="text-xs">
													{user.role}
												</Badge>
												{user.batchName && (
													<Badge variant="outline" className="text-xs">
														{user.batchName}
													</Badge>
												)}
											</div>
										</div>
										<button
											onClick={() => copyCredentials(user)}
											className="text-muted-foreground hover:text-foreground"
											title="Copy credentials"
										>
											<Copy className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
