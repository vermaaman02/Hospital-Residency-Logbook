/**
 * @module Student Notifications
 * @description Server action to compute student notifications from
 * their own entry statuses. Derived from entry data — no separate
 * Notification model needed. Shows recently approved/rejected items.
 *
 * @see components/layout/TopBar.tsx — student notification bell
 */

"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface StudentNotification {
	id: string;
	type: "rotation" | "case-presentation" | "seminar" | "thesis";
	title: string;
	message: string;
	status: "SIGNED" | "NEEDS_REVISION";
	remark: string | null;
	updatedAt: string;
	href: string;
}

/**
 * Get computed notifications for a student based on their entry statuses.
 * Returns entries that have been signed or sent back for revision,
 * sorted by most recent first.
 */
export async function getStudentNotifications(): Promise<
	StudentNotification[]
> {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) return [];

	const notifications: StudentNotification[] = [];

	// Fetch signed/rejected entries from all modules in parallel
	const [rotations, casePresentations, seminars, thesis] = await Promise.all([
		prisma.rotationPosting.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				rotationName: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.casePresentation.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				category: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.seminar.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				category: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.thesis.findUnique({
			where: { userId: user.id },
			select: {
				id: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
	]);

	// Map rotation postings
	for (const r of rotations) {
		notifications.push({
			id: r.id,
			type: "rotation",
			title: r.rotationName,
			message:
				r.status === "SIGNED" ?
					"Rotation posting approved"
				:	"Revision needed for rotation posting",
			status: r.status as "SIGNED" | "NEEDS_REVISION",
			remark: r.facultyRemark,
			updatedAt: r.updatedAt.toISOString(),
			href: "/dashboard/student/rotation-postings",
		});
	}

	// Map case presentations
	for (const c of casePresentations) {
		const categoryLabel =
			c.category ?
				c.category
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/^\w/, (ch: string) => ch.toUpperCase())
			:	"Case Presentation";
		notifications.push({
			id: c.id,
			type: "case-presentation",
			title: categoryLabel,
			message:
				c.status === "SIGNED" ?
					"Case presentation approved"
				:	"Revision needed for case presentation",
			status: c.status as "SIGNED" | "NEEDS_REVISION",
			remark: c.facultyRemark,
			updatedAt: c.updatedAt.toISOString(),
			href: "/dashboard/student/case-presentations",
		});
	}

	// Map seminars
	for (const s of seminars) {
		const categoryLabel =
			s.category ?
				s.category
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/^\w/, (ch: string) => ch.toUpperCase())
			:	"Seminar";
		notifications.push({
			id: s.id,
			type: "seminar",
			title: categoryLabel,
			message:
				s.status === "SIGNED" ?
					"Seminar approved"
				:	"Revision needed for seminar",
			status: s.status as "SIGNED" | "NEEDS_REVISION",
			remark: s.facultyRemark,
			updatedAt: s.updatedAt.toISOString(),
			href: "/dashboard/student/case-presentations?tab=seminars",
		});
	}

	// Map thesis (if status is SIGNED or NEEDS_REVISION)
	if (
		thesis &&
		(thesis.status === "SIGNED" || thesis.status === "NEEDS_REVISION")
	) {
		notifications.push({
			id: thesis.id,
			type: "thesis",
			title: "Thesis",
			message:
				thesis.status === "SIGNED" ?
					"Thesis approved"
				:	"Revision needed for thesis",
			status: thesis.status as "SIGNED" | "NEEDS_REVISION",
			remark: thesis.facultyRemark,
			updatedAt: thesis.updatedAt.toISOString(),
			href: "/dashboard/student/rotation-postings?tab=thesis",
		});
	}

	// Sort by updatedAt descending (most recent first)
	notifications.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	return notifications.slice(0, 15);
}
