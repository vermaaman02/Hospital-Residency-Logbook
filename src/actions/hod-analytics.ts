/**
 * @module HodAnalytics
 * @description Server actions for HOD department analytics dashboard.
 * Optimized Prisma aggregation queries for KPIs, rotation, attendance,
 * case-management, clinical skills, academics, and faculty insights.
 *
 * @see prisma/schema.prisma — all models
 * @see copilot-instructions.md — Section 10 (API patterns)
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ======================== TYPES ========================

export interface DeltaStat {
	value: number;
	delta: number; // positive = up, negative = down vs prev month
}

export interface OverviewData {
	totalResidents: DeltaStat;
	totalFaculty: number;
	totalLogEntries: DeltaStat;
	pendingApprovals: DeltaStat;
	signedEntries: DeltaStat;
	completionPct: number;
	monthlyTrend: { month: string; entries: number }[];
	statusDistribution: { status: string; count: number }[];
}

export interface RotationData {
	perRotation: { rotation: string; count: number; isElective: boolean }[];
	statusSplit: { status: string; count: number }[];
	electiveCoreCount: { label: string; value: number }[];
}

export interface AttendanceData {
	avgAttendancePct: number;
	belowThreshold: { name: string; pct: number }[];
	weeklyTrend: { week: string; present: number; absent: number }[];
}

export interface CaseManagementData {
	byCategory: { category: string; count: number }[];
	competencyDist: { level: string; count: number }[];
	top5Categories: { category: string; count: number }[];
	monthlyCaseTrend: { month: string; count: number }[];
}

export interface ClinicalSkillsData {
	confidenceDist: { level: string; count: number }[];
	topSkills: { skill: string; count: number }[];
	leastSkills: { skill: string; count: number }[];
}

export interface AcademicsData {
	monthlyParticipation: {
		month: string;
		presentations: number;
		seminars: number;
		journals: number;
	}[];
	perResident: { name: string; total: number }[];
}

export interface FacultyInsightsData {
	perFaculty: {
		name: string;
		signedCount: number;
		pendingCount: number;
		avgResponseDays: number;
	}[];
}

export interface HodAnalyticsBundle {
	overview: OverviewData;
	rotations: RotationData;
	attendance: AttendanceData;
	caseManagement: CaseManagementData;
	clinicalSkills: ClinicalSkillsData;
	academics: AcademicsData;
	facultyInsights: FacultyInsightsData;
}

// ======================== HELPERS ========================

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function monthLabel(d: Date): string {
	return MONTH_NAMES[d.getMonth()] + " " + d.getFullYear();
}

function startOfMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function prevMonthRange(): { gte: Date; lt: Date } {
	const now = new Date();
	const lt = startOfMonth(now);
	const gte = new Date(lt.getFullYear(), lt.getMonth() - 1, 1);
	return { gte, lt };
}

function thisMonthRange(): { gte: Date; lt: Date } {
	const now = new Date();
	const gte = startOfMonth(now);
	const lt = new Date(gte.getFullYear(), gte.getMonth() + 1, 1);
	return { gte, lt };
}

function last12Months(): Date[] {
	const months: Date[] = [];
	const now = new Date();
	for (let i = 11; i >= 0; i--) {
		months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
	}
	return months;
}

const CASE_CATEGORY_LABELS: Record<string, string> = {
	RESUSCITATION: "Resuscitation",
	RESUSCITATION_SPECIAL: "Resuscitation (Special)",
	CARDIOVASCULAR: "Cardiovascular",
	VASCULAR: "Vascular",
	RESPIRATORY: "Respiratory",
	NEUROLOGICAL: "Neurological",
	INFECTIOUS: "Infectious",
	METABOLIC_ENDOCRINE: "Metabolic & Endocrine",
	TOXICOLOGICAL_ENVIRONMENTAL: "Toxicological",
	HEMATOLOGICAL: "Hematological",
	ONCOLOGY_PALLIATIVE: "Oncology & Palliative",
	PSYCHIATRIC_PSYCHOSOCIAL: "Psychiatric",
	GERIATRIC: "Geriatric",
	DERMATOLOGICAL: "Dermatological",
	RHEUMATOLOGICAL_ORTHOPEDIC: "Rheumatology",
	NEPHROLOGY_UROLOGY: "Nephrology",
	GASTROENTEROLOGY_HEPATIC: "Gastroenterology",
	SURGICAL: "Surgical",
	OBSTETRICS_GYNECOLOGICAL: "OB/GYN",
	ENT: "ENT",
	OCULAR: "Ocular",
	TRAUMA: "Trauma",
	FORENSIC_DISASTER: "Forensic & Disaster",
	PEDIATRIC: "Pediatric",
};

const COMPETENCY_LABELS: Record<string, string> = {
	CBD: "CBD",
	S: "Simulation",
	O: "Observed",
	MS: "Managed (Supervised)",
	MI: "Managed (Independent)",
};

const CONFIDENCE_LABELS: Record<string, string> = {
	VC: "Very Confident",
	FC: "Fairly Confident",
	SC: "Slightly Confident",
	NC: "Not Confident",
};

// ======================== MAIN QUERY ========================

export async function getHodAnalytics(): Promise<HodAnalyticsBundle> {
	await requireRole(["hod"]);

	const thisMonth = thisMonthRange();
	const prevMonth = prevMonthRange();
	const months12 = last12Months();

	// ---------- 1. OVERVIEW ----------

	const [totalResidents, totalFaculty, residentsThisMonth, residentsPrevMonth] =
		await Promise.all([
			prisma.user.count({ where: { role: "STUDENT" } }),
			prisma.user.count({ where: { role: { in: ["FACULTY", "HOD"] } } }),
			prisma.user.count({
				where: {
					role: "STUDENT",
					createdAt: { gte: thisMonth.gte, lt: thisMonth.lt },
				},
			}),
			prisma.user.count({
				where: {
					role: "STUDENT",
					createdAt: { gte: prevMonth.gte, lt: prevMonth.lt },
				},
			}),
		]);

	// Total log entries across all tables
	const [
		caseCnt,
		procCnt,
		diagCnt,
		imgCnt,
		presCnt,
		semCnt,
		jcCnt,
		clinAdultCnt,
		clinPedCnt,
	] = await Promise.all([
		prisma.caseManagementLog.count(),
		prisma.procedureLog.count(),
		prisma.diagnosticSkill.count(),
		prisma.imagingLog.count(),
		prisma.casePresentation.count(),
		prisma.seminar.count(),
		prisma.journalClub.count(),
		prisma.clinicalSkillAdult.count(),
		prisma.clinicalSkillPediatric.count(),
	]);
	const totalLogEntries =
		caseCnt +
		procCnt +
		diagCnt +
		imgCnt +
		presCnt +
		semCnt +
		jcCnt +
		clinAdultCnt +
		clinPedCnt;

	// This month log entries (approximate via createdAt)
	const [caseThisM, procThisM, diagThisM, imgThisM, presThisM] =
		await Promise.all([
			prisma.caseManagementLog.count({
				where: { createdAt: { gte: thisMonth.gte, lt: thisMonth.lt } },
			}),
			prisma.procedureLog.count({
				where: { createdAt: { gte: thisMonth.gte, lt: thisMonth.lt } },
			}),
			prisma.diagnosticSkill.count({
				where: { createdAt: { gte: thisMonth.gte, lt: thisMonth.lt } },
			}),
			prisma.imagingLog.count({
				where: { createdAt: { gte: thisMonth.gte, lt: thisMonth.lt } },
			}),
			prisma.casePresentation.count({
				where: { createdAt: { gte: thisMonth.gte, lt: thisMonth.lt } },
			}),
		]);
	const entriesThisMonth =
		caseThisM + procThisM + diagThisM + imgThisM + presThisM;

	const [casePrevM, procPrevM, diagPrevM, imgPrevM, presPrevM] =
		await Promise.all([
			prisma.caseManagementLog.count({
				where: { createdAt: { gte: prevMonth.gte, lt: prevMonth.lt } },
			}),
			prisma.procedureLog.count({
				where: { createdAt: { gte: prevMonth.gte, lt: prevMonth.lt } },
			}),
			prisma.diagnosticSkill.count({
				where: { createdAt: { gte: prevMonth.gte, lt: prevMonth.lt } },
			}),
			prisma.imagingLog.count({
				where: { createdAt: { gte: prevMonth.gte, lt: prevMonth.lt } },
			}),
			prisma.casePresentation.count({
				where: { createdAt: { gte: prevMonth.gte, lt: prevMonth.lt } },
			}),
		]);
	const entriesPrevMonth =
		casePrevM + procPrevM + diagPrevM + imgPrevM + presPrevM;

	// Pending & signed across main tables
	const statusCounts = await Promise.all([
		prisma.caseManagementLog.groupBy({ by: ["status"], _count: { id: true } }),
		prisma.procedureLog.groupBy({ by: ["status"], _count: { id: true } }),
		prisma.diagnosticSkill.groupBy({ by: ["status"], _count: { id: true } }),
		prisma.imagingLog.groupBy({ by: ["status"], _count: { id: true } }),
		prisma.casePresentation.groupBy({ by: ["status"], _count: { id: true } }),
	]);

	const mergedStatus: Record<string, number> = {};
	for (const table of statusCounts) {
		for (const row of table) {
			mergedStatus[row.status] =
				(mergedStatus[row.status] ?? 0) + row._count.id;
		}
	}

	const pendingNow = mergedStatus["SUBMITTED"] ?? 0;
	const signedNow = mergedStatus["SIGNED"] ?? 0;
	const totalTracked = Object.values(mergedStatus).reduce((a, b) => a + b, 0);
	const completionPct =
		totalTracked > 0 ? Math.round((signedNow / totalTracked) * 100) : 0;

	// Pending & signed this vs prev month (approximate)
	const [pendingThisMonth, pendingPrevMonth, signedThisMonth, signedPrevMonth] =
		await Promise.all([
			prisma.caseManagementLog.count({
				where: {
					status: "SUBMITTED",
					createdAt: { gte: thisMonth.gte, lt: thisMonth.lt },
				},
			}),
			prisma.caseManagementLog.count({
				where: {
					status: "SUBMITTED",
					createdAt: { gte: prevMonth.gte, lt: prevMonth.lt },
				},
			}),
			prisma.caseManagementLog.count({
				where: {
					status: "SIGNED",
					updatedAt: { gte: thisMonth.gte, lt: thisMonth.lt },
				},
			}),
			prisma.caseManagementLog.count({
				where: {
					status: "SIGNED",
					updatedAt: { gte: prevMonth.gte, lt: prevMonth.lt },
				},
			}),
		]);

	// Monthly trend (last 12 months from case management as representative)
	const allCases = await prisma.caseManagementLog.findMany({
		select: { createdAt: true },
		where: { createdAt: { gte: months12[0] } },
	});
	const monthlyTrendMap: Record<string, number> = {};
	for (const m of months12) monthlyTrendMap[monthLabel(m)] = 0;
	for (const c of allCases) {
		const key = monthLabel(new Date(c.createdAt));
		if (key in monthlyTrendMap) monthlyTrendMap[key]++;
	}
	const monthlyTrend = Object.entries(monthlyTrendMap).map(
		([month, entries]) => ({ month, entries }),
	);

	const statusDistribution = Object.entries(mergedStatus).map(
		([status, count]) => ({ status, count }),
	);

	const overview: OverviewData = {
		totalResidents: {
			value: totalResidents,
			delta: residentsThisMonth - residentsPrevMonth,
		},
		totalFaculty,
		totalLogEntries: {
			value: totalLogEntries,
			delta: entriesThisMonth - entriesPrevMonth,
		},
		pendingApprovals: {
			value: pendingNow,
			delta: pendingThisMonth - pendingPrevMonth,
		},
		signedEntries: {
			value: signedNow,
			delta: signedThisMonth - signedPrevMonth,
		},
		completionPct,
		monthlyTrend,
		statusDistribution,
	};

	// ---------- 2. ROTATIONS ----------

	const rotationRows = await prisma.rotationPosting.findMany({
		select: { rotationName: true, isElective: true, status: true },
	});

	const rotMap: Record<string, { count: number; isElective: boolean }> = {};
	const rotStatusMap: Record<string, number> = {};
	let electiveCount = 0;
	let coreCount = 0;
	for (const r of rotationRows) {
		if (!rotMap[r.rotationName])
			rotMap[r.rotationName] = { count: 0, isElective: r.isElective };
		rotMap[r.rotationName].count++;
		rotStatusMap[r.status] = (rotStatusMap[r.status] ?? 0) + 1;
		if (r.isElective) electiveCount++;
		else coreCount++;
	}

	const rotations: RotationData = {
		perRotation: Object.entries(rotMap)
			.map(([rotation, v]) => ({
				rotation,
				count: v.count,
				isElective: v.isElective,
			}))
			.sort((a, b) => b.count - a.count),
		statusSplit: Object.entries(rotStatusMap).map(([status, count]) => ({
			status,
			count,
		})),
		electiveCoreCount: [
			{ label: "Core", value: coreCount },
			{ label: "Elective", value: electiveCount },
		],
	};

	// ---------- 3. ATTENDANCE ----------

	const attendanceSheets = await prisma.attendanceSheet.findMany({
		select: {
			userId: true,
			weekStartDate: true,
			entries: { select: { presentAbsent: true } },
			user: { select: { firstName: true, lastName: true } },
		},
	});

	let totalPresent = 0;
	let totalEntries2 = 0;
	const perStudent: Record<
		string,
		{ name: string; present: number; total: number }
	> = {};
	const weekMap: Record<string, { present: number; absent: number }> = {};

	for (const sheet of attendanceSheets) {
		const sKey = sheet.userId;
		if (!perStudent[sKey]) {
			perStudent[sKey] = {
				name: `${sheet.user.firstName} ${sheet.user.lastName}`,
				present: 0,
				total: 0,
			};
		}
		const wKey = sheet.weekStartDate.toISOString().slice(0, 10);
		if (!weekMap[wKey]) weekMap[wKey] = { present: 0, absent: 0 };

		for (const entry of sheet.entries) {
			if (!entry.presentAbsent) continue;
			totalEntries2++;
			perStudent[sKey].total++;
			if (entry.presentAbsent === "Present") {
				totalPresent++;
				perStudent[sKey].present++;
				weekMap[wKey].present++;
			} else {
				weekMap[wKey].absent++;
			}
		}
	}

	const avgAttendancePct =
		totalEntries2 > 0 ? Math.round((totalPresent / totalEntries2) * 100) : 0;
	const belowThreshold = Object.values(perStudent)
		.map((s) => ({
			name: s.name,
			pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
		}))
		.filter((s) => s.pct < 75)
		.sort((a, b) => a.pct - b.pct);

	const weeklyTrend = Object.entries(weekMap)
		.sort(([a], [b]) => a.localeCompare(b))
		.slice(-12)
		.map(([week, v]) => ({ week, present: v.present, absent: v.absent }));

	const attendanceResult: AttendanceData = {
		avgAttendancePct,
		belowThreshold,
		weeklyTrend,
	};

	// ---------- 4. CASE MANAGEMENT ----------

	const caseByCategory = await prisma.caseManagementLog.groupBy({
		by: ["category"],
		_count: { id: true },
	});

	const caseCompetency = await prisma.caseManagementLog.groupBy({
		by: ["competencyLevel"],
		_count: { id: true },
		where: { competencyLevel: { not: null } },
	});

	const caseMonthlyCounts = await prisma.caseManagementLog.findMany({
		select: { createdAt: true },
		where: { createdAt: { gte: months12[0] } },
	});
	const caseMTMap: Record<string, number> = {};
	for (const m of months12) caseMTMap[monthLabel(m)] = 0;
	for (const c of caseMonthlyCounts) {
		const key = monthLabel(new Date(c.createdAt));
		if (key in caseMTMap) caseMTMap[key]++;
	}

	const byCategory = caseByCategory
		.map((r) => ({
			category: CASE_CATEGORY_LABELS[r.category] ?? r.category,
			count: r._count.id,
		}))
		.sort((a, b) => b.count - a.count);

	const caseManagement: CaseManagementData = {
		byCategory,
		competencyDist: caseCompetency
			.map((r) => ({
				level:
					COMPETENCY_LABELS[r.competencyLevel ?? ""] ??
					r.competencyLevel ??
					"Unknown",
				count: r._count.id,
			}))
			.sort((a, b) => b.count - a.count),
		top5Categories: byCategory.slice(0, 5),
		monthlyCaseTrend: Object.entries(caseMTMap).map(([month, count]) => ({
			month,
			count,
		})),
	};

	// ---------- 5. CLINICAL SKILLS ----------

	const [adultConf, pedConf] = await Promise.all([
		prisma.clinicalSkillAdult.groupBy({
			by: ["confidenceLevel"],
			_count: { id: true },
			where: { confidenceLevel: { not: null } },
		}),
		prisma.clinicalSkillPediatric.groupBy({
			by: ["confidenceLevel"],
			_count: { id: true },
			where: { confidenceLevel: { not: null } },
		}),
	]);

	const confMerged: Record<string, number> = {};
	for (const r of [...adultConf, ...pedConf]) {
		const key = r.confidenceLevel ?? "";
		confMerged[key] = (confMerged[key] ?? 0) + r._count.id;
	}

	const [adultSkills, pedSkills] = await Promise.all([
		prisma.clinicalSkillAdult.groupBy({
			by: ["skillName"],
			_count: { id: true },
			orderBy: { _count: { id: "desc" } },
			take: 10,
		}),
		prisma.clinicalSkillPediatric.groupBy({
			by: ["skillName"],
			_count: { id: true },
			orderBy: { _count: { id: "asc" } },
			take: 10,
		}),
	]);

	const clinicalSkills: ClinicalSkillsData = {
		confidenceDist: Object.entries(confMerged)
			.map(([level, count]) => ({
				level: CONFIDENCE_LABELS[level] ?? level,
				count,
			}))
			.sort((a, b) => b.count - a.count),
		topSkills: adultSkills.map((r) => ({
			skill: r.skillName,
			count: r._count.id,
		})),
		leastSkills: pedSkills.map((r) => ({
			skill: r.skillName,
			count: r._count.id,
		})),
	};

	// ---------- 6. ACADEMICS ----------

	const [presentations, seminars, journals] = await Promise.all([
		prisma.casePresentation.findMany({
			select: {
				createdAt: true,
				userId: true,
				user: { select: { firstName: true, lastName: true } },
			},
			where: { createdAt: { gte: months12[0] } },
		}),
		prisma.seminar.findMany({
			select: {
				createdAt: true,
				userId: true,
				user: { select: { firstName: true, lastName: true } },
			},
			where: { createdAt: { gte: months12[0] } },
		}),
		prisma.journalClub.findMany({
			select: {
				createdAt: true,
				userId: true,
				user: { select: { firstName: true, lastName: true } },
			},
			where: { createdAt: { gte: months12[0] } },
		}),
	]);

	const acadMonthly: Record<
		string,
		{ presentations: number; seminars: number; journals: number }
	> = {};
	for (const m of months12)
		acadMonthly[monthLabel(m)] = { presentations: 0, seminars: 0, journals: 0 };
	for (const p of presentations) {
		const key = monthLabel(new Date(p.createdAt));
		if (key in acadMonthly) acadMonthly[key].presentations++;
	}
	for (const s of seminars) {
		const key = monthLabel(new Date(s.createdAt));
		if (key in acadMonthly) acadMonthly[key].seminars++;
	}
	for (const j of journals) {
		const key = monthLabel(new Date(j.createdAt));
		if (key in acadMonthly) acadMonthly[key].journals++;
	}

	const perResidentMap: Record<string, { name: string; total: number }> = {};
	for (const list of [presentations, seminars, journals]) {
		for (const item of list) {
			if (!perResidentMap[item.userId]) {
				perResidentMap[item.userId] = {
					name: `${item.user.firstName} ${item.user.lastName}`,
					total: 0,
				};
			}
			perResidentMap[item.userId].total++;
		}
	}

	const academics: AcademicsData = {
		monthlyParticipation: Object.entries(acadMonthly).map(([month, v]) => ({
			month,
			...v,
		})),
		perResident: Object.values(perResidentMap).sort(
			(a, b) => b.total - a.total,
		),
	};

	// ---------- 7. FACULTY INSIGHTS ----------

	const sigs = await prisma.digitalSignature.findMany({
		select: {
			signedById: true,
			signedAt: true,
			entityType: true,
			entityId: true,
			signedBy: { select: { firstName: true, lastName: true } },
		},
		where: { signedById: { not: "AUTO_REVIEW" } },
	});

	const facultyMap: Record<
		string,
		{ name: string; signedCount: number; totalDays: number }
	> = {};
	for (const sig of sigs) {
		if (!facultyMap[sig.signedById]) {
			facultyMap[sig.signedById] = {
				name: `${sig.signedBy.firstName} ${sig.signedBy.lastName}`,
				signedCount: 0,
				totalDays: 0,
			};
		}
		facultyMap[sig.signedById].signedCount++;
	}

	// Pending per faculty (submitted entries where facultyId = that faculty)
	const pendingPerFac = await prisma.caseManagementLog.groupBy({
		by: ["facultyId"],
		_count: { id: true },
		where: { status: "SUBMITTED", facultyId: { not: null } },
	});

	const facInsights: FacultyInsightsData["perFaculty"] = [];
	const allFacultyUsers = await prisma.user.findMany({
		where: { role: { in: ["FACULTY", "HOD"] } },
		select: { id: true, firstName: true, lastName: true },
	});

	for (const f of allFacultyUsers) {
		const fData = facultyMap[f.id];
		const pending =
			pendingPerFac.find((p) => p.facultyId === f.id)?._count.id ?? 0;
		facInsights.push({
			name: `${f.firstName} ${f.lastName}`,
			signedCount: fData?.signedCount ?? 0,
			pendingCount: pending,
			avgResponseDays:
				fData ?
					Math.round((fData.totalDays / Math.max(fData.signedCount, 1)) * 10) /
					10
				:	0,
		});
	}

	const facultyInsights: FacultyInsightsData = {
		perFaculty: facInsights.sort((a, b) => b.signedCount - a.signedCount),
	};

	return {
		overview,
		rotations,
		attendance: attendanceResult,
		caseManagement,
		clinicalSkills,
		academics,
		facultyInsights,
	};
}
