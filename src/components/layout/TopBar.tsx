/**
 * @module TopBar
 * @description Top navigation bar with breadcrumbs, notifications, and user profile.
 * Shows pending review count badge on the bell icon for faculty/HOD.
 * Bell icon opens a dropdown listing pending items with links.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import {
	Bell,
	Menu,
	RotateCcw,
	BookOpen,
	Stethoscope,
	ArrowRight,
	CheckCircle2,
	AlertTriangle,
	GraduationCap,
	Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { APP_SHORT_NAME } from "@/lib/constants";
import {
	getPendingReviewCounts,
	type PendingCounts,
} from "@/actions/review-counts";
import {
	getStudentNotifications,
	type StudentNotification,
} from "@/actions/student-notifications";
import { markNotificationsSeen } from "@/actions/mark-notifications-seen";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface TopBarProps {
	onMobileMenuToggle?: () => void;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
	const { role, isLoaded } = useRole();
	const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(
		null,
	);
	const [studentNotifs, setStudentNotifs] = useState<StudentNotification[]>([]);
	const [unseenCount, setUnseenCount] = useState(0);
	const [notifOpen, setNotifOpen] = useState(false);
	const markedSeenRef = useRef(false);

	useEffect(() => {
		if (role === "faculty" || role === "hod") {
			getPendingReviewCounts()
				.then(setPendingCounts)
				.catch(() => {
					/* silently ignore */
				});
		}
		if (role === "student") {
			getStudentNotifications()
				.then((result) => {
					setStudentNotifs(result.notifications);
					setUnseenCount(result.unseenCount);
				})
				.catch(() => {
					/* silently ignore */
				});
		}
	}, [role]);

	// When the notification popover opens, mark all as seen
	const handleNotifOpenChange = useCallback((open: boolean) => {
		setNotifOpen(open);
		if (open && !markedSeenRef.current) {
			markedSeenRef.current = true;
			// Optimistically clear the badge
			setUnseenCount(0);
			markNotificationsSeen().catch(() => {
				/* ignore */
			});
		}
	}, []);

	const roleLabel =
		role === "hod" ? "Head of Department"
		: role === "faculty" ? "Faculty"
		: "PG Resident";

	const totalPending = pendingCounts?.total ?? 0;
	const basePath = role === "hod" ? "/dashboard/hod" : "/dashboard/faculty";

	const notificationItems = [
		{
			label: "Rotation Postings",
			count: pendingCounts?.rotationPostings ?? 0,
			href: `${basePath}/rotation-postings`,
			icon: RotateCcw,
			color: "text-blue-600 bg-blue-50",
		},
		{
			label: "Case Presentations",
			count: pendingCounts?.casePresentations ?? 0,
			href: `${basePath}/case-presentations`,
			icon: Stethoscope,
			color: "text-purple-600 bg-purple-50",
		},
		{
			label: "Thesis Records",
			count: pendingCounts?.thesisRecords ?? 0,
			href: `${basePath}/rotation-postings`,
			icon: BookOpen,
			color: "text-emerald-600 bg-emerald-50",
		},
	];

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

				{/* Notification Bell */}
				{role === "faculty" || role === "hod" ?
					<Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="relative">
								<Bell className="h-4 w-4" />
								{totalPending > 0 && (
									<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-0.5">
										{totalPending > 99 ? "99+" : totalPending}
									</span>
								)}
								<span className="sr-only">Notifications</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-80 p-0">
							<div className="px-4 py-3 border-b">
								<h3 className="text-sm font-semibold">Pending Reviews</h3>
								<p className="text-xs text-muted-foreground mt-0.5">
									{totalPending > 0 ?
										`${totalPending} item${totalPending !== 1 ? "s" : ""} awaiting your review`
									:	"All caught up!"}
								</p>
							</div>
							<div className="py-1">
								{notificationItems.map((item) => (
									<Link
										key={item.label}
										href={item.href}
										onClick={() => setNotifOpen(false)}
										className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
									>
										<div
											className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}
										>
											<item.icon className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium">{item.label}</p>
											<p className="text-xs text-muted-foreground">
												{item.count > 0 ?
													`${item.count} pending`
												:	"No pending items"}
											</p>
										</div>
										{item.count > 0 && (
											<Badge
												variant="destructive"
												className="text-[10px] h-5 min-w-5 flex items-center justify-center"
											>
												{item.count}
											</Badge>
										)}
									</Link>
								))}
							</div>
							<div className="border-t px-4 py-2">
								<Link
									href={`${basePath}/rotation-postings`}
									onClick={() => setNotifOpen(false)}
									className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
								>
									View all reviews
									<ArrowRight className="h-3 w-3" />
								</Link>
							</div>
						</PopoverContent>
					</Popover>
				:	<Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="relative">
								<Bell className="h-4 w-4" />
								{unseenCount > 0 && (
									<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-0.5">
										{unseenCount > 99 ? "99+" : unseenCount}
									</span>
								)}
								<span className="sr-only">Notifications</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-96 p-0">
							<div className="px-4 py-3 border-b">
								<h3 className="text-sm font-semibold">Activity</h3>
								<p className="text-xs text-muted-foreground mt-0.5">
									{studentNotifs.length > 0 ?
										`${studentNotifs.length} recent update${studentNotifs.length !== 1 ? "s" : ""}`
									:	"No updates yet"}
								</p>
							</div>
							<div className="max-h-80 overflow-y-auto">
								{studentNotifs.length === 0 ?
									<div className="px-4 py-8 text-center text-sm text-muted-foreground">
										No notifications yet. Submit entries to get updates here.
									</div>
								:	studentNotifs.map((notif) => {
										const IconComp =
											notif.type === "rotation" ? RotateCcw
											: notif.type === "thesis" ? GraduationCap
											: notif.type === "seminar" ? Presentation
											: Stethoscope;
										const isSigned = notif.status === "SIGNED";

										return (
											<Link
												key={`${notif.type}-${notif.id}`}
												href={notif.href}
												onClick={() => setNotifOpen(false)}
												className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
											>
												<div
													className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
														isSigned ?
															"text-green-600 bg-green-50"
														:	"text-amber-600 bg-amber-50"
													}`}
												>
													<IconComp className="h-4 w-4" />
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-1.5">
														{isSigned ?
															<CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
														:	<AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
														}
														<p className="text-sm font-medium truncate">
															{notif.title}
														</p>
													</div>
													<p
														className={`text-xs mt-0.5 ${isSigned ? "text-green-600" : "text-amber-600"}`}
													>
														{notif.message}
													</p>
													{notif.remark && !isSigned && (
														<p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
															&ldquo;{notif.remark}&rdquo;
														</p>
													)}
													<p className="text-[10px] text-muted-foreground mt-1">
														{formatDistanceToNow(new Date(notif.updatedAt), {
															addSuffix: true,
														})}
													</p>
												</div>
											</Link>
										);
									})
								}
							</div>
						</PopoverContent>
					</Popover>
				}

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
