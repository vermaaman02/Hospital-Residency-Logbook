/**
 * @module StudentProfilePage
 * @description Student profile page showing personal metadata,
 * current semester, batch, rotation status, and logbook completion overview.
 *
 * @see roadmap.md — Phase 2: Student profile page with metadata
 */

import { requireAuth, getCurrentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { currentUser } from "@clerk/nextjs/server";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	User,
	Mail,
	Calendar,
	BookOpen,
	FileCheck,
	ClipboardList,
	Stethoscope,
} from "lucide-react";

export default async function StudentProfilePage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const user = await currentUser();
	if (!user) redirect("/sign-in");

	// Fetch counts for profile overview
	const [rotationCount, caseCount, procedureCount, attendanceCount, thesis] =
		await Promise.all([
			prisma.rotationPosting.count({ where: { userId } }),
			prisma.caseManagementLog.count({ where: { userId } }),
			prisma.procedureLog.count({ where: { userId } }),
			prisma.attendanceSheet.count({ where: { userId } }),
			prisma.thesis.findUnique({
				where: { userId },
				select: { topic: true, chiefGuide: true },
			}),
		]);

	const signedRotations = await prisma.rotationPosting.count({
		where: { userId, status: "SIGNED" },
	});
	const signedCases = await prisma.caseManagementLog.count({
		where: { userId, status: "SIGNED" },
	});

	const role = await getCurrentRole();

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Profile"
				description="Your residency profile and logbook completion overview"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Profile" },
				]}
			/>

			{/* Personal Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Personal Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">Full Name</label>
							<p className="font-medium">
								{user.firstName} {user.lastName}
							</p>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground flex items-center gap-1">
								<Mail className="h-3 w-3" />
								Email
							</label>
							<p className="font-medium">
								{
									user.emailAddresses.find(
										(e) => e.id === user.primaryEmailAddressId,
									)?.emailAddress
								}
							</p>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">Role</label>
							<Badge variant="outline" className="capitalize">
								{role ?? "Unassigned"}
							</Badge>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								Joined
							</label>
							<p className="font-medium">
								{new Date(user.createdAt).toLocaleDateString("en-IN", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</p>
						</div>
						{thesis?.topic && (
							<div className="space-y-1 sm:col-span-2">
								<label className="text-xs text-muted-foreground flex items-center gap-1">
									<BookOpen className="h-3 w-3" />
									Thesis Topic
								</label>
								<p className="font-medium">{thesis.topic}</p>
							</div>
						)}
						{thesis?.chiefGuide && (
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									Chief Guide
								</label>
								<p className="font-medium">{thesis.chiefGuide}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Logbook Overview */}
			<Card>
				<CardHeader>
					<CardTitle>Logbook Completion Overview</CardTitle>
					<CardDescription>
						Summary of your logged entries across all modules
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="border rounded-lg p-4 space-y-1">
							<div className="flex items-center gap-2 text-muted-foreground">
								<ClipboardList className="h-4 w-4" />
								<span className="text-sm">Rotation Postings</span>
							</div>
							<p className="text-2xl font-bold">{rotationCount}</p>
							<p className="text-xs text-muted-foreground">
								{signedRotations} signed of 20 total
							</p>
						</div>
						<div className="border rounded-lg p-4 space-y-1">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Stethoscope className="h-4 w-4" />
								<span className="text-sm">Case Logs</span>
							</div>
							<p className="text-2xl font-bold">{caseCount}</p>
							<p className="text-xs text-muted-foreground">
								{signedCases} signed
							</p>
						</div>
						<div className="border rounded-lg p-4 space-y-1">
							<div className="flex items-center gap-2 text-muted-foreground">
								<FileCheck className="h-4 w-4" />
								<span className="text-sm">Procedures</span>
							</div>
							<p className="text-2xl font-bold">{procedureCount}</p>
						</div>
						<div className="border rounded-lg p-4 space-y-1">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Calendar className="h-4 w-4" />
								<span className="text-sm">Attendance Weeks</span>
							</div>
							<p className="text-2xl font-bold">{attendanceCount}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
