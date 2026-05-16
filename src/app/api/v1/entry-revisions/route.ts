/**
 * GET /api/v1/entry-revisions?entityType=<type>&entityId=<id>
 * Returns the full revision/review thread for any logbook entry.
 * Used by the mobile "History" sheet on any entry.
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import { getRevisionsFor } from "@/lib/entry-revisions";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const entityType = url.searchParams.get("entityType");
		const entityId = url.searchParams.get("entityId");

		if (!entityType || !entityId) {
			return err("entityType and entityId query params are required", 400);
		}

		const revisions = await getRevisionsFor(entityType as never, entityId);
		return ok(revisions);
	} catch (e) {
		return handleError(e);
	}
}
