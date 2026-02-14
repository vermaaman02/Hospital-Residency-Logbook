/**
 * @module EvaluationsAPI
 * @description API routes for resident evaluations (I1-I3).
 * GET: List evaluations (role-scoped)
 * POST: Create periodic review entry
 *
 * @see PG Logbook .md — "RESIDENT EVALUATION" sections
 * @see roadmap.md — Section 8, evaluations routes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { residentEvaluationSchema } from "@/lib/validators/evaluation";
import { z } from "zod";

export async function GET(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as { role?: string })?.role;
		const { searchParams } = new URL(req.url);
		const studentId = searchParams.get("studentId");
		const semester = searchParams.get("semester");

		const where: Record<string, unknown> = {};

		if (role === "student") {
			where.userId = userId;
		} else if (role === "faculty") {
			if (studentId) {
				// Verify faculty has access to this student
				const assignment = await prisma.facultyStudentAssignment.findFirst({
					where: { facultyId: userId, studentId },
				});
				if (!assignment) {
					return NextResponse.json({ error: "Forbidden" }, { status: 403 });
				}
				where.userId = studentId;
			} else {
				const assignments = await prisma.facultyStudentAssignment.findMany({
					where: { facultyId: userId },
					select: { studentId: true },
				});
				where.userId = { in: assignments.map((a) => a.studentId) };
			}
		} else if (role === "hod") {
			if (studentId) where.userId = studentId;
		}

		if (semester) where.semester = parseInt(semester, 10);

		const evaluations = await prisma.residentEvaluation.findMany({
			where,
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

		return NextResponse.json(evaluations);
	} catch (error) {
		console.error("[EVALUATIONS_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const body = await req.json();
		const validated = residentEvaluationSchema.parse(body);

		// Check for duplicate
		const existing = await prisma.residentEvaluation.findFirst({
			where: {
				userId,
				semester: validated.semester,
				reviewNo: validated.reviewNo,
			},
		});

		if (existing) {
			return NextResponse.json(
				{
					error: `Review ${validated.reviewNo} for Semester ${validated.semester} already exists`,
				},
				{ status: 409 },
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

		return NextResponse.json(entry, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues }, { status: 400 });
		}
		console.error("[EVALUATIONS_POST]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
