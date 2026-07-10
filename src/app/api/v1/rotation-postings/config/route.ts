/**
 * GET /api/v1/rotation-postings/config
 * API endpoint to fetch effective rotation posting configurations for the current student.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import { getEnabledRotationsForStudent } from "@/actions/rotation-posting-config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: {
				id: true,
				batchId: true,
				departmentId: true,
				currentSemester: true,
			},
		});

		if (!user) {
			return err("User not found", 404);
		}

		// Resolve Batch (exactly like web student page.tsx)
		const batchById = user.batchId
			? await prisma.batch.findUnique({
					where: { id: user.batchId },
					select: { id: true, currentSemester: true },
			  })
			: null;
		const fallbackBatch = !batchById
			? await prisma.batch.findFirst({
					where: { isActive: true },
					orderBy: { name: "asc" },
					select: { id: true, currentSemester: true },
			  })
			: null;
		const batchId = batchById?.id ?? fallbackBatch?.id;

		// Resolve Department (exactly like web student page.tsx)
		const departmentById = user.departmentId
			? await prisma.department.findUnique({
					where: { id: user.departmentId },
					select: { id: true },
			  })
			: null;
		const fallbackDepartment = !departmentById
			? await prisma.department.findFirst({
					where: { isActive: true },
					orderBy: { name: "asc" },
					select: { id: true },
			  })
			: null;
		const departmentId = departmentById?.id ?? fallbackDepartment?.id;

		// Resolve Semester
		const semester = user.currentSemester ?? batchById?.currentSemester ?? fallbackBatch?.currentSemester ?? 1;

		if (!batchId || !departmentId) {
			return ok([]);
		}

		const configs = await getEnabledRotationsForStudent(
			batchId,
			semester,
			departmentId,
			user.id
		);

		return ok(configs);
	} catch (e) {
		return handleError(e);
	}
}
