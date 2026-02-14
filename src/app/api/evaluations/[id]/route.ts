/**
 * @module EvaluationByIdAPI
 * @description API route for individual evaluation CRUD.
 * GET: Get single evaluation
 * PATCH: Update evaluation (scores, marks, status)
 *
 * @see prisma/schema.prisma — ResidentEvaluation model
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id } = await params;
		const role = (sessionClaims?.metadata as { role?: string })?.role;

		const evaluation = await prisma.residentEvaluation.findUnique({
			where: { id },
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

		if (!evaluation) {
			return NextResponse.json(
				{ error: "Evaluation not found" },
				{ status: 404 },
			);
		}

		// Access control
		if (role === "student" && evaluation.userId !== userId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		if (role === "faculty") {
			const assignment = await prisma.facultyStudentAssignment.findFirst({
				where: { facultyId: userId, studentId: evaluation.userId },
			});
			if (!assignment) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		return NextResponse.json(evaluation);
	} catch (error) {
		console.error("[EVALUATION_GET_ID]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id } = await params;
		const role = (sessionClaims?.metadata as { role?: string })?.role;
		const body = await req.json();

		const existing = await prisma.residentEvaluation.findUnique({
			where: { id },
		});

		if (!existing) {
			return NextResponse.json(
				{ error: "Evaluation not found" },
				{ status: 404 },
			);
		}

		// Students can only update their own drafts (description, roleInActivity)
		if (role === "student") {
			if (existing.userId !== userId) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
			if (existing.status === ("SIGNED" as never)) {
				return NextResponse.json(
					{ error: "Cannot edit signed entry" },
					{ status: 400 },
				);
			}

			const entry = await prisma.residentEvaluation.update({
				where: { id },
				data: {
					description: body.description ?? existing.description,
					roleInActivity: body.roleInActivity ?? existing.roleInActivity,
					status: body.status ?? existing.status,
				},
			});
			return NextResponse.json(entry);
		}

		// Faculty/HOD can update scores, marks, status, remark
		if (role === "faculty" || role === "hod") {
			const updateData: Record<string, unknown> = {};

			if (body.knowledgeScore !== undefined)
				updateData.knowledgeScore = body.knowledgeScore;
			if (body.clinicalSkillScore !== undefined)
				updateData.clinicalSkillScore = body.clinicalSkillScore;
			if (body.proceduralSkillScore !== undefined)
				updateData.proceduralSkillScore = body.proceduralSkillScore;
			if (body.softSkillScore !== undefined)
				updateData.softSkillScore = body.softSkillScore;
			if (body.researchScore !== undefined)
				updateData.researchScore = body.researchScore;
			if (body.theoryMarks !== undefined)
				updateData.theoryMarks = body.theoryMarks;
			if (body.practicalMarks !== undefined)
				updateData.practicalMarks = body.practicalMarks;
			if (body.facultyRemark !== undefined)
				updateData.facultyRemark = body.facultyRemark;
			if (body.status !== undefined) updateData.status = body.status;

			const entry = await prisma.residentEvaluation.update({
				where: { id },
				data: updateData,
			});
			return NextResponse.json(entry);
		}

		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	} catch (error) {
		console.error("[EVALUATION_PATCH_ID]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
