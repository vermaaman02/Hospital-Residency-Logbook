/**
 * @module EvaluationGraphAPI
 * @description GET evaluation graph data for a student.
 * Returns 5-domain x 6-semester data formatted for Recharts.
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION GRAPH"
 * @see roadmap.md — Section 8, evaluations/graph
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as { role?: string })?.role;
		const { searchParams } = new URL(req.url);
		const studentId = searchParams.get("studentId");

		// Determine target student
		let targetId = userId;
		if (role === "faculty" || role === "hod") {
			if (studentId) targetId = studentId;
		}

		if (role === "faculty" && studentId) {
			const assignment = await prisma.facultyStudentAssignment.findFirst({
				where: { facultyId: userId, studentId },
			});
			if (!assignment) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

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

		// Build semester data
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

			const avg = (
				field:
					| "knowledgeScore"
					| "clinicalSkillScore"
					| "proceduralSkillScore"
					| "softSkillScore"
					| "researchScore",
			) => {
				const vals = semEvals
					.map((e) => e[field])
					.filter((v): v is number => typeof v === "number");
				return vals.length > 0 ?
						Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) /
							10
					:	0;
			};

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

		return NextResponse.json(semesterData);
	} catch (error) {
		console.error("[EVALUATION_GRAPH_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
