/**
 * GET /api/v1/inbox
 * Paginated unified timeline for the current user.
 *
 * Query params:
 *   cursor   — ISO timestamp (updatedAt) for cursor-based pagination
 *   limit    — number of items per page (default 20, max 50)
 *   status   — filter by status (default: role-appropriate)
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/app/api/v1/_lib/respond";
import type { InboxItem } from "@/actions/inbox";

export async function GET(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({ where: { clerkId } });
		if (!user) return ok({ items: [], nextCursor: null });

		const url = new URL(req.url);
		const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
		const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 50);
		const cursorParam = url.searchParams.get("cursor");
		const cursorDate = cursorParam ? new Date(cursorParam) : undefined;

		const role = user.role;
		const isStudent = role === "STUDENT";

		let studentIds: string[] = [];

		if (role === "FACULTY") {
			const batchAssignments = await prisma.facultyBatchAssignment.findMany({
				where: { facultyId: user.id },
				select: { batchId: true },
			});
			const batchIds = batchAssignments.map((b) => b.batchId);
			if (batchIds.length > 0) {
				const students = await prisma.user.findMany({
					where: { batchId: { in: batchIds }, role: "STUDENT" },
					select: { id: true },
				});
				studentIds = students.map((s) => s.id);
			}
			if (studentIds.length === 0) return ok({ items: [], nextCursor: null });
		}

		const studentFilter =
			isStudent ? { userId: user.id }
			: studentIds.length > 0 ? { userId: { in: studentIds } }
			: {};

		const statusFilter = isStudent
			? { in: ["SIGNED", "NEEDS_REVISION"] as never[] }
			: ("SUBMITTED" as never);

		const cursorFilter = cursorDate ? { updatedAt: { lt: cursorDate } } : {};

		const take = limit + 1; // fetch one extra to determine if there's a next page

		const [
			rotations, casePresentations, caseMgmt, procedures, diagnosticSkills,
			imaging, courses, conferences, research, disaster, qi, logbook,
		] = await Promise.all([
			prisma.rotationPosting.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.casePresentation.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.caseManagementLog.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.procedureLog.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.diagnosticSkill.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.imagingLog.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.courseAttended.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.conferenceParticipation.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.researchActivity.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.disasterDrill.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.qualityImprovement.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
			prisma.logbookFacultyReview.findMany({
				where: { ...studentFilter, status: statusFilter, ...cursorFilter },
				orderBy: { updatedAt: "desc" }, take,
				include: { user: { select: { firstName: true, lastName: true } } },
			}),
		]);

		const basePath =
			isStudent ? "/dashboard/student"
			: role === "HOD" ? "/dashboard/hod"
			: "/dashboard/faculty";

		const items: InboxItem[] = [];

		rotations.forEach((i) =>
			items.push({
				id: i.id, module: "Rotation Postings", title: i.rotationName,
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/rotation-postings`,
			}),
		);
		casePresentations.forEach((i) =>
			items.push({
				id: i.id, module: "Case Presentations", title: i.category || "Case Presentation",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/case-presentations`,
			}),
		);
		caseMgmt.forEach((i) =>
			items.push({
				id: i.id, module: "Case Management", title: i.caseSubCategory || "Case Log",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/case-management`,
			}),
		);
		procedures.forEach((i) =>
			items.push({
				id: i.id, module: "Procedure Logs", title: "Procedure Log",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/procedures`,
			}),
		);
		diagnosticSkills.forEach((i) =>
			items.push({
				id: i.id, module: "Diagnostic Skills", title: i.skillName || "Diagnostic Skill",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/diagnostics`,
			}),
		);
		imaging.forEach((i) =>
			items.push({
				id: i.id, module: "Imaging Logs", title: "Imaging Log",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/imaging`,
			}),
		);
		courses.forEach((i) =>
			items.push({
				id: i.id, module: "Courses Attended", title: i.courseName || "Course",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/life-support-courses`,
			}),
		);
		conferences.forEach((i) =>
			items.push({
				id: i.id, module: "Conferences", title: "Conference Participation",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/conferences`,
			}),
		);
		research.forEach((i) =>
			items.push({
				id: i.id, module: "Research Activities", title: "Research & Outreach",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/research-activities`,
			}),
		);
		disaster.forEach((i) =>
			items.push({
				id: i.id, module: "Disaster Drills", title: "Disaster Drills",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/disaster-drills`,
			}),
		);
		qi.forEach((i) =>
			items.push({
				id: i.id, module: "Quality Improvement", title: "Quality Improvement",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/quality-improvement`,
			}),
		);
		logbook.forEach((i) =>
			items.push({
				id: i.id, module: "Logbook Reviews", title: "Logbook Review",
				studentName: `${i.user.firstName} ${i.user.lastName}`,
				status: i.status, remark: (i as any).facultyRemark || null,
				updatedAt: i.updatedAt.toISOString(), href: `${basePath}/logbook-reviews`,
			}),
		);

		items.sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);

		const page = items.slice(0, limit);
		const hasMore = items.length > limit;
		const nextCursor = hasMore ? page[page.length - 1].updatedAt : null;

		return ok({ items: page, nextCursor });
	} catch (e) {
		return handleError(e);
	}
}
