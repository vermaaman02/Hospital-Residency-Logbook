/**
 * @module ProfileClient
 * @description Client component for profile management.
 * Integrates Clerk's UserProfile for account management (photo, password, devices),
 * plus custom logbook-specific information cards. Mobile-first responsive design.
 *
 * @see copilot-instructions.md — Section 8
 */

"use client";

import { useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	User,
	BookOpen,
	GraduationCap,
	Shield,
	Calendar,
	ClipboardList,
	Syringe,
	Activity,
	FileCheck,
	Users,
	Settings,
	ChevronRight,
} from "lucide-react";

interface ProfileData {
	clerkId: string;
	role: string;
	batch: string | null;
	currentSemester: number | null;
	department: string | null;
	status: string;
	joinedAt: string;
	thesisTopic: string | null;
	thesisGuide: string | null;
	thesisStatus: string | null;
	assignedFaculty: { semester: number; name: string }[];
	assignedStudents: { semester: number; name: string }[];
	logbookStats: Record<string, number>;
}

interface ProfileClientProps {
	profileData: ProfileData;
}

type TabId = "overview" | "account";

export function ProfileClient({ profileData }: ProfileClientProps) {
	const [activeTab, setActiveTab] = useState<TabId>("overview");

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Tab switcher */}
			<div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
				<Button
					variant={activeTab === "overview" ? "default" : "ghost"}
					size="sm"
					className="h-9 text-sm"
					onClick={() => setActiveTab("overview")}
				>
					<User className="h-4 w-4 mr-1.5" />
					Overview
				</Button>
				<Button
					variant={activeTab === "account" ? "default" : "ghost"}
					size="sm"
					className="h-9 text-sm"
					onClick={() => setActiveTab("account")}
				>
					<Settings className="h-4 w-4 mr-1.5" />
					Account Settings
				</Button>
			</div>

			{activeTab === "overview" ?
				<OverviewTab
					profileData={profileData}
					onSwitchToAccount={() => setActiveTab("account")}
				/>
			:	<AccountTab />}
		</div>
	);
}

/* ═══════════════════ OVERVIEW TAB ═══════════════════ */

