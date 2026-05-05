"use client";

import { useEffect, useState } from "react";
import { getUnifiedInbox, InboxItem } from "@/actions/inbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useSocketEvent } from "@/lib/socket";

interface ReviewInboxClientProps {
	initialItems: InboxItem[];
}

export function ReviewInboxClient({ initialItems }: ReviewInboxClientProps) {
	const [items, setItems] = useState<InboxItem[]>(initialItems);
	const [isLoading, setIsLoading] = useState(false);

	const fetchInbox = async () => {
		setIsLoading(true);
		try {
			const data = await getUnifiedInbox();
			setItems(data);
		} catch (error) {
			console.error("Failed to fetch inbox:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-refresh when any module updates
	useSocketEvent("entry:updated", fetchInbox);
	useSocketEvent("assessment:updated", fetchInbox);
	useSocketEvent("system:updated", fetchInbox);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Review Inbox</h1>
					<p className="text-muted-foreground mt-2">
						Real-time feed of all module activities and submissions.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={fetchInbox}
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<RefreshCcw className="mr-2 h-4 w-4" />
					)}
					Refresh
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					{items.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							No items found in your inbox.
						</div>
					) : (
						<div className="space-y-4">
							{items.map((item) => (
								<div
									key={`${item.module}-${item.id}`}
									className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-semibold">{item.title}</span>
											<Badge
												variant={
													item.status === "SUBMITTED"
														? "default"
														: item.status === "NEEDS_REVISION"
														? "destructive"
														: "secondary"
												}
												className={
													item.status === "SIGNED"
														? "bg-green-500 hover:bg-green-600 text-white"
														: ""
												}
											>
												{item.status.replace("_", " ")}
											</Badge>
										</div>
										<div className="text-sm text-muted-foreground">
											<span className="font-medium text-foreground">
												{item.studentName}
											</span>{" "}
											• {item.module}
										</div>
									</div>
									<div className="mt-4 sm:mt-0 flex items-center gap-4">
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											{formatDistanceToNow(new Date(item.updatedAt), {
												addSuffix: true,
											})}
										</span>
										<Button variant="ghost" size="sm" asChild>
											<Link href={item.href}>
												View <ExternalLink className="ml-2 h-4 w-4" />
											</Link>
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
