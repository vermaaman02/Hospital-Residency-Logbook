/**
 * GET /api/v1/faculty/names
 * Returns a list of all active faculty members (role is FACULTY or HOD)
 * for selection dropdowns in the mobile client.
 */

import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/app/api/v1/_lib/respond";

export async function GET() {
	try {
		await requireAuthHybrid();

		const faculty = await prisma.user.findMany({
			where: {
				role: { in: ["FACULTY", "HOD"] },
				status: "ACTIVE",
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
			},
			orderBy: {
				firstName: "asc",
			},
		});

		return ok(faculty);
	} catch (e) {
		return handleError(e);
	}
}