function OverviewTab({
	profileData,
	onSwitchToAccount,
}: {
	profileData: ProfileData;
	onSwitchToAccount: () => void;
}) {
	const isStudent = profileData.role === "Student";
	const isFaculty = profileData.role === "Faculty";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
			{/* Left column — Profile info */}
			<div className="lg:col-span-2 space-y-4">
				{/* Role & Status Card */}
				<Card className="border-0 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Shield className="h-4 w-4 text-hospital-primary" />
							Account Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
							<InfoField label="Role">
								<Badge
									variant="outline"
									className="text-xs font-medium capitalize"
								>
									{profileData.role}
								</Badge>
							</InfoField>
							<InfoField label="Status">
								<Badge
									variant={
										profileData.status === "ACTIVE" ? "default" : "destructive"
									}
									className={
										profileData.status === "ACTIVE" ?
											"bg-emerald-600 text-white text-xs"
										:	"text-xs"
									}
								>
									{profileData.status}
								</Badge>
							</InfoField>
							<InfoField label="Joined">
								<span className="font-medium text-sm">
									{new Date(profileData.joinedAt).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</span>
							</InfoField>
							{profileData.department && (
								<InfoField label="Department">
									<span className="font-medium text-sm">
										{profileData.department}
									</span>
								</InfoField>
							)}
							{isStudent && profileData.batch && (
								<InfoField label="Batch">
									<Badge variant="secondary" className="text-xs">
										{profileData.batch}
									</Badge>
								</InfoField>
							)}
							{isStudent && profileData.currentSemester && (
								<InfoField label="Semester">
									<Badge variant="secondary" className="text-xs">
										Semester {profileData.currentSemester}
									</Badge>
								</InfoField>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Thesis info (student only) */}
				{isStudent && profileData.thesisTopic && (
					<Card className="border-0 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<BookOpen className="h-4 w-4 text-purple-600" />
								Thesis
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<InfoField label="Topic">
									<p className="font-medium text-sm line-clamp-3">
										{profileData.thesisTopic}
									</p>
								</InfoField>
								<div className="flex gap-4">
									{profileData.thesisGuide && (
										<InfoField label="Chief Guide">
											<span className="font-medium text-sm">
												{profileData.thesisGuide}
											</span>
										</InfoField>
									)}
									{profileData.thesisStatus && (
										<InfoField label="Status">
											<Badge variant="outline" className="text-xs capitalize">
												{profileData.thesisStatus}
											</Badge>
										</InfoField>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Faculty assignments (student) / Student assignments (faculty) */}
				{isStudent && profileData.assignedFaculty.length > 0 && (
					<Card className="border-0 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<GraduationCap className="h-4 w-4 text-teal-600" />
								Assigned Faculty
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-1.5">
								{profileData.assignedFaculty.map((f, i) => (
									<div
										key={i}
										className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
									>
										<span className="text-sm font-medium">{f.name}</span>
										<Badge variant="secondary" className="text-[10px] h-5">
											Semester {f.semester}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{isFaculty && profileData.assignedStudents.length > 0 && (
					<Card className="border-0 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<Users className="h-4 w-4 text-blue-600" />
								Assigned Students
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-1.5">
								{profileData.assignedStudents.map((s, i) => (
									<div
										key={i}
										className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
									>
										<span className="text-sm font-medium">{s.name}</span>
										<Badge variant="secondary" className="text-[10px] h-5">
											Semester {s.semester}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Right column — Quick stats & actions */}
			<div className="space-y-4">
				{/* Logbook stats (students) */}
				{isStudent && Object.keys(profileData.logbookStats).length > 0 && (
					<Card className="border-0 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Logbook Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{profileData.logbookStats.caseManagement !== undefined && (
								<LogbookStatRow
									icon={ClipboardList}
									label="Case Logs"
									value={profileData.logbookStats.caseManagement}
									color="text-blue-600"
								/>
							)}
							{profileData.logbookStats.procedures !== undefined && (
								<LogbookStatRow
									icon={Syringe}
									label="Procedures"
									value={profileData.logbookStats.procedures}
									color="text-purple-600"
								/>
							)}
							{profileData.logbookStats.diagnostics !== undefined && (
								<LogbookStatRow
									icon={Activity}
									label="Diagnostics"
									value={profileData.logbookStats.diagnostics}
									color="text-amber-600"
								/>
							)}
							{profileData.logbookStats.attendance !== undefined && (
								<LogbookStatRow
									icon={Calendar}
									label="Attendance"
									value={profileData.logbookStats.attendance}
									color="text-teal-600"
								/>
							)}
						</CardContent>
					</Card>
				)}

				{/* Faculty stats */}
				{isFaculty && Object.keys(profileData.logbookStats).length > 0 && (
					<Card className="border-0 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Activity Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{profileData.logbookStats.signedEntries !== undefined && (
								<LogbookStatRow
									icon={FileCheck}
									label="Entries Signed"
									value={profileData.logbookStats.signedEntries}
									color="text-emerald-600"
								/>
							)}
							{profileData.logbookStats.assignedStudents !== undefined && (
								<LogbookStatRow
									icon={Users}
									label="Students Assigned"
									value={profileData.logbookStats.assignedStudents}
									color="text-blue-600"
								/>
							)}
						</CardContent>
					</Card>
				)}

				{/* Quick action to account settings */}
				<Card className="border-0 shadow-sm">
					<CardContent className="p-4">
						<Button
							variant="outline"
							className="w-full justify-between h-11"
							onClick={onSwitchToAccount}
						>
							<span className="flex items-center gap-2">
								<Settings className="h-4 w-4" />
								Account Settings
							</span>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<p className="text-[11px] text-muted-foreground mt-2 px-1">
							Change profile photo, update password, manage connected devices
							and active sessions.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/* ═══════════════════ ACCOUNT TAB (Clerk UserProfile) ═══════════════════ */

function AccountTab() {
	return (
		<div className="clerk-profile-wrapper">
			<UserProfile
				routing="hash"
				appearance={{
					elements: {
						rootBox: "w-full",
						cardBox: "w-full shadow-none border-0",
						card: "shadow-none border-0 rounded-xl",
						navbar: "hidden lg:block",
						navbarMobileMenuRow: "border-b",
						pageScrollBox: "p-0 sm:p-2",
						profileSection: "border-0",
						profileSectionPrimaryButton: "text-hospital-primary",
					},
				}}
			/>
		</div>
	);
}

/* ═══════════════════ HELPER COMPONENTS ═══════════════════ */

function InfoField({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
				{label}
			</span>
			<div>{children}</div>
		</div>
	);
}

function LogbookStatRow({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="flex items-center justify-between py-1.5">
			<div className="flex items-center gap-2">
				<Icon className={`h-4 w-4 ${color}`} />
				<span className="text-sm text-muted-foreground">{label}</span>
			</div>
			<span className="text-sm font-bold">{value}</span>
		</div>
	);
}
