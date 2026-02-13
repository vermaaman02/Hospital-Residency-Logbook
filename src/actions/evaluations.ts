/**
 * @module Evaluation Actions
 * @description Server actions for I1 (Periodic Logbook Review), I2 (Evaluation Graph),
 *              I3 (End Semester Assessment).
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 * @see prisma/schema.prisma — ResidentEvaluation model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	residentEvaluationSchema,
	type ResidentEvaluationInput,
} from "@/lib/validators/evaluation";
import { revalidatePath } from "next/cache";

function revalidateEvaluations() {
	revalidatePath("/dashboard/student/evaluations");
	revalidatePath("/dashboard/faculty/evaluations");
	revalidatePath("/dashboard/hod/evaluations");
}

// ═══════════════ I1: PERIODIC LOGBOOK REVIEW (Student creates) ═══════════════

export async function createPeriodicReview(data: ResidentEvaluationInput) {
	const userId = await requireAuth();
	const validated = residentEvaluationSchema.parse(data);

	// Check if review already exists for this semester + reviewNo
	const existing = await prisma.residentEvaluation.findFirst({
		where: {
			userId,
			semester: validated.semester,
			reviewNo: validated.reviewNo,
		},
	});

	if (existing) {
		throw new Error(
			`Review ${validated.reviewNo} for Semester ${validated.semester} already exists`,
		);
	}

	const entry = await prisma.residentEvaluation.create({
		data: {
			userId,
			semester: validated.semester,
			reviewNo: validated.reviewNo,
			description: validated.description ?? null,
			roleInActivity: validated.roleInActivity ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

export async function updatePeriodicReview(
	id: string,
	data: ResidentEvaluationInput,
) {
	const userId = await requireAuth();
	const validated = residentEvaluationSchema.parse(data);

	const existing = await prisma.residentEvaluation.findFirst({
		where: { id, userId },
	});

	if (!existing) throw new Error("Evaluation not found");
	if (existing.status === ("SIGNED" as never)) {
		throw new Error("Cannot edit a signed evaluation");
	}

	const entry = await prisma.residentEvaluation.update({
		where: { id },
		data: {
			description: validated.description ?? null,
			roleInActivity: validated.roleInActivity ?? null,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

export async function submitPeriodicReview(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.residentEvaluation.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Evaluation not found");

	const entry = await prisma.residentEvaluation.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateEvaluations();
	return { success: true, entry };
}

export async function deletePeriodicReview(id: string) {
	const userId = await requireAuth();

	const existing = await prisma.residentEvaluation.findFirst({
		where: { id, userId },
	});
	if (!existing) throw new Error("Evaluation not found");
	if (existing.status !== ("DRAFT" as never)) {
		throw new Error("Only draft evaluations can be deleted");
	}

	await prisma.residentEvaluation.delete({ where: { id } });
	revalidateEvaluations();
	return { success: true };
}

// ═══════════════ GET EVALUATIONS (Multiple roles) ═══════════════

export async function getMyEvaluations() {
	const userId = await requireAuth();

	const evaluations = await prisma.residentEvaluation.findMany({
		where: { userId },
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
	});

	return evaluations;
}

export async function getStudentEvaluations(studentId: string) {
	await requireRole(["faculty", "hod"]);

	const evaluations = await prisma.residentEvaluation.findMany({
		where: { userId: studentId },
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
	});

	return evaluations;
}

export async function getAllStudentEvaluations() {
	await requireRole(["hod"]);

	const evaluations = await prisma.residentEvaluation.findMany({
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					batch: true,
					currentSemester: true,
				},
			},
		},
	});

	return evaluations;
}

// ═══════════════ I2: EVALUATION SCORES (Faculty fills) ═══════════════

export async function setEvaluationScores(
	evaluationId: string,
	scores: {
		knowledgeScore: number;
		clinicalSkillScore: number;
		proceduralSkillScore: number;
		softSkillScore: number;
		researchScore: number;
	},
) {
	await requireRole(["faculty", "hod"]);

	// Validate scores 1-5
	for (const [key, val] of Object.entries(scores)) {
		if (val < 1 || val > 5) {
			throw new Error(`${key} must be between 1 and 5`);
		}
	}

	const entry = await prisma.residentEvaluation.update({
		where: { id: evaluationId },
		data: {
			knowledgeScore: scores.knowledgeScore,
			clinicalSkillScore: scores.clinicalSkillScore,
			proceduralSkillScore: scores.proceduralSkillScore,
			softSkillScore: scores.softSkillScore,
			researchScore: scores.researchScore,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

// ═══════════════ I3: END SEMESTER ASSESSMENT (Faculty fills) ═══════════════

export async function setEndSemesterAssessment(
	evaluationId: string,
	data: {
		theoryMarks: string;
		practicalMarks: string;
	},
) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.residentEvaluation.update({
		where: { id: evaluationId },
		data: {
			theoryMarks: data.theoryMarks,
			practicalMarks: data.practicalMarks,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

// ═══════════════ SIGN / REJECT (Faculty/HOD) ═══════════════

export async function signEvaluation(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.residentEvaluation.update({
		where: { id },
		data: {
			status: "SIGNED" as never,
			facultyRemark: _remark ?? null,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

export async function rejectEvaluation(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	if (!remark || remark.trim().length === 0) {
		throw new Error("Remark is required when rejecting");
	}

	const entry = await prisma.residentEvaluation.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION" as never,
			facultyRemark: remark,
		},
	});

	revalidateEvaluations();
	return { success: true, entry };
}

// ═══════════════ GRAPH DATA (for Recharts) ═══════════════

export async function getEvaluationGraphData(studentId: string) {
	const { role, userId } = await requireRole(["student", "faculty", "hod"]);

	// Students can only see their own
	const targetId = role === "student" ? userId : studentId;

	const evaluations = await prisma.residentEvaluation.findMany({
		where: {
			userId: targetId,
			knowledgeScore: { not: null },
		},
		orderBy: [{ semester: "asc" }, { reviewNo: "asc" }],
		select: {
			semester: true,
			reviewNo: true,
			knowledgeScore: true,
			clinicalSkillScore: true,
			proceduralSkillScore: true,
			softSkillScore: true,
			researchScore: true,
			theoryMarks: true,
			practicalMarks: true,
		},
	});

	// Group by semester — average if 2 reviews per sem
	const semesterData = [];
	for (let sem = 1; sem <= 6; sem++) {
		const semEvals = evaluations.filter((e) => e.semester === sem);
		if (semEvals.length === 0) {
			semesterData.push({
				semester: `Sem ${sem}`,
				Knowledge: 0,
				"Clinical Skills": 0,
				"Procedural Skills": 0,
				"Soft Skills": 0,
				Research: 0,
				theoryMarks: null,
				practicalMarks: null,
			});
			continue;
		}

		const avg = (field: keyof (typeof semEvals)[0]) => {
			const vals = semEvals
				.map((e) => e[field])
				.filter((v): v is number => typeof v === "number");
			return vals.length > 0 ?
					Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
				:	0;
		};

		// Take most recent end-semester assessment
		const lastEval = semEvals[semEvals.length - 1];

		semesterData.push({
			semester: `Sem ${sem}`,
			Knowledge: avg("knowledgeScore"),
			"Clinical Skills": avg("clinicalSkillScore"),
			"Procedural Skills": avg("proceduralSkillScore"),
			"Soft Skills": avg("softSkillScore"),
			Research: avg("researchScore"),
			theoryMarks: lastEval?.theoryMarks ?? null,
			practicalMarks: lastEval?.practicalMarks ?? null,
		});
	}

	return semesterData;
}

// ═══════════════ ANALYTICS DATA ═══════════════

export async function getStudentProgressSummary(studentId?: string) {
	const { role, userId } = await requireRole(["student", "faculty", "hod"]);
	const targetId = studentId && role !== "student" ? studentId : userId;

	const [
		caseCount,
		procedureCount,
		diagnosticCount,
		imagingCount,
		academicCount,
		evaluationCount,
	] = await Promise.all([
		prisma.caseManagementLog.count({ where: { userId: targetId } }),
		prisma.procedureLog.count({ where: { userId: targetId } }),
		prisma.diagnosticSkill.count({ where: { userId: targetId } }),
		prisma.imagingLog.count({ where: { userId: targetId } }),
		Promise.all([
			prisma.casePresentation.count({ where: { userId: targetId } }),
			prisma.seminar.count({ where: { userId: targetId } }),
			prisma.journalClub.count({ where: { userId: targetId } }),
		]).then((counts) => counts.reduce((a, b) => a + b, 0)),
		prisma.residentEvaluation.count({
			where: { userId: targetId, status: "SIGNED" as never },
		}),
	]);

	const signedCases = await prisma.caseManagementLog.count({
		where: { userId: targetId, status: "SIGNED" as never },
	});
	const signedProcedures = await prisma.procedureLog.count({
		where: { userId: targetId, status: "SIGNED" as never },
	});

	return {
		totalCases: caseCount,
		totalProcedures: procedureCount,
		totalDiagnostics: diagnosticCount,
		totalImaging: imagingCount,
		totalAcademics: academicCount,
		signedEvaluations: evaluationCount,
		signedCases,
		signedProcedures,
		signOffRate:
			caseCount + procedureCount > 0 ?
				Math.round(
					((signedCases + signedProcedures) / (caseCount + procedureCount)) *
						100,
				)
			:	0,
	};
}

export async function getDepartmentAnalytics() {
	await requireRole(["hod"]);

	const students = await prisma.user.findMany({
		where: { role: "STUDENT" as never },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batch: true,
			currentSemester: true,
		},
	});

	// Aggregate per student
	const studentStats = await Promise.all(
		students.map(async (student) => {
			const [caseCount, procedureCount, signedEvals] = await Promise.all([
				prisma.caseManagementLog.count({ where: { userId: student.id } }),
				prisma.procedureLog.count({ where: { userId: student.id } }),
				prisma.residentEvaluation.count({
					where: { userId: student.id, status: "SIGNED" as never },
				}),
			]);

			return {
				...student,
				totalCases: caseCount,
				totalProcedures: procedureCount,
				signedEvaluations: signedEvals,
				totalLogs: caseCount + procedureCount,
			};
		}),
	);

	// Department totals
	const totalStudents = students.length;
	const totalCases = studentStats.reduce((a, s) => a + s.totalCases, 0);
	const totalProcedures = studentStats.reduce(
		(a, s) => a + s.totalProcedures,
		0,
	);
	const totalLogs = totalCases + totalProcedures;

	return {
		totalStudents,
		totalCases,
		totalProcedures,
		totalLogs,
		students: studentStats,
	};
}
