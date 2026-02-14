/**
 * @module Sidebar
 * @description Main navigation sidebar for the dashboard.
 * Role-aware: shows different menu items for Student, Faculty, and HOD.
 * Collapses to bottom tabs on mobile (handled by MobileNav).
 *
 * @see copilot-instructions.md — Section 6
 * @see roadmap.md — Section 11
 */

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { INSTITUTION_NAME } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	LayoutDashboard,
	RotateCcw,
	GraduationCap,
	CalendarDays,
	BookOpen,
	Stethoscope,
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	Truck,
	Award,
	Globe,
	FlaskConical,
	ShieldAlert,
	Star,
	Users,
	UserCog,
	FileText,
	ChevronLeft,
	ChevronRight,
	UserCircle,
	HeartHandshake,
	BarChart3,
	HelpCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
	getPendingReviewCounts,
	type PendingCounts,
} from "@/actions/review-counts";

interface NavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
	roles: ("student" | "faculty" | "hod")[];
	badgeKey?: keyof PendingCounts;
}

interface NavSection {
	title: string;
	items: NavItem[];
}

const studentNavSections: NavSection[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/student",
				icon: <LayoutDashboard className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
	{
		title: "Administrative",
		items: [
			{
				title: "Rotation Postings",
				href: "/dashboard/student/rotation-postings",
				icon: <RotateCcw className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Attendance",
				href: "/dashboard/student/attendance",
				icon: <CalendarDays className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "My Profile",
				href: "/dashboard/student/profile",
				icon: <UserCircle className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
	{
		title: "Academic",
		items: [
			{
				title: "Case Presentations & Seminars",
				href: "/dashboard/student/case-presentations",
				icon: <BookOpen className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Journal Clubs",
				href: "/dashboard/student/journal-clubs",
				icon: <FlaskConical className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
	{
		title: "Clinical",
		items: [
			{
				title: "Clinical Skills",
				href: "/dashboard/student/clinical-skills",
				icon: <Stethoscope className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Case Management",
				href: "/dashboard/student/case-management",
				icon: <ClipboardList className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Procedures",
				href: "/dashboard/student/procedures",
				icon: <Syringe className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Diagnostics",
				href: "/dashboard/student/diagnostics",
				icon: <Activity className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Imaging",
				href: "/dashboard/student/imaging",
				icon: <Scan className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
	{
		title: "Other Logs",
		items: [
			{
				title: "Transport",
				href: "/dashboard/student/transport",
				icon: <Truck className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Consent & Bad News",
				href: "/dashboard/student/consent-bad-news",
				icon: <FileText className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
	{
		title: "Professional",
		items: [
			{
				title: "Courses & Conferences",
				href: "/dashboard/student/courses-conferences",
				icon: <Award className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Research",
				href: "/dashboard/student/research",
				icon: <Globe className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Disaster & QI",
				href: "/dashboard/student/disaster-qi",
				icon: <ShieldAlert className="h-4 w-4" />,
				roles: ["student"],
			},
			{
				title: "Evaluations",
				href: "/dashboard/student/evaluations",
				icon: <Star className="h-4 w-4" />,
				roles: ["student"],
			},
		],
	},
];

const facultyNavSections: NavSection[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/faculty",
				icon: <LayoutDashboard className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "My Students",
				href: "/dashboard/faculty/students",
				icon: <Users className="h-4 w-4" />,
				roles: ["faculty"],
			},
		],
	},
	{
		title: "Administrative",
		items: [
			{
				title: "Rotation Postings",
				href: "/dashboard/faculty/rotation-postings",
				icon: <RotateCcw className="h-4 w-4" />,
				roles: ["faculty"],
				badgeKey: "rotationPostings",
			},
		],
	},
	{
		title: "Academic",
		items: [
			{
				title: "Case Presentations & Seminars",
				href: "/dashboard/faculty/case-presentations",
				icon: <BookOpen className="h-4 w-4" />,
				roles: ["faculty"],
				badgeKey: "casePresentations",
			},
			{
				title: "Journal Clubs",
				href: "/dashboard/faculty/journal-clubs",
				icon: <FlaskConical className="h-4 w-4" />,
				roles: ["faculty"],
				badgeKey: "journalClubs",
			},
		],
	},
	{
		title: "Clinical",
		items: [
			{
				title: "Clinical Skills",
				href: "/dashboard/faculty/reviews?category=clinical&tab=clinicalSkills",
				icon: <Stethoscope className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Case Management",
				href: "/dashboard/faculty/reviews?category=clinical&tab=caseManagement",
				icon: <ClipboardList className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Procedures",
				href: "/dashboard/faculty/reviews?category=clinical&tab=procedureLogs",
				icon: <Syringe className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Diagnostics",
				href: "/dashboard/faculty/reviews?category=clinical&tab=diagnosticSkills",
				icon: <Activity className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Imaging",
				href: "/dashboard/faculty/reviews?category=clinical&tab=imagingLogs",
				icon: <Scan className="h-4 w-4" />,
				roles: ["faculty"],
			},
		],
	},
	{
		title: "Other Logs",
		items: [
			{
				title: "Transport",
				href: "/dashboard/faculty/reviews?category=other&tab=transportLogs",
				icon: <Truck className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Consent & Bad News",
				href: "/dashboard/faculty/reviews?category=other&tab=consentLogs",
				icon: <FileText className="h-4 w-4" />,
				roles: ["faculty"],
			},
		],
	},
	{
		title: "Professional",
		items: [
			{
				title: "Courses & Conferences",
				href: "/dashboard/faculty/reviews?category=professional&tab=courses",
				icon: <Award className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Research",
				href: "/dashboard/faculty/reviews?category=professional&tab=research",
				icon: <Globe className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Disaster & QI",
				href: "/dashboard/faculty/reviews?category=other&tab=disasterDrills",
				icon: <ShieldAlert className="h-4 w-4" />,
				roles: ["faculty"],
			},
		],
	},
	{
		title: "Evaluate",
		items: [
			{
				title: "Training & Mentoring",
				href: "/dashboard/faculty/training-mentoring",
				icon: <HeartHandshake className="h-4 w-4" />,
				roles: ["faculty"],
			},
			{
				title: "Evaluations",
				href: "/dashboard/faculty/evaluations",
				icon: <Star className="h-4 w-4" />,
				roles: ["faculty"],
			},
		],
	},
];

const hodNavSections: NavSection[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/hod",
				icon: <LayoutDashboard className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "All Students",
				href: "/dashboard/hod/students",
				icon: <Users className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Faculty",
				href: "/dashboard/hod/faculty",
				icon: <GraduationCap className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Management",
		items: [
			{
				title: "Manage Users",
				href: "/dashboard/hod/manage-users",
				icon: <UserCog className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Assignments",
				href: "/dashboard/hod/assignments",
				icon: <ClipboardList className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Analytics",
				href: "/dashboard/hod/analytics",
				icon: <BarChart3 className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Administrative",
		items: [
			{
				title: "Rotation Postings",
				href: "/dashboard/hod/rotation-postings",
				icon: <RotateCcw className="h-4 w-4" />,
				roles: ["hod"],
				badgeKey: "rotationPostings",
			},
			{
				title: "Attendance",
				href: "/dashboard/faculty/reviews?category=administrative&tab=attendance",
				icon: <CalendarDays className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Academic",
		items: [
			{
				title: "Case Presentations & Seminars",
				href: "/dashboard/hod/case-presentations",
				icon: <BookOpen className="h-4 w-4" />,
				roles: ["hod"],
				badgeKey: "casePresentations",
			},
			{
				title: "Journal Clubs",
				href: "/dashboard/hod/journal-clubs",
				icon: <FlaskConical className="h-4 w-4" />,
				roles: ["hod"],
				badgeKey: "journalClubs",
			},
		],
	},
	{
		title: "Clinical",
		items: [
			{
				title: "Clinical Skills",
				href: "/dashboard/faculty/reviews?category=clinical&tab=clinicalSkills",
				icon: <Stethoscope className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Case Management",
				href: "/dashboard/faculty/reviews?category=clinical&tab=caseManagement",
				icon: <ClipboardList className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Procedures",
				href: "/dashboard/faculty/reviews?category=clinical&tab=procedureLogs",
				icon: <Syringe className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Diagnostics",
				href: "/dashboard/faculty/reviews?category=clinical&tab=diagnosticSkills",
				icon: <Activity className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Imaging",
				href: "/dashboard/faculty/reviews?category=clinical&tab=imagingLogs",
				icon: <Scan className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Other Logs",
		items: [
			{
				title: "Transport",
				href: "/dashboard/faculty/reviews?category=other&tab=transportLogs",
				icon: <Truck className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Consent & Bad News",
				href: "/dashboard/faculty/reviews?category=other&tab=consentLogs",
				icon: <FileText className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Professional",
		items: [
			{
				title: "Courses & Conferences",
				href: "/dashboard/faculty/reviews?category=professional&tab=courses",
				icon: <Award className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Research",
				href: "/dashboard/faculty/reviews?category=professional&tab=research",
				icon: <Globe className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Disaster & QI",
				href: "/dashboard/faculty/reviews?category=other&tab=disasterDrills",
				icon: <ShieldAlert className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Evaluate",
		items: [
			{
				title: "Training & Mentoring",
				href: "/dashboard/faculty/training-mentoring",
				icon: <HeartHandshake className="h-4 w-4" />,
				roles: ["hod"],
			},
			{
				title: "Evaluations",
				href: "/dashboard/hod/evaluations",
				icon: <Star className="h-4 w-4" />,
				roles: ["hod"],
			},
		],
	},
	{
		title: "Support",
		items: [
			{
				title: "Help & Guide",
				href: "/dashboard/help",
				icon: <HelpCircle className="h-4 w-4" />,
				roles: ["student", "faculty", "hod"],
			},
		],
	},
];

interface SidebarProps {
	className?: string;
}

export function Sidebar({ className }: SidebarProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { role } = useRole();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(
		null,
	);

	// Fetch pending counts for faculty/hod
	useEffect(() => {
		if (role === "faculty" || role === "hod") {
			getPendingReviewCounts()
				.then(setPendingCounts)
				.catch(() => {
					/* silently ignore */
				});
		}
	}, [role]);

	const navSections =
		role === "hod" ? hodNavSections
		: role === "faculty" ? facultyNavSections
		: studentNavSections;

	/** Determine if a sidebar link is currently active */
	function isLinkActive(href: string): boolean {
		const qIdx = href.indexOf("?");
		const hrefPath = qIdx >= 0 ? href.slice(0, qIdx) : href;
		const hrefQuery = qIdx >= 0 ? href.slice(qIdx + 1) : "";

		const dashboardRoots = [
			"/dashboard/student",
			"/dashboard/faculty",
			"/dashboard/hod",
		];
		if (dashboardRoots.includes(hrefPath)) {
			return pathname === hrefPath;
		}

		const pathMatch =
			pathname === hrefPath || pathname.startsWith(hrefPath + "/");
		if (!pathMatch) return false;

		if (!hrefQuery) return true;

		// Check query params match
		const params = new URLSearchParams(hrefQuery);
		for (const [key, value] of params.entries()) {
			if (searchParams.get(key) !== value) return false;
		}
		return true;
	}

	return (
		<TooltipProvider delayDuration={0}>
			<aside
				className={cn(
					"hidden lg:flex flex-col h-full min-h-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
					isCollapsed ? "w-16" : "w-64",
					className,
				)}
			>
				{/* Header */}
				<div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
					{isCollapsed ?
						<Image
							src="/AIIMS%20patna%20icon.jpeg"
							alt="AIIMS Patna"
							width={36}
							height={36}
							className="h-9 w-9 rounded-lg object-contain"
						/>
					:	<Image
							src="/AIIMS%20patana%20logo.png"
							alt="AIIMS Patna - PG Logbook"
							width={190}
							height={44}
							className="h-10 w-auto object-contain"
							priority
						/>
					}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
					>
						{isCollapsed ?
							<ChevronRight className="h-4 w-4" />
						:	<ChevronLeft className="h-4 w-4" />}
					</button>
				</div>

				{/* Navigation */}
				<ScrollArea className="flex-1 min-h-0 py-2">
					<nav className="space-y-4 px-2">
						{navSections.map((section) => (
							<div key={section.title}>
								{!isCollapsed && (
									<h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										{section.title}
									</h4>
								)}
								<div className="space-y-0.5">
									{section.items.map((item) => {
										const isActive = isLinkActive(item.href);

										const badgeCount =
											item.badgeKey && pendingCounts ?
												pendingCounts[item.badgeKey]
											:	0;

										const linkContent = (
											<Link
												key={item.href}
												href={item.href}
												className={cn(
													"flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
													isActive ?
														"bg-blue-600 text-white shadow-sm"
													:	"text-gray-600 hover:bg-gray-100 hover:text-gray-900",
													isCollapsed && "justify-center px-0",
												)}
											>
												<span className="relative">
													{item.icon}
													{isCollapsed &&
														typeof badgeCount === "number" &&
														badgeCount > 0 && (
															<span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
																{badgeCount > 9 ? "9+" : badgeCount}
															</span>
														)}
												</span>
												{!isCollapsed && (
													<>
														<span className="flex-1">{item.title}</span>
														{typeof badgeCount === "number" &&
															badgeCount > 0 && (
																<Badge
																	variant="destructive"
																	className="h-5 min-w-5 px-1 text-[10px] font-bold"
																>
																	{badgeCount}
																</Badge>
															)}
													</>
												)}
											</Link>
										);

										if (isCollapsed) {
											return (
												<Tooltip key={item.href}>
													<TooltipTrigger asChild>{linkContent}</TooltipTrigger>
													<TooltipContent side="right">
														{item.title}
													</TooltipContent>
												</Tooltip>
											);
										}

										return linkContent;
									})}
								</div>
							</div>
						))}
					</nav>
				</ScrollArea>

				{/* Footer */}
				{!isCollapsed && (
					<div className="border-t border-gray-100 px-4 py-3">
						<p className="text-[9px] text-gray-400 text-center leading-tight">
							{INSTITUTION_NAME}
						</p>
					</div>
				)}
			</aside>
		</TooltipProvider>
	);
}
