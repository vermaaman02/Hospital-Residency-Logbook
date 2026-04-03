/**
 * @module StudentDashboard
 * @description Main dashboard for PG residents. Fetches comprehensive data
 * across all logbook modules and renders a rich, interactive dashboard.
 *
 * @see roadmap.md — Section 6, Module A
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import {
	StudentDashboardClient,
	type StudentDashboardData,
} from "./StudentDashboardClient";
import { AssessmentNotificationPopup } from "@/components/shared/AssessmentNotificationPopup";

/* helper: count 3 statuses in one go */
async function moduleCounts(
	model: { count: (args: { where: object }) => Promise<number> },
	userId: string,
) {
	const [total, signed, pending] = await Promise.all([
		model.count({ where: { userId } }),
		model.count({ where: { userId, status: "SIGNED" as never } }),
		model.count({ where: { userId, status: "SUBMITTED" as never } }),
	]);
	return { total, signed, pending };
}

export default async function StudentDashboardPage() {
	const { userId: clerkId } = await auth();
	if (!clerkId) redirect("/sign-in");

	const user = await ensureUserInDb();
	if (!user) redirect("/sign-in");

	const uid = user.id;

	/* ── Parallel counts per module ── */
	const [
		cases,
		procs,
		csAdult,
		csPed,
		diag,
		img,
		cp,
		sem,
		jc,
		rot,
		att,
		transport,
		consent,
		badNews,
		courses,
		conf,
		research,
		disaster,
		qi,
		review,
	] = await Promise.all([
		moduleCounts(prisma.caseManagementLog, uid),
		moduleCounts(prisma.procedureLog, uid),
		moduleCounts(prisma.clinicalSkillAdult, uid),
		moduleCounts(prisma.clinicalSkillPediatric, uid),
		moduleCounts(prisma.diagnosticSkill, uid),
		moduleCounts(prisma.imagingLog, uid),
		moduleCounts(prisma.casePresentation, uid),
		moduleCounts(prisma.seminar, uid),
		moduleCounts(prisma.journalClub, uid),
		moduleCounts(prisma.rotationPosting, uid),
		moduleCounts(prisma.attendanceSheet, uid),
		moduleCounts(prisma.transportLog, uid),
		moduleCounts(prisma.consentLog, uid),
		moduleCounts(prisma.badNewsLog, uid),
		moduleCounts(prisma.courseAttended, uid),
		moduleCounts(prisma.conferenceParticipation, uid),
		moduleCounts(prisma.researchActivity, uid),
		moduleCounts(prisma.disasterDrill, uid),
		moduleCounts(prisma.qualityImprovement, uid),
		moduleCounts(prisma.logbookFacultyReview, uid),
	]);

	const clinical = {
		total: csAdult.total + csPed.total,
		signed: csAdult.signed + csPed.signed,
		pending: csAdult.pending + csPed.pending,
	};

	const modules = [
		{
			label: "Case Management",
			...cases,
			href: "/dashboard/student/case-management",
			icon: "ClipboardList",
			color: "text-blue-600",
			bg: "bg-blue-50",
		},
		{
			label: "Procedures",
			...procs,
			href: "/dashboard/student/procedures",
			icon: "Syringe",
			color: "text-emerald-600",
			bg: "bg-emerald-50",
		},
		{
			label: "Clinical Skills",
			...clinical,
			href: "/dashboard/student/clinical-skills",
			icon: "Stethoscope",
			color: "text-purple-600",
			bg: "bg-purple-50",
		},
		{
			label: "Diagnostics",
			...diag,
			href: "/dashboard/student/diagnostics",
			icon: "Activity",
			color: "text-orange-600",
			bg: "bg-orange-50",
		},
		{
			label: "Imaging",
			...img,
			href: "/dashboard/student/imaging",
			icon: "Scan",
			color: "text-pink-600",
			bg: "bg-pink-50",
		},
		{
			label: "Presentations",
			...cp,
			href: "/dashboard/student/case-presentations",
			icon: "BookOpen",
			color: "text-cyan-600",
			bg: "bg-cyan-50",
		},
		{
			label: "Seminars",
			...sem,
			href: "/dashboard/student/case-presentations",
			icon: "BookOpen",
			color: "text-teal-600",
			bg: "bg-teal-50",
		},
		{
			label: "Journal Clubs",
			...jc,
			href: "/dashboard/student/journal-clubs",
			icon: "FlaskConical",
			color: "text-indigo-600",
			bg: "bg-indigo-50",
		},
		{
			label: "Rotation Postings",
			...rot,
			href: "/dashboard/student/rotation-postings",
			icon: "RotateCcw",
			color: "text-violet-600",
			bg: "bg-violet-50",
		},
		{
			label: "Attendance",
			...att,
			href: "/dashboard/student/attendance",
			icon: "CalendarDays",
			color: "text-sky-600",
			bg: "bg-sky-50",
		},
		{
			label: "Transport",
			...transport,
			href: "/dashboard/student/transport",
			icon: "Truck",
			color: "text-lime-600",
			bg: "bg-lime-50",
		},
		{
			label: "Consent & Bad News",
			total: consent.total + badNews.total,
			signed: consent.signed + badNews.signed,
			pending: consent.pending + badNews.pending,
			href: "/dashboard/student/consent-bad-news",
			icon: "FileText",
			color: "text-rose-600",
			bg: "bg-rose-50",
		},
		{
			label: "Courses",
			...courses,
			href: "/dashboard/student/life-support-courses",
			icon: "GraduationCap",
			color: "text-fuchsia-600",
			bg: "bg-fuchsia-50",
		},
		{
			label: "Conferences",
			...conf,
			href: "/dashboard/student/conferences",
			icon: "Award",
			color: "text-amber-600",
			bg: "bg-amber-50",
		},
		{
			label: "Research",
			...research,
			href: "/dashboard/student/research-activities",
			icon: "FlaskConical",
			color: "text-green-600",
			bg: "bg-green-50",
		},
		{
			label: "Disaster Drills",
			...disaster,
			href: "/dashboard/student/disaster-drills",
			icon: "Siren",
			color: "text-red-600",
			bg: "bg-red-50",
		},
		{
			label: "Quality Improvement",
			...qi,
			href: "/dashboard/student/quality-improvement",
			icon: "ShieldCheck",
			color: "text-yellow-600",
			bg: "bg-yellow-50",
		},
		{
			label: "Logbook Reviews",
			...review,
			href: "/dashboard/student/logbook-reviews",
			icon: "ClipboardCheck",
			color: "text-slate-600",
			bg: "bg-slate-50",
		},
	];

	const totalEntries = modules.reduce((s, m) => s + m.total, 0);
	const totalSigned = modules.reduce((s, m) => s + m.signed, 0);
	const totalPending = modules.reduce((s, m) => s + m.pending, 0);

	/* ── Draft count ── */
	const [draftCases, draftProcs] = await Promise.all([
		prisma.caseManagementLog.count({
			where: { userId: uid, status: "DRAFT" as never },
		}),
		prisma.procedureLog.count({
			where: { userId: uid, status: "DRAFT" as never },
		}),
	]);
	const totalDraft = draftCases + draftProcs;

	/* ── Recent entries ── */
	const [recentCases, recentProcs, recentDiag] = await Promise.all([
		prisma.caseManagementLog.findMany({
			where: { userId: uid },
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				category: true,
				caseSubCategory: true,
				status: true,
				updatedAt: true,
			},
		}),
		prisma.procedureLog.findMany({
			where: { userId: uid },
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				procedureCategory: true,
				procedureDescription: true,
				status: true,
				updatedAt: true,
			},
		}),
		prisma.diagnosticSkill.findMany({
			where: { userId: uid },
			orderBy: { updatedAt: "desc" },
			take: 3,
			select: {
				id: true,
				skillName: true,
				diagnosticCategory: true,
				status: true,
				updatedAt: true,
			},
		}),
	]);

	const recentEntries = [
		...recentCases.map((c) => ({
			id: c.id,
			module: "Case",
			title: c.caseSubCategory || c.category,
			status: c.status,
			date: c.updatedAt.toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
			}),
			href: "/dashboard/student/case-management",
		})),
		...recentProcs.map((p) => ({
			id: p.id,
			module: "Procedure",
			title: p.procedureDescription || p.procedureCategory,
			status: p.status,
			date: p.updatedAt.toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
			}),
			href: "/dashboard/student/procedures",
		})),
		...recentDiag.map((d) => ({
			id: d.id,
			module: "Diagnostic",
			title: d.skillName || d.diagnosticCategory,
			status: d.status,
			date: d.updatedAt.toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
			}),
			href: "/dashboard/student/diagnostics",
		})),
	].slice(0, 8);

	/* ── Weekly activity (last 8 weeks) ── */
	const weeklyActivity: { label: string; entries: number }[] = [];
	const now = new Date();
	for (let i = 7; i >= 0; i--) {
		const weekStart = new Date(now);
		weekStart.setDate(weekStart.getDate() - i * 7);
		weekStart.setHours(0, 0, 0, 0);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 7);

		const [c, p] = await Promise.all([
			prisma.caseManagementLog.count({
				where: { userId: uid, createdAt: { gte: weekStart, lt: weekEnd } },
			}),
			prisma.procedureLog.count({
				where: { userId: uid, createdAt: { gte: weekStart, lt: weekEnd } },
			}),
		]);

		weeklyActivity.push({
			label: weekStart.toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
			}),
			entries: c + p,
		});
	}

	/* ── Streak (consecutive days with entries) ── */
	let streakDays = 0;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	for (let d = 0; d < 30; d++) {
		const dayStart = new Date(today);
		dayStart.setDate(dayStart.getDate() - d);
		const dayEnd = new Date(dayStart);
		dayEnd.setDate(dayEnd.getDate() + 1);
		const hasEntry = await prisma.caseManagementLog.count({
			where: { userId: uid, createdAt: { gte: dayStart, lt: dayEnd } },
		});
		if (hasEntry > 0) {
			streakDays++;
		} else if (d > 0) {
			break;
		}
	}

	/* ── Status breakdown ── */
	const statusBreakdown = [
		{ status: "Draft", count: totalDraft },
		{ status: "Submitted", count: totalPending },
		{ status: "Signed", count: totalSigned },
		{
			status: "Other",
			count: Math.max(
				0,
				totalEntries - totalDraft - totalPending - totalSigned,
			),
		},
	];

	const data: StudentDashboardData = {
		userName: `${user.firstName} ${user.lastName}`,
		semester: user.currentSemester ?? 1,
		batch: user.batch,
		modules: modules.map((m) => ({
			label: m.label,
			count: m.total,
			signed: m.signed,
			pending: m.pending,
			href: m.href,
			icon: m.icon as never,
			color: m.color,
			bg: m.bg,
		})),
		totalEntries,
		totalSigned,
		totalPending,
		totalDraft,
		recentEntries,
		weeklyActivity,
		statusBreakdown,
		streakDays,
	};

	/* ── Pending Assessments for Popup (Feature 5) ── */
	const pendingAssessments = user.batchId
		? await prisma.internalAssessment.findMany({
				where: {
					batchId: user.batchId,
					isPublished: true,
					submissions: {
						none: {
							studentId: uid,
							status: { in: ["SUBMITTED", "SIGNED"] },
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: 5,
				select: {
					id: true,
					title: true,
					assessmentType: true,
					deadline: true,
					maxMarks: true,
					createdBy: { select: { firstName: true, lastName: true } },
					batch: { select: { name: true } },
				},
			})
		: [];

	const popupAssessments = pendingAssessments.map((a) => ({
		id: a.id,
		title: a.title,
		assessmentType: a.assessmentType,
		deadline: a.deadline?.toISOString() ?? null,
		maxMarks: a.maxMarks,
		createdBy: `${a.createdBy.firstName} ${a.createdBy.lastName}`,
		batchName: a.batch.name,
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Student Dashboard"
				description="Track your progress across all logbook sections"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Student" },
				]}
			/>
			<AssessmentNotificationPopup assessments={popupAssessments} />
			<StudentDashboardClient data={JSON.parse(JSON.stringify(data))} />
		</div>
	);
}
