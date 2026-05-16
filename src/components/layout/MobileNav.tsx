/**
 * @module MobileNav
 * @description Scrollable bottom tab navigation for mobile devices.
 * Role-aware: includes all sidebar navigation items with horizontal scrolling.
 * Fixed bottom bar with safe-area support and scroll indicators.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useEffect, useState } from "react";
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
	FlaskConical,
	Users,
	UserCog,
	FileText,
	Settings,
	UserCircle,
	BarChart3,
	HelpCircle,
	Siren,
	ShieldCheck,
	ClipboardCheck,
	Network,
	ChevronRight,
	ArrowRight,
} from "lucide-react";

interface MobileNavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
}

export function MobileNav() {
	const pathname = usePathname();
	const { role } = useRole();

	// State for one-time arrow animation
	const [showArrowHint, setShowArrowHint] = useState(true);
	const [hasScrolled, setHasScrolled] = useState(false);

	// Hide arrow hint after first scroll or after 5 seconds
	useEffect(() => {
		const scrollTimer = setTimeout(() => {
			setShowArrowHint(false);
		}, 5000);

		return () => clearTimeout(scrollTimer);
	}, []);

	const handleScroll = () => {
		if (!hasScrolled) {
			setHasScrolled(true);
			setShowArrowHint(false);
		}
	};

	const basePath =
		role === "hod" ? "/dashboard/hod"
		: role === "faculty" ? "/dashboard/faculty"
		: "/dashboard/student";

	const studentItems: MobileNavItem[] = [
		{
			title: "Dashboard",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Rotation",
			href: `${basePath}/rotation-postings`,
			icon: <RotateCcw className="h-5 w-5" />,
		},
		{
			title: "Attendance",
			href: `${basePath}/attendance`,
			icon: <CalendarDays className="h-5 w-5" />,
		},
		{
			title: "Profile",
			href: "/dashboard/profile",
			icon: <UserCircle className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
		{
			title: "Seminars",
			href: `${basePath}/case-presentations`,
			icon: <BookOpen className="h-5 w-5" />,
		},
		{
			title: "Journal",
			href: `${basePath}/journal-clubs`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Assessments",
			href: `${basePath}/internal-assessments`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Skills",
			href: `${basePath}/clinical-skills`,
			icon: <Stethoscope className="h-5 w-5" />,
		},
		{
			title: "Procedures",
			href: `${basePath}/procedures`,
			icon: <Syringe className="h-5 w-5" />,
		},
		{
			title: "Diagnostics",
			href: `${basePath}/diagnostics`,
			icon: <Activity className="h-5 w-5" />,
		},
		{
			title: "Imaging",
			href: `${basePath}/imaging`,
			icon: <Scan className="h-5 w-5" />,
		},
		{
			title: "Transport",
			href: `${basePath}/transport`,
			icon: <Truck className="h-5 w-5" />,
		},
		{
			title: "Consent",
			href: `${basePath}/consent-bad-news`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Courses",
			href: `${basePath}/life-support-courses`,
			icon: <GraduationCap className="h-5 w-5" />,
		},
		{
			title: "Conferences",
			href: `${basePath}/conferences`,
			icon: <Award className="h-5 w-5" />,
		},
		{
			title: "Research",
			href: `${basePath}/research-activities`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Drills",
			href: `${basePath}/disaster-drills`,
			icon: <Siren className="h-5 w-5" />,
		},
		{
			title: "Quality",
			href: `${basePath}/quality-improvement`,
			icon: <ShieldCheck className="h-5 w-5" />,
		},
		{
			title: "Reviews",
			href: `${basePath}/logbook-reviews`,
			icon: <ClipboardCheck className="h-5 w-5" />,
		},
		{
			title: "Graph",
			href: `${basePath}/evaluation-graph`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
	];

	const facultyItems: MobileNavItem[] = [
		{
			title: "Dashboard",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Students",
			href: `${basePath}/students`,
			icon: <Users className="h-5 w-5" />,
		},
		{
			title: "Rotation",
			href: `${basePath}/rotation-postings`,
			icon: <RotateCcw className="h-5 w-5" />,
		},
		{
			title: "Attendance",
			href: `${basePath}/attendance`,
			icon: <CalendarDays className="h-5 w-5" />,
		},
		{
			title: "Seminars",
			href: `${basePath}/case-presentations`,
			icon: <BookOpen className="h-5 w-5" />,
		},
		{
			title: "Journal",
			href: `${basePath}/journal-clubs`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Assessments",
			href: `${basePath}/internal-assessments`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Skills",
			href: `${basePath}/clinical-skills`,
			icon: <Stethoscope className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
		{
			title: "Procedures",
			href: `${basePath}/procedures`,
			icon: <Syringe className="h-5 w-5" />,
		},
		{
			title: "Diagnostics",
			href: `${basePath}/diagnostics`,
			icon: <Activity className="h-5 w-5" />,
		},
		{
			title: "Imaging",
			href: `${basePath}/imaging`,
			icon: <Scan className="h-5 w-5" />,
		},
		{
			title: "Transport",
			href: `${basePath}/transport`,
			icon: <Truck className="h-5 w-5" />,
		},
		{
			title: "Consent",
			href: `${basePath}/consent-bad-news`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Courses",
			href: `${basePath}/life-support-courses`,
			icon: <GraduationCap className="h-5 w-5" />,
		},
		{
			title: "Conferences",
			href: `${basePath}/conferences`,
			icon: <Award className="h-5 w-5" />,
		},
		{
			title: "Research",
			href: `${basePath}/research-activities`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Drills",
			href: `${basePath}/disaster-drills`,
			icon: <Siren className="h-5 w-5" />,
		},
		{
			title: "Quality",
			href: `${basePath}/quality-improvement`,
			icon: <ShieldCheck className="h-5 w-5" />,
		},
		{
			title: "Reviews",
			href: `${basePath}/logbook-reviews`,
			icon: <ClipboardCheck className="h-5 w-5" />,
		},
		{
			title: "Graph",
			href: `${basePath}/evaluation-graph`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
		{
			title: "Profile",
			href: "/dashboard/profile",
			icon: <UserCircle className="h-5 w-5" />,
		},
	];

	const hodItems: MobileNavItem[] = [
		{
			title: "Dashboard",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Students",
			href: `${basePath}/students`,
			icon: <Users className="h-5 w-5" />,
		},
		{
			title: "Faculty",
			href: `${basePath}/faculty`,
			icon: <GraduationCap className="h-5 w-5" />,
		},
		{
			title: "Users",
			href: `${basePath}/manage-users`,
			icon: <UserCog className="h-5 w-5" />,
		},
		{
			title: "System",
			href: `${basePath}/manage-system`,
			icon: <Network className="h-5 w-5" />,
		},
		{
			title: "Analytics",
			href: `${basePath}/analytics`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
		{
			title: "Rotation",
			href: `${basePath}/rotation-postings`,
			icon: <RotateCcw className="h-5 w-5" />,
		},
		{
			title: "Rotation Config",
			href: `${basePath}/rotation-posting-config`,
			icon: <Settings className="h-5 w-5" />,
		},
		{
			title: "Attendance",
			href: `${basePath}/attendance`,
			icon: <CalendarDays className="h-5 w-5" />,
		},
		{
			title: "Seminars",
			href: `${basePath}/case-presentations`,
			icon: <BookOpen className="h-5 w-5" />,
		},
		{
			title: "Journal",
			href: `${basePath}/journal-clubs`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Assessments",
			href: `${basePath}/internal-assessments`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Skills",
			href: `${basePath}/clinical-skills`,
			icon: <Stethoscope className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
		{
			title: "Procedures",
			href: `${basePath}/procedures`,
			icon: <Syringe className="h-5 w-5" />,
		},
		{
			title: "Diagnostics",
			href: `${basePath}/diagnostics`,
			icon: <Activity className="h-5 w-5" />,
		},
		{
			title: "Imaging",
			href: `${basePath}/imaging`,
			icon: <Scan className="h-5 w-5" />,
		},
		{
			title: "Transport",
			href: `${basePath}/transport`,
			icon: <Truck className="h-5 w-5" />,
		},
		{
			title: "Consent",
			href: `${basePath}/consent-bad-news`,
			icon: <FileText className="h-5 w-5" />,
		},
		{
			title: "Courses",
			href: `${basePath}/life-support-courses`,
			icon: <GraduationCap className="h-5 w-5" />,
		},
		{
			title: "Conferences",
			href: `${basePath}/conferences`,
			icon: <Award className="h-5 w-5" />,
		},
		{
			title: "Research",
			href: `${basePath}/research-activities`,
			icon: <FlaskConical className="h-5 w-5" />,
		},
		{
			title: "Drills",
			href: `${basePath}/disaster-drills`,
			icon: <Siren className="h-5 w-5" />,
		},
		{
			title: "Quality",
			href: `${basePath}/quality-improvement`,
			icon: <ShieldCheck className="h-5 w-5" />,
		},
		{
			title: "Reviews",
			href: `${basePath}/logbook-reviews`,
			icon: <ClipboardCheck className="h-5 w-5" />,
		},
		{
			title: "Graph",
			href: `${basePath}/evaluation-graph`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
		{
			title: "Profile",
			href: "/dashboard/profile",
			icon: <UserCircle className="h-5 w-5" />,
		},
		{
			title: "Help",
			href: "/dashboard/help",
			icon: <HelpCircle className="h-5 w-5" />,
		},
	];

	const items =
		role === "student" ? studentItems
		: role === "hod" ? hodItems
		: facultyItems;

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 safe-area-bottom">
			{/* One-time arrow hint animation */}
			{showArrowHint && (
				<div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-pulse pointer-events-none">
					<div className="flex items-center gap-2 bg-hospital-primary text-white px-3 py-1.5 rounded-full shadow-lg">
						<span className="text-xs font-medium">Swipe</span>
						<ArrowRight className="h-4 w-4 animate-bounce" />
					</div>
				</div>
			)}
			<div
				className="flex items-center gap-1 h-16 px-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
				onScroll={handleScroll}
			>
				{items.map((item) => {
					const isActive =
						item.href === basePath ?
							pathname === basePath
						:	pathname === item.href || pathname.startsWith(item.href + "/");

					return (
						<Link
							key={item.title}
							href={item.href}
							className={cn(
								"flex flex-col items-center justify-center gap-1 min-w-[72px] py-2 px-3 rounded-lg transition-colors snap-start shrink-0",
								isActive ?
									"text-hospital-primary bg-hospital-primary/10"
								:	"text-muted-foreground active:text-foreground hover:bg-muted/50",
							)}
						>
							<span
								className={cn(
									"transition-transform",
									isActive && "scale-110",
								)}
							>
								{item.icon}
							</span>
							<span
								className={cn(
									"text-[10px] font-medium leading-tight text-center whitespace-nowrap",
									isActive && "font-semibold",
								)}
							>
								{item.title}
							</span>
						</Link>
					);
				})}
				{/* Blinking scroll indicator */}
				<div className="flex items-center justify-center min-w-[72px] py-2 px-3 shrink-0">
					<ChevronRight className="h-5 w-5 text-muted-foreground animate-pulse" />
				</div>
			</div>
		</nav>
	);
}
