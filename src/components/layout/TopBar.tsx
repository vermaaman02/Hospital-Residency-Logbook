/**
 * @module TopBar
 * @description Top navigation bar with breadcrumbs, notifications, and user profile.
 * Shows pending review count badge on the bell icon for faculty/HOD.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_SHORT_NAME } from "@/lib/constants";
import {
	getPendingReviewCounts,
	type PendingCounts,
} from "@/actions/review-counts";

interface TopBarProps {
	onMobileMenuToggle?: () => void;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
	const { role, isLoaded } = useRole();
	const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(
		null,
	);

	useEffect(() => {
		if (role === "faculty" || role === "hod") {
			getPendingReviewCounts()
				.then(setPendingCounts)
				.catch(() => {
					/* silently ignore */
				});
		}
	}, [role]);

	const roleLabel =
		role === "hod" ? "Head of Department"
		: role === "faculty" ? "Faculty"
		: "PG Resident";

	const totalPending = pendingCounts?.total ?? 0;

	return (
		<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 lg:px-6">
			{/* Left: Mobile menu + Title */}
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					className="lg:hidden"
					onClick={onMobileMenuToggle}
				>
					<Menu className="h-5 w-5" />
					<span className="sr-only">Toggle menu</span>
				</Button>
				<div className="lg:hidden">
					<span className="text-sm font-bold text-primary">
						{APP_SHORT_NAME}
					</span>
				</div>
			</div>

			{/* Right: Role badge + Notifications + User */}
			<div className="flex items-center gap-3">
				{isLoaded && role && (
					<Badge variant="secondary" className="hidden sm:flex text-xs">
						{roleLabel}
					</Badge>
				)}

				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-4 w-4" />
					{totalPending > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-0.5">
							{totalPending > 99 ? "99+" : totalPending}
						</span>
					)}
					<span className="sr-only">Notifications</span>
				</Button>

				<UserButton
					afterSignOutUrl="/"
					appearance={{
						elements: {
							avatarBox: "h-8 w-8",
						},
					}}
				/>
			</div>
		</header>
	);
}
