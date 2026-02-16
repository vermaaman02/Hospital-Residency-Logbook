/**
 * @module HodDashboard
 * @description Main landing page for HOD. Shows department-wide overview
 * with faculty workload, student leaderboard, module distribution, and activity.
 *
 * @see roadmap.md — Section 6, Module C
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import {
	HodDashboardClient,
	type HodDashboardData,
} from "./HodDashboardClient";

export default async function HodDashboardPage() {
	const { userId: clerkId } = await auth();
	if (!clerkId) redirect("/sign-in");

	const user = await ensureUserInDb();
	if (!user) redirect("/sign-in");

	/* ── 1. Department counts ── */
	const [totalStudents, totalFaculty] = await Promise.all([
		prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
		prisma.user.count({ where: { role: "FACULTY", status: "ACTIVE" } }),
	]);

	/* ── 2. Global entry counts (main modules) ── */
	const [
		cases,
		procs,
		diag,
		img,
		clinA,
		clinP,
		cp,
		sem,
		jc,
		transport,
		consent,
		badNews,
	] = await Promise.all([
		prisma.caseManagementLog.count(),
		prisma.procedureLog.count(),
		prisma.diagnosticSkill.count(),
		prisma.imagingLog.count(),
		prisma.clinicalSkillAdult.count(),
		prisma.clinicalSkillPediatric.count(),
		prisma.casePresentation.count(),
		prisma.seminar.count(),
		prisma.journalClub.count(),
		prisma.transportLog.count(),
		prisma.consentLog.count(),
		prisma.badNewsLog.count(),
	]);
	const totalEntries =
		cases +
		procs +
		diag +
		img +
		clinA +
		clinP +
		cp +
		sem +
		jc +
		transport +
		consent +
		badNews;

	/* signed / pending / needs‑revision */
	const [totalSigned, totalPending, totalNeedsRevision] = await Promise.all([
		Promise.all([
			prisma.caseManagementLog.count({ where: { status: "SIGNED" as never } }),
			prisma.procedureLog.count({ where: { status: "SIGNED" as never } }),
		]).then((a) => a.reduce((s, n) => s + n, 0)),

		Promise.all([
			prisma.caseManagementLog.count({
				where: { status: "SUBMITTED" as never },
			}),
			prisma.procedureLog.count({ where: { status: "SUBMITTED" as never } }),
			prisma.diagnosticSkill.count({ where: { status: "SUBMITTED" as never } }),
			prisma.imagingLog.count({ where: { status: "SUBMITTED" as never } }),
		]).then((a) => a.reduce((s, n) => s + n, 0)),

		Promise.all([
			prisma.caseManagementLog.count({
				where: { status: "NEEDS_REVISION" as never },
			}),
			prisma.procedureLog.count({
				where: { status: "NEEDS_REVISION" as never },
			}),
		]).then((a) => a.reduce((s, n) => s + n, 0)),
	]);

	/* ── 3. Signed this month & growth ── */
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);
	const prevMonthStart = new Date(monthStart);
	prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

	const [thisMonthCases, thisMonthProcs, prevMonthCases, prevMonthProcs] =
		await Promise.all([
			prisma.caseManagementLog.count({
				where: { status: "SIGNED" as never, updatedAt: { gte: monthStart } },
			}),
			prisma.procedureLog.count({
				where: { status: "SIGNED" as never, updatedAt: { gte: monthStart } },
			}),
			prisma.caseManagementLog.count({
				where: { createdAt: { gte: prevMonthStart, lt: monthStart } },
			}),
			prisma.procedureLog.count({
				where: { createdAt: { gte: prevMonthStart, lt: monthStart } },
			}),
		]);
	const signedThisMonth = thisMonthCases + thisMonthProcs;

	const thisMonthEntries = await Promise.all([
		prisma.caseManagementLog.count({
			where: { createdAt: { gte: monthStart } },
		}),
		prisma.procedureLog.count({ where: { createdAt: { gte: monthStart } } }),
	]).then((a) => a.reduce((s, n) => s + n, 0));

	const prevMonthEntries = prevMonthCases + prevMonthProcs;
	const entryGrowthPct =
		prevMonthEntries > 0 ?
			Math.round(
				((thisMonthEntries - prevMonthEntries) / prevMonthEntries) * 100,
			)
		:	0;

	/* ── 4. Faculty workload ── */
	const facultyUsers = await prisma.user.findMany({
		where: { role: "FACULTY", status: "ACTIVE" },
		select: { id: true, firstName: true, lastName: true },
	});

	const faculty = await Promise.all(
		facultyUsers.map(async (f) => {
			const assignedStudents = await prisma.facultyStudentAssignment.count({
				where: { facultyId: f.id },
			});

			const studentIds = (
				await prisma.facultyStudentAssignment.findMany({
					where: { facultyId: f.id },
					select: { studentId: true },
				})
			).map((a) => a.studentId);

			const [pendCases, pendProcs, signedCases, signedProcs] =
				await Promise.all([
					prisma.caseManagementLog.count({
						where: {
							userId: { in: studentIds.length > 0 ? studentIds : ["__none__"] },
							status: "SUBMITTED" as never,
						},
					}),
					prisma.procedureLog.count({
						where: {
							userId: { in: studentIds.length > 0 ? studentIds : ["__none__"] },
							status: "SUBMITTED" as never,
						},
					}),
					prisma.caseManagementLog.count({
						where: {
							userId: { in: studentIds.length > 0 ? studentIds : ["__none__"] },
							status: "SIGNED" as never,
							updatedAt: { gte: monthStart },
						},
					}),
					prisma.procedureLog.count({
						where: {
							userId: { in: studentIds.length > 0 ? studentIds : ["__none__"] },
							status: "SIGNED" as never,
							updatedAt: { gte: monthStart },
						},
					}),
				]);

			return {
				id: f.id,
				name: `${f.firstName} ${f.lastName}`,
				assignedStudents,
				pendingReviews: pendCases + pendProcs,
				signedThisMonth: signedCases + signedProcs,
			};
		}),
	);

	/* ── 5. Top students (by entry count) ── */
	const allStudents = await prisma.user.findMany({
		where: { role: "STUDENT", status: "ACTIVE" },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
		},
	});

	const studentRows = await Promise.all(
		allStudents.map(async (s) => {
			const [eCases, eProcs, sDiag] = await Promise.all([
				prisma.caseManagementLog.count({ where: { userId: s.id } }),
				prisma.procedureLog.count({ where: { userId: s.id } }),
				prisma.diagnosticSkill.count({ where: { userId: s.id } }),
			]);
			const entries = eCases + eProcs + sDiag;
			const [sCases, sProcs] = await Promise.all([
				prisma.caseManagementLog.count({
					where: { userId: s.id, status: "SIGNED" as never },
				}),
				prisma.procedureLog.count({
					where: { userId: s.id, status: "SIGNED" as never },
				}),
			]);
			return {
				id: s.id,
				name: `${s.firstName} ${s.lastName}`,
				batch: s.batch,
				semester: s.currentSemester ?? 1,
				entries,
				signed: sCases + sProcs,
			};
		}),
	);
	const topStudents = studentRows
		.sort((a, b) => b.entries - a.entries)
		.slice(0, 10);

	/* ── 6. Module distribution ── */
	const moduleDistribution = [
		{ module: "Cases", count: cases },
		{ module: "Procedures", count: procs },
		{ module: "Diagnostics", count: diag },
		{ module: "Imaging", count: img },
		{ module: "Clinical", count: clinA + clinP },
		{ module: "Academics", count: cp + sem + jc },
		{ module: "Other", count: transport + consent + badNews },
	];

	/* ── 7. Recent activity ── */
	const fmt = (d: Date) =>
		d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

	const [rCases, rProcs] = await Promise.all([
		prisma.caseManagementLog.findMany({
			orderBy: { updatedAt: "desc" },
			take: 6,
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
			orderBy: { updatedAt: "desc" },
			take: 6,
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

	const recentActivity = [
		...rCases.map((c) => ({
			id: c.id,
			studentName: `${c.user.firstName} ${c.user.lastName}`,
			module: "Case",
			title: c.caseSubCategory || c.category,
			status: c.status,
			date: fmt(c.updatedAt),
		})),
		...rProcs.map((p) => ({
			id: p.id,
			studentName: `${p.user.firstName} ${p.user.lastName}`,
			module: "Procedure",
			title: p.procedureDescription || p.procedureCategory,
			status: p.status,
			date: fmt(p.updatedAt),
		})),
	]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 8);

	/* ── Build payload ── */
	const data: HodDashboardData = {
		hodName: `${user.firstName} ${user.lastName}`,
		totalStudents,
		totalFaculty,
		totalEntries,
		totalSigned,
		totalPending,
		totalNeedsRevision,
		signedThisMonth,
		entryGrowthPct,
		faculty,
		topStudents,
		moduleDistribution,
		recentActivity,
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Department Dashboard"
				description="Department-wide overview — Emergency Medicine"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "HOD" },
				]}
			/>
			<HodDashboardClient data={JSON.parse(JSON.stringify(data))} />
		</div>
	);
}
