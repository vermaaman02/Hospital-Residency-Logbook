/**
 * GET /api/v1/me
 * Returns the authenticated user's profile from the local DB.
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/app/api/v1/_lib/respond";

export async function GET() {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: {
				id: true,
				clerkId: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				batch: true,
				currentSemester: true,
				department: true,
				profileImage: true,
				status: true,
				batchId: true,
				departmentId: true,
				createdAt: true,
				batchRelation: { select: { id: true, name: true, isActive: true } },
				departmentRelation: { select: { id: true, name: true, code: true } },
			},
		});

		if (!user) {
			return ok(null, 404);
		}

		return ok(user);
	} catch (e) {
		return handleError(e);
	}
}
