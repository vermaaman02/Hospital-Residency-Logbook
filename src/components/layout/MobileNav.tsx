/**
 * @module MobileNav
 * @description Bottom tab navigation for mobile devices.
 * Shows key navigation items as a fixed bottom bar.
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
	Activity,
	Plus,
} from "lucide-react";

interface MobileNavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
}

export function MobileNav() {
	const pathname = usePathname();
	const { role } = useRole();

	const basePath =
		role === "hod" ? "/dashboard/hod"
		: role === "faculty" ? "/dashboard/faculty"
		: "/dashboard/student";

	const items: MobileNavItem[] =
		role === "student" ?
			[
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
					href: `${basePath}/quick-add`,
					icon: <Plus className="h-6 w-6" />,
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
			]
		:	[
				{
					title: "Home",
					href: basePath,
					icon: <LayoutDashboard className="h-5 w-5" />,
				},
				{
					title: "Reviews",
					href: `${basePath}/pending-reviews`,
					icon: <ClipboardList className="h-5 w-5" />,
				},
				{
					title: "Evaluate",
					href: `${basePath}/evaluations`,
					icon: <Activity className="h-5 w-5" />,
				},
			];

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur">
			<div className="flex items-center justify-around py-2">
				{items.map((item) => {
					const isActive =
						pathname === item.href || pathname.startsWith(item.href + "/");
					const isQuickAdd = item.title === "Add";

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
								isQuickAdd ?
									"relative -top-3 rounded-full bg-primary text-primary-foreground p-3 shadow-lg"
								: isActive ? "text-primary"
								: "text-muted-foreground",
							)}
						>
							{item.icon}
							{!isQuickAdd && <span>{item.title}</span>}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
