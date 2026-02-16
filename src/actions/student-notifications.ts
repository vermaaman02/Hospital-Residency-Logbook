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
	type:
		| "rotation"
		| "case-presentation"
		| "seminar"
		| "thesis"
		| "clinical-skill"
		| "case-management"
		| "procedure-log";
	title: string;
	message: string;
	status: "SIGNED" | "NEEDS_REVISION";
	remark: string | null;
	updatedAt: string;
	href: string;
}

/** Count of unseen notifications (updatedAt > lastSeenAt). */
export interface StudentNotificationResult {
	notifications: StudentNotification[];
	unseenCount: number;
}

/**
 * Get computed notifications for a student based on their entry statuses.
 * Returns entries that have been signed or sent back for revision,
 * sorted by most recent first. Also returns unseenCount based on
 * user.notificationsLastSeenAt.
 */
export async function getStudentNotifications(): Promise<StudentNotificationResult> {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) return { notifications: [], unseenCount: 0 };

	const lastSeen = user.notificationsLastSeenAt;

	const notifications: StudentNotification[] = [];

	// Fetch signed/rejected entries from all modules in parallel
	const [
		rotations,
		casePresentations,
		seminars,
		thesis,
		clinicalSkillsAdult,
		clinicalSkillsPediatric,
		caseManagementLogs,
		procedureLogs,
	] = await Promise.all([
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
		prisma.clinicalSkillAdult.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				skillName: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.clinicalSkillPediatric.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				skillName: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.caseManagementLog.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				caseSubCategory: true,
				category: true,
				status: true,
				facultyRemark: true,
				updatedAt: true,
			},
		}),
		prisma.procedureLog.findMany({
			where: {
				userId: user.id,
				status: { in: ["SIGNED", "NEEDS_REVISION"] as never[] },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				procedureCategory: true,
				procedureDescription: true,
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

	// Map clinical skills (adult + pediatric)
	for (const cs of [...clinicalSkillsAdult, ...clinicalSkillsPediatric]) {
		notifications.push({
			id: cs.id,
			type: "clinical-skill",
			title: cs.skillName,
			message:
				cs.status === "SIGNED" ?
					"Clinical skill approved"
				:	"Revision needed for clinical skill",
			status: cs.status as "SIGNED" | "NEEDS_REVISION",
			remark: cs.facultyRemark,
			updatedAt: cs.updatedAt.toISOString(),
			href: "/dashboard/student/clinical-skills",
		});
	}

	// Map case management logs
	for (const cm of caseManagementLogs) {
		const categoryLabel =
			cm.category ?
				cm.category
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/\b\w/g, (ch: string) => ch.toUpperCase())
			:	"Case Management";
		notifications.push({
			id: cm.id,
			type: "case-management",
			title: cm.caseSubCategory || categoryLabel,
			message:
				cm.status === "SIGNED" ?
					"Case management entry approved"
				:	"Revision needed for case management entry",
			status: cm.status as "SIGNED" | "NEEDS_REVISION",
			remark: cm.facultyRemark,
			updatedAt: cm.updatedAt.toISOString(),
			href: "/dashboard/student/case-management",
		});
	}

	// Map procedure logs
	for (const pl of procedureLogs) {
		const categoryLabel =
			pl.procedureCategory ?
				pl.procedureCategory
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/\b\w/g, (ch: string) => ch.toUpperCase())
			:	"Procedure";
		notifications.push({
			id: pl.id,
			type: "procedure-log",
			title: pl.procedureDescription || categoryLabel,
			message:
				pl.status === "SIGNED" ?
					"Procedure entry approved"
				:	"Revision needed for procedure entry",
			status: pl.status as "SIGNED" | "NEEDS_REVISION",
			remark: pl.facultyRemark,
			updatedAt: pl.updatedAt.toISOString(),
			href: "/dashboard/student/procedures",
		});
	}

	// Sort by updatedAt descending (most recent first)
	notifications.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	const topNotifs = notifications.slice(0, 15);

	// Count unseen: notifications whose updatedAt > lastSeen
	const unseenCount =
		lastSeen ?
			topNotifs.filter((n) => new Date(n.updatedAt) > lastSeen).length
		:	topNotifs.length;

	return { notifications: topNotifs, unseenCount };
}
