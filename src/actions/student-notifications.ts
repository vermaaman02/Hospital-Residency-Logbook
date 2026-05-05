"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUnifiedInbox } from "./inbox";

export interface AppNotification {
	id: string;
	type: string;
	title: string;
	message: string;
	status: string;
	remark: string | null;
	updatedAt: string;
	href: string;
}

export interface AppNotificationResult {
	notifications: AppNotification[];
	unseenCount: number;
}

export async function getAppNotifications(): Promise<AppNotificationResult> {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) return { notifications: [], unseenCount: 0 };

	const lastSeen = user.notificationsLastSeenAt;
	
	const inboxItems = await getUnifiedInbox();

	const notifications: AppNotification[] = inboxItems.map((item: any) => {
		let mappedType = "case-presentation";
		const m = item.module.toLowerCase();
		if (m.includes("rotation")) mappedType = "rotation";
		else if (m.includes("thesis")) mappedType = "thesis";
		else if (m.includes("seminar")) mappedType = "seminar";
		else if (m.includes("clinical")) mappedType = "clinical-skill";
		else if (m.includes("attendance")) mappedType = "attendance";
		else if (m.includes("case")) mappedType = "case-management";
		else if (m.includes("procedure")) mappedType = "procedure-log";

		let message = "";
		if (user.role === "STUDENT") {
			if (item.status === "SIGNED") message = "Signed by Faculty";
			else if (item.status === "NEEDS_REVISION") {
				message = item.remark ? `Revision Requested: ${item.remark}` : "Needs Revision";
			} else {
				message = item.status;
			}
		} else {
			message = `Submitted by ${item.studentName || "Student"}`;
		}

		return {
			id: item.id,
			type: mappedType,
			title: item.title,
			message: message,
			status: item.status,
			remark: item.remark || null,
			updatedAt: item.updatedAt,
			href: item.href,
		};
	});

	let unseenCount = 0;
	if (lastSeen) {
		unseenCount = notifications.filter(
			(n) => new Date(n.updatedAt) > lastSeen,
		).length;
	} else {
		unseenCount = notifications.length;
	}

	return { notifications: notifications.slice(0, 10), unseenCount };
}
