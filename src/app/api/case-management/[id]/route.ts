/**
 * @module CaseManagementDetailAPI
 * @description GET single, PATCH update, DELETE (soft) a case management log entry.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { caseManagementUpdateSchema } from "@/lib/validators/case-management";
import { z } from "zod";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id } = await params;

		const entry = await prisma.caseManagementLog.findUnique({
			where: { id },
			include: {
				user: { select: { firstName: true, lastName: true, clerkId: true } },
			},
		});

		if (!entry)
			return NextResponse.json({ error: "Not found" }, { status: 404 });

		// Verify ownership or authorized role
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { id: true, role: true },
		});

		if (!user)
			return NextResponse.json({ error: "User not found" }, { status: 404 });

		if (user.role === "STUDENT" && entry.userId !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		return NextResponse.json(entry);
	} catch (error) {
		console.error("[CASE_MANAGEMENT_GET_ID]", error);
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
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id } = await params;
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { id: true },
		});
		if (!user)
			return NextResponse.json({ error: "User not found" }, { status: 404 });

		// Verify ownership
		const existing = await prisma.caseManagementLog.findUnique({
			where: { id },
			select: { userId: true, status: true },
		});

		if (!existing)
			return NextResponse.json({ error: "Not found" }, { status: 404 });

		if (existing.userId !== user.id)
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });

		if (existing.status === "SIGNED")
			return NextResponse.json(
				{ error: "Cannot edit signed entry" },
				{ status: 400 },
			);

		const body = await req.json();
		const validated = caseManagementUpdateSchema.parse(body);

		const updated = await prisma.caseManagementLog.update({
			where: { id },
			data: {
				...validated,
				category: validated.category as never,
			},
		});

		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 },
			);
		}
		console.error("[CASE_MANAGEMENT_PATCH]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
