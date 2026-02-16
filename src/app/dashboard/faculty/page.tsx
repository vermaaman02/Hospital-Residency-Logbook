/**
 * @module FacultyDashboard
 * @description Main dashboard for faculty members. Shows assigned students,
 * pending reviews queue, sign-off statistics, and recent activity.
 *
 * @see roadmap.md — Section 6, Module B
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import {
	FacultyDashboardClient,
	type FacultyDashboardData,
} from "./FacultyDashboardClient";

export default async function FacultyDashboardPage() {
	const { userId: clerkId } = await auth();
	if (!clerkId) redirect("/sign-in");

	const user = await ensureUserInDb();
	if (!user) redirect("/sign-in");

	const fid = user.id;

	/* ── 1. Find assigned student IDs ── */
	const assignments = await prisma.facultyStudentAssignment.findMany({
		where: { facultyId: fid },
		select: { studentId: true },
	});
	const studentIds = [...new Set(assignments.map((a) => a.studentId))];

	/* ── 2. Get student profiles ── */
	const studentProfiles = await prisma.user.findMany({
		where: { id: { in: studentIds } },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
		},
	});

	/* ── 3. Count entries per student (all modules combined) ── */
	const studentSummaries = await Promise.all(
		studentProfiles.map(async (s) => {
			const [
				cases,
				procs,
				csA,
				csP,
				diag,
				img,
				cp,
				sem,
				jc,
				transport,
				consent,
				badNews,
			] = await Promise.all([
				prisma.caseManagementLog.count({ where: { userId: s.id } }),
				prisma.procedureLog.count({ where: { userId: s.id } }),
				prisma.clinicalSkillAdult.count({ where: { userId: s.id } }),
				prisma.clinicalSkillPediatric.count({ where: { userId: s.id } }),
				prisma.diagnosticSkill.count({ where: { userId: s.id } }),
				prisma.imagingLog.count({ where: { userId: s.id } }),
				prisma.casePresentation.count({ where: { userId: s.id } }),
				prisma.seminar.count({ where: { userId: s.id } }),
				prisma.journalClub.count({ where: { userId: s.id } }),
				prisma.transportLog.count({ where: { userId: s.id } }),
				prisma.consentLog.count({ where: { userId: s.id } }),
				prisma.badNewsLog.count({ where: { userId: s.id } }),
			]);
			const total =
				cases +
				procs +
				csA +
				csP +
				diag +
				img +
				cp +
				sem +
				jc +
				transport +
				consent +
				badNews;

			const [signedCases, signedProcs] = await Promise.all([
				prisma.caseManagementLog.count({
					where: { userId: s.id, status: "SIGNED" as never },
				}),
				prisma.procedureLog.count({
					where: { userId: s.id, status: "SIGNED" as never },
				}),
			]);
			const signed = signedCases + signedProcs;

			const [pendingCases, pendingProcs] = await Promise.all([
				prisma.caseManagementLog.count({
					where: { userId: s.id, status: "SUBMITTED" as never },
				}),
				prisma.procedureLog.count({
					where: { userId: s.id, status: "SUBMITTED" as never },
				}),
			]);
			const pending = pendingCases + pendingProcs;

			return {
				id: s.id,
				name: `${s.firstName} ${s.lastName}`,
				batch: s.batch,
				semester: s.currentSemester ?? 1,
				totalEntries: total,
				signedEntries: signed,
				pendingEntries: pending,
			};
		}),
	);

	/* ── 4. Collect pending entries across main modules ── */
	const where = {
		userId: { in: studentIds },
		status: "SUBMITTED" as never,
	};

	const [pendCases, pendProcs, pendDiag, pendImg, pendClin, pendClinP] =
		await Promise.all([
			prisma.caseManagementLog.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 20,
				select: {
					id: true,
					category: true,
					caseSubCategory: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.procedureLog.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 15,
				select: {
					id: true,
					procedureCategory: true,
					procedureDescription: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.diagnosticSkill.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					diagnosticCategory: true,
					skillName: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.imagingLog.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					imagingCategory: true,
					procedureDescription: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.clinicalSkillAdult.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					skillName: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.clinicalSkillPediatric.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					skillName: true,
					status: true,
					updatedAt: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
		]);

	const fmt = (d: Date) =>
		d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

	const pendingEntries = [
		...pendCases.map((c) => ({
			id: c.id,
			studentName: `${c.user.firstName} ${c.user.lastName}`,
			module: "Case Mgmt",
			title: c.caseSubCategory || c.category,
			status: c.status,
			date: fmt(c.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...pendProcs.map((p) => ({
			id: p.id,
			studentName: `${p.user.firstName} ${p.user.lastName}`,
			module: "Procedure",
			title: p.procedureDescription || p.procedureCategory,
			status: p.status,
			date: fmt(p.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...pendDiag.map((d) => ({
			id: d.id,
			studentName: `${d.user.firstName} ${d.user.lastName}`,
			module: "Diagnostics",
			title: d.skillName || d.diagnosticCategory,
			status: d.status,
			date: fmt(d.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...pendImg.map((i) => ({
			id: i.id,
			studentName: `${i.user.firstName} ${i.user.lastName}`,
			module: "Imaging",
			title: i.procedureDescription || i.imagingCategory,
			status: i.status,
			date: fmt(i.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...pendClin.map((c) => ({
			id: c.id,
			studentName: `${c.user.firstName} ${c.user.lastName}`,
			module: "Clinical (Adult)",
			title: c.skillName,
			status: c.status,
			date: fmt(c.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...pendClinP.map((c) => ({
			id: c.id,
			studentName: `${c.user.firstName} ${c.user.lastName}`,
			module: "Clinical (Ped.)",
			title: c.skillName,
			status: c.status,
			date: fmt(c.updatedAt),
			href: "/dashboard/faculty/students",
		})),
	]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 15);

	/* ── 5. Module-level pending counts ── */
	const [mpCases, mpProcs, mpDiag, mpImg, mpClin, mpClinP] = await Promise.all([
		prisma.caseManagementLog.count({ where }),
		prisma.procedureLog.count({ where }),
		prisma.diagnosticSkill.count({ where }),
		prisma.imagingLog.count({ where }),
		prisma.clinicalSkillAdult.count({ where }),
		prisma.clinicalSkillPediatric.count({ where }),
	]);

	const modulePending = [
		{ module: "Cases", count: mpCases },
		{ module: "Procedures", count: mpProcs },
		{ module: "Diagnostics", count: mpDiag },
		{ module: "Imaging", count: mpImg },
		{ module: "Clinical", count: mpClin + mpClinP },
	];

	const totalPending = modulePending.reduce((s, m) => s + m.count, 0);

	/* ── 6. Signed this month ── */
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const [signedCasesMonth, signedProcsMonth] = await Promise.all([
		prisma.caseManagementLog.count({
			where: {
				userId: { in: studentIds },
				status: "SIGNED" as never,
				updatedAt: { gte: monthStart },
			},
		}),
		prisma.procedureLog.count({
			where: {
				userId: { in: studentIds },
				status: "SIGNED" as never,
				updatedAt: { gte: monthStart },
			},
		}),
	]);
	const signedThisMonth = signedCasesMonth + signedProcsMonth;

	/* ── 7. Needs revision count ── */
	const [nrCases, nrProcs] = await Promise.all([
		prisma.caseManagementLog.count({
			where: {
				userId: { in: studentIds },
				status: "NEEDS_REVISION" as never,
			},
		}),
		prisma.procedureLog.count({
			where: {
				userId: { in: studentIds },
				status: "NEEDS_REVISION" as never,
			},
		}),
	]);
	const needsRevision = nrCases + nrProcs;

	/* ── 8. Recent sign-offs ── */
	const [recentSignedCases, recentSignedProcs] = await Promise.all([
		prisma.caseManagementLog.findMany({
			where: {
				userId: { in: studentIds },
				status: "SIGNED" as never,
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				category: true,
				caseSubCategory: true,
				status: true,
				updatedAt: true,
				user: { select: { firstName: true, lastName: true } },
			},
		}),
		prisma.procedureLog.findMany({
			where: {
				userId: { in: studentIds },
				status: "SIGNED" as never,
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: {
				id: true,
				procedureCategory: true,
				procedureDescription: true,
				status: true,
				updatedAt: true,
				user: { select: { firstName: true, lastName: true } },
			},
		}),
	]);

	const recentSignoffs = [
		...recentSignedCases.map((c) => ({
			id: c.id,
			studentName: `${c.user.firstName} ${c.user.lastName}`,
			module: "Case",
			title: c.caseSubCategory || c.category,
			status: c.status,
			date: fmt(c.updatedAt),
			href: "/dashboard/faculty/students",
		})),
		...recentSignedProcs.map((p) => ({
			id: p.id,
			studentName: `${p.user.firstName} ${p.user.lastName}`,
			module: "Procedure",
			title: p.procedureDescription || p.procedureCategory,
			status: p.status,
			date: fmt(p.updatedAt),
			href: "/dashboard/faculty/students",
		})),
	]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 6);

	/* ── Build payload ── */
	const data: FacultyDashboardData = {
		facultyName: `${user.firstName} ${user.lastName}`,
		assignedStudents: studentIds.length,
		pendingReviews: totalPending,
		signedThisMonth,
		needsRevision,
		pendingEntries,
		students: studentSummaries,
		modulePending,
		recentSignoffs,
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Faculty Dashboard"
				description="Review and sign-off student logbook entries"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Faculty" },
				]}
			/>
			<FacultyDashboardClient data={JSON.parse(JSON.stringify(data))} />
		</div>
	);
}
