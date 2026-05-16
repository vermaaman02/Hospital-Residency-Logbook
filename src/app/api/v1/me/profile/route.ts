/**
 * PATCH /api/v1/me/profile
 * Update the authenticated user's display name.
 *
 * Body:
 *   firstName  string
 *   lastName   string
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import { updateProfile } from "@/actions/profile";

export async function PATCH(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const { firstName, lastName } = body as {
			firstName?: string;
			lastName?: string;
		};

		if (!firstName || !lastName) {
			return err("firstName and lastName are required", 400);
		}

		const result = await updateProfile({ firstName, lastName });
		if (!result.success) return err(result.message ?? "Update failed", 400);
		return ok(result);
	} catch (e) {
		return handleError(e);
	}
}
