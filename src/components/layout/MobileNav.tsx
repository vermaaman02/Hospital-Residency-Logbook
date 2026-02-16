/**
 * @module MobileNav
 * @description Bottom tab navigation for mobile devices.
 * Role-aware: students get quick-add FAB + clinical sections,
 * faculty/HOD get review-focused + management tabs.
 * Fixed bottom bar with safe-area support.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import {
	LayoutDashboard,
	ClipboardList,
	Syringe,
	Plus,
	Users,
	BarChart3,
	Stethoscope,
} from "lucide-react";

interface MobileNavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
	isAction?: boolean;
}

export function MobileNav() {
	const pathname = usePathname();
	const { role } = useRole();

	const basePath =
		role === "hod" ? "/dashboard/hod"
		: role === "faculty" ? "/dashboard/faculty"
		: "/dashboard/student";

	const studentItems: MobileNavItem[] = [
		{
			title: "Home",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
		{
			title: "Add",
			href: `${basePath}/case-management`,
			icon: <Plus className="h-6 w-6" />,
			isAction: true,
		},
		{
			title: "Procedures",
			href: `${basePath}/procedures`,
			icon: <Syringe className="h-5 w-5" />,
		},
		{
			title: "Skills",
			href: `${basePath}/clinical-skills`,
			icon: <Stethoscope className="h-5 w-5" />,
		},
	];

	const facultyItems: MobileNavItem[] = [
		{
			title: "Home",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Students",
			href: `${basePath}/students`,
			icon: <Users className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
		{
			title: "Evaluate",
			href: `${basePath}/evaluation-graph`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
	];

	const hodItems: MobileNavItem[] = [
		{
			title: "Home",
			href: basePath,
			icon: <LayoutDashboard className="h-5 w-5" />,
		},
		{
			title: "Students",
			href: `${basePath}/students`,
			icon: <Users className="h-5 w-5" />,
		},
		{
			title: "Analytics",
			href: `${basePath}/analytics`,
			icon: <BarChart3 className="h-5 w-5" />,
		},
		{
			title: "Cases",
			href: `${basePath}/case-management`,
			icon: <ClipboardList className="h-5 w-5" />,
		},
	];

	const items =
		role === "student" ? studentItems
		: role === "hod" ? hodItems
		: facultyItems;

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 safe-area-bottom">
			<div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
				{items.map((item) => {
					const isActive =
						item.href === basePath ?
							pathname === basePath
						:	pathname === item.href || pathname.startsWith(item.href + "/");

					if (item.isAction) {
						return (
							<Link
								key={item.title}
								href={item.href}
								className="relative -top-4 flex items-center justify-center h-14 w-14 rounded-full bg-hospital-primary text-white shadow-lg shadow-hospital-primary/30 active:scale-95 transition-transform"
								aria-label={item.title}
							>
								{item.icon}
							</Link>
						);
					}

					return (
						<Link
							key={item.title}
							href={item.href}
							className={cn(
								"flex flex-col items-center justify-center gap-0.5 min-w-14 py-1.5 rounded-lg transition-colors",
								isActive ?
									"text-hospital-primary"
								:	"text-muted-foreground active:text-foreground",
							)}
						>
							<span
								className={cn("transition-transform", isActive && "scale-110")}
							>
								{item.icon}
							</span>
							<span
								className={cn(
									"text-[10px] font-medium leading-none",
									isActive && "font-semibold",
								)}
							>
								{item.title}
							</span>
							{isActive && (
								<span className="absolute bottom-1 h-1 w-1 rounded-full bg-hospital-primary" />
							)}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
