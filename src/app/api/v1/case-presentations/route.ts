/**
 * GET/POST /api/v1/case-presentations
 * API route wrapper for student case presentations.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyCasePresentations,
	createCasePresentation,
	updateCasePresentation,
	submitCasePresentation,
	deleteCasePresentation,
} from "@/actions/case-presentations";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		await requireAuthHybrid();
		const data = await getMyCasePresentations();
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
			const result = await createCasePresentation(body.data);
			return ok(result);
		}

		if (action === "update") {
			const { id, data } = body;
			if (!id) return err("id is required", 400);
			const result = await updateCasePresentation(id, data);
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitCasePresentation(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteCasePresentation(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
