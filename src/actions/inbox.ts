/**
 * @module Review Inbox
 * @description Server action to fetch a unified timeline of all submissions
 * across all modules. Provides a single "Review Inbox" for HOD, Faculty, and Students.
 */

"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface InboxItem {
	id: string;
	module: string;
	title: string;
	studentName?: string;
	status: string;
	updatedAt: string;
	href: string;
	remark?: string | null;
}

export async function getUnifiedInbox(): Promise<InboxItem[]> {
	const clerkId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) return [];

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
		if (studentIds.length === 0) return [];
	}

	const studentFilter =
		isStudent ? { userId: user.id }
		: studentIds.length > 0 ? { userId: { in: studentIds } }
		: {};

	const statusFilter = isStudent ? { in: ["SIGNED", "NEEDS_REVISION"] as never[] } : "SUBMITTED" as never;

	// Fetch all modules in parallel
	const [
		attendance,
		rotations,
		casePresentations,
		seminars,
		thesis,
		clinicalAdult,
		clinicalPed,
		caseMgmt,
		procedures,
		diagnosticSkills,
		imaging,
		transport,
		consent,
		badNews,
		courses,
		conferences,
		research,
		disaster,
		qi,
		logbook,
	] = await Promise.all([
		prisma.attendanceEntry.findMany({
			where: {
				attendanceSheet: isStudent ? { userId: user.id } : (studentIds.length > 0 ? { userId: { in: studentIds } } : undefined),
				status: statusFilter,
			},
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { attendanceSheet: { include: { user: { select: { firstName: true, lastName: true } } } } },
		}),
		prisma.rotationPosting.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.casePresentation.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.seminar.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.thesis.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.clinicalSkillAdult.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.clinicalSkillPediatric.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.caseManagementLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.procedureLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.diagnosticSkill.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.imagingLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.transportLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.consentLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.badNewsLog.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.courseAttended.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.conferenceParticipation.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.researchActivity.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.disasterDrill.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.qualityImprovement.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
		prisma.logbookFacultyReview.findMany({
			where: { ...studentFilter, status: statusFilter },
			orderBy: { updatedAt: "desc" },
			take: 20,
			include: { user: { select: { firstName: true, lastName: true } } },
		}),
	]);

	const items: InboxItem[] = [];
	const basePath = isStudent ? "/dashboard/student" : (role === "HOD" ? "/dashboard/hod" : "/dashboard/faculty");

	attendance.forEach(i => items.push({
		id: i.id, module: "Attendance", title: "Attendance Entry",
		studentName: `${i.attendanceSheet.user.firstName} ${i.attendanceSheet.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/attendance`
	}));

	rotations.forEach(i => items.push({
		id: i.id, module: "Rotation Postings", title: i.rotationName,
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/rotation-postings`
	}));

	casePresentations.forEach(i => items.push({
		id: i.id, module: "Case Presentations", title: i.category || "Case Presentation",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/case-presentations`
	}));

	seminars.forEach(i => items.push({
		id: i.id, module: "Seminars", title: i.category || "Seminar",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/case-presentations?tab=seminars`
	}));

	thesis.forEach(i => items.push({
		id: i.id, module: "Thesis", title: "Thesis Record",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/rotation-postings?tab=thesis`
	}));

	clinicalAdult.forEach(i => items.push({
		id: i.id, module: "Clinical Skills (Adult)", title: i.skillName,
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/clinical-skills`
	}));

	clinicalPed.forEach(i => items.push({
		id: i.id, module: "Clinical Skills (Pediatric)", title: i.skillName,
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/clinical-skills?tab=pediatric`
	}));

	caseMgmt.forEach(i => items.push({
		id: i.id, module: "Case Management", title: i.caseSubCategory || "Case Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/case-management`
	}));

	procedures.forEach(i => items.push({
		id: i.id, module: "Procedure Logs", title: "Procedure Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/procedures`
	}));

	diagnosticSkills.forEach(i => items.push({
		id: i.id, module: "Diagnostic Skills", title: i.skillName || "Diagnostic Skill",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/diagnostics`
	}));

	imaging.forEach(i => items.push({
		id: i.id, module: "Imaging Logs", title: "Imaging Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/imaging`
	}));

	transport.forEach(i => items.push({
		id: i.id, module: "Transport Logs", title: "Transport Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/transport`
	}));

	consent.forEach(i => items.push({
		id: i.id, module: "Consent Logs", title: "Consent Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/consent-bad-news`
	}));

	badNews.forEach(i => items.push({
		id: i.id, module: "Bad News Logs", title: "Bad News Log",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/consent-bad-news`
	}));

	courses.forEach(i => items.push({
		id: i.id, module: "Courses Attended", title: i.courseName || "Course",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/life-support-courses`
	}));

	conferences.forEach(i => items.push({
		id: i.id, module: "Conferences", title: "Conference Participation",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/conferences`
	}));

	research.forEach(i => items.push({
		id: i.id, module: "Research Activities", title: "Research & Outreach",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/research-activities`
	}));

	disaster.forEach(i => items.push({
		id: i.id, module: "Disaster Drills", title: "Disaster Drills",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/disaster-drills`
	}));

	qi.forEach(i => items.push({
		id: i.id, module: "Quality Improvement", title: "Quality Improvement",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `/dashboard/${role}/quality-improvement`
	}));

	logbook.forEach(i => items.push({
		id: i.id, module: "Logbook Reviews", title: "Logbook Review",
		studentName: `${i.user.firstName} ${i.user.lastName}`,
		status: i.status, remark: (i as any).facultyRemark || null, updatedAt: i.updatedAt.toISOString(), href: `${basePath}/logbook-reviews`
	}));

	items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

	return items.slice(0, 100);
}
