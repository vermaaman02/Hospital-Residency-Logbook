/**
 * @module CaseManagementAPI
 * @description CRUD API route for case management log entries.
 * GET: List entries (scoped by role), POST: Create new entry.
 *
 * @see copilot-instructions.md — Section 10
 * @see prisma/schema.prisma — CaseManagementLog model
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { caseManagementSchema } from "@/lib/validators/case-management";
import { z } from "zod";

export async function GET(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as Record<string, unknown>)?.role as
			| string
			| undefined;
		const { searchParams } = new URL(req.url);
		const category = searchParams.get("category");
		const page = parseInt(searchParams.get("page") ?? "1", 10);
		const limit = parseInt(searchParams.get("limit") ?? "20", 10);

		const where: Record<string, unknown> = {};

		// Scope by role
		if (role === "student" || !role) {
			// Find internal user id from clerkId
			const user = await prisma.user.findUnique({
				where: { clerkId: userId },
				select: { id: true },
			});
			if (!user)
				return NextResponse.json({ error: "User not found" }, { status: 404 });
			where.userId = user.id;
		} else if (role === "faculty") {
			const user = await prisma.user.findUnique({
				where: { clerkId: userId },
				select: { id: true },
			});
			if (!user)
				return NextResponse.json({ error: "User not found" }, { status: 404 });
			const assignments = await prisma.facultyStudentAssignment.findMany({
				where: { facultyId: user.id },
				select: { studentId: true },
			});
			where.userId = { in: assignments.map((a) => a.studentId) };
		}
		// HOD: no userId filter

		if (category) where.category = category;

		const [entries, total] = await Promise.all([
			prisma.caseManagementLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: limit,
				skip: (page - 1) * limit,
				include: {
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.caseManagementLog.count({ where }),
		]);

		return NextResponse.json({
			data: entries,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("[CASE_MANAGEMENT_GET]", error);
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

		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { id: true },
		});
		if (!user)
			return NextResponse.json({ error: "User not found" }, { status: 404 });

		const body = await req.json();
		const validated = caseManagementSchema.parse(body);

		// Auto-generate serial number
		const lastEntry = await prisma.caseManagementLog.findFirst({
			where: { userId: user.id, category: validated.category as never },
			orderBy: { slNo: "desc" },
			select: { slNo: true },
		});

		const entry = await prisma.caseManagementLog.create({
			data: {
				...validated,
				category: validated.category as never,
				userId: user.id,
				slNo: (lastEntry?.slNo ?? 0) + 1,
				status: "DRAFT",
			},
		});

		return NextResponse.json(entry, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 },
			);
		}
		console.error("[CASE_MANAGEMENT_POST]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
