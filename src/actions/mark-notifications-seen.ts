/**
 * @module Mark Notifications Seen
 * @description Updates the user's notificationsLastSeenAt timestamp so
 * that previously-seen notifications are excluded from the count.
 *
 * @see components/layout/TopBar.tsx — called when notification popover opens
 */

"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Set user.notificationsLastSeenAt to now().
 * Called when the notification popover is opened.
 */
export async function markNotificationsSeen(): Promise<void> {
	const clerkId = await requireAuth();
	await prisma.user.update({
		where: { clerkId },
		data: { notificationsLastSeenAt: new Date() },
	});
}
