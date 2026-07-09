/**
 * GET/POST /api/v1/seminars
 * API route wrapper for student seminars.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMySeminarDiscussions,
	createSeminarDiscussion,
	updateSeminarDiscussion,
	submitSeminarDiscussion,
	deleteSeminarDiscussion,
} from "@/actions/seminar-discussions";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		await requireAuthHybrid();
		const data = await getMySeminarDiscussions();
		return ok(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json().catch(() => ({}));
		const { action } = body;

		if (action === "create") {
			const result = await createSeminarDiscussion(body.data);
			return ok(result);
		}

		if (action === "update") {
			const { id, data } = body;
			if (!id) return err("id is required", 400);
			const result = await updateSeminarDiscussion(id, data);
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitSeminarDiscussion(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteSeminarDiscussion(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
