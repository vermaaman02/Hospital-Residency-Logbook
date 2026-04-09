/**
 * @module RotationPostingConfigurationAPI
 * @description API for managing rotation posting enablement by HOD.
 * GET: Fetch configurations for batch/semester/department
 * POST: Create or update configuration
 *
 * @see copilot-instructions.md — Section 10
 * @see prisma/schema.prisma — RotationPostingConfiguration model
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for configuration updates
const rotationConfigSchema = z.object({
	rotationSlNo: z.number().min(1).max(20),
	batchId: z.string().min(1),
	semester: z.number().min(1).max(6),
	departmentId: z.string().min(1),
	isEnabled: z.boolean(),
});

/**
 * GET /api/rotation-posting-config
 * Fetch all rotation posting configurations for a specific batch/semester/department
 * Query params:
 * - batchId: required
 * - semester: required (1-6)
 * - departmentId: required
 */
export async function GET(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as Record<string, unknown>)?.role as
			| string
			| undefined;

		// Only HOD can view configurations
		if (role !== "hod")
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });

		const { searchParams } = new URL(req.url);
		const batchId = searchParams.get("batchId");
		const semester = searchParams.get("semester");
		const departmentId = searchParams.get("departmentId");

		if (!batchId || !semester || !departmentId) {
			return NextResponse.json(
				{ error: "batchId, semester, and departmentId are required" },
				{ status: 400 },
			);
		}

		const configs = await prisma.rotationPostingConfiguration.findMany({
			where: {
				batchId,
				semester: parseInt(semester, 10),
				departmentId,
			},
			include: {
				batch: { select: { name: true } },
				department: { select: { name: true } },
			},
			orderBy: { rotationSlNo: "asc" },
		});

		return NextResponse.json(configs);
	} catch (error) {
		console.error("[ROTATION_CONFIG_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/rotation-posting-config
 * Create or update rotation posting configuration
 * Body: {
 *   rotationSlNo: number (1-20),
 *   batchId: string,
 *   semester: number (1-6),
 *   departmentId: string,
 *   isEnabled: boolean
 * }
 */
export async function POST(req: NextRequest) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as Record<string, unknown>)?.role as
			| string
			| undefined;

		// Only HOD can create/update configurations
		if (role !== "hod")
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });

		const body = await req.json();
		const validated = rotationConfigSchema.parse(body);

		// Use upsert to create or update
		const config = await prisma.rotationPostingConfiguration.upsert({
			where: {
				rotationSlNo_batchId_semester_departmentId: {
					rotationSlNo: validated.rotationSlNo,
					batchId: validated.batchId,
					semester: validated.semester,
					departmentId: validated.departmentId,
				},
			},
			update: {
				isEnabled: validated.isEnabled,
				updatedAt: new Date(),
			},
			create: {
				rotationSlNo: validated.rotationSlNo,
				batchId: validated.batchId,
				semester: validated.semester,
				departmentId: validated.departmentId,
				isEnabled: validated.isEnabled,
			},
			include: {
				batch: { select: { name: true } },
				department: { select: { name: true } },
			},
		});

		return NextResponse.json(config, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 },
			);
		}
		console.error("[ROTATION_CONFIG_POST]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
