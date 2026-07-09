/**
 * GET  /api/v1/thesis          — get current student's thesis details
 * POST /api/v1/thesis          — update, submit, or upsert/submit semester record
 *
 * body.action:
 *   "update"           — update thesis details (fields: topic, chiefGuide)
 *   "submit"           — submit thesis details (fields: id)
 *   "upsert-semester"  — upsert thesis semester record (fields: thesisId, semester, srJrMember, srMember, facultyMember)
 *   "submit-semester"  — submit semester record (fields: id)
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyThesis,
	updateThesis,
	submitThesis,
	upsertThesisSemesterRecord,
	submitSemesterRecord,
} from "@/actions/thesis";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();
		const thesis = await getMyThesis();
		return ok(thesis);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();
		const body = await req.json();
		const { action } = body;

		if (action === "update") {
			const { topic, chiefGuide } = body;
			if (!topic) return err("topic is required", 400);
			const result = await updateThesis({ topic, chiefGuide });
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitThesis(id);
			return ok(result);
		}

		if (action === "upsert-semester") {
			const { thesisId, semester, srJrMember, srMember, facultyMember } = body;
			if (!thesisId) return err("thesisId is required", 400);
			if (typeof semester !== "number") return err("semester number is required", 400);
			const result = await upsertThesisSemesterRecord(thesisId, {
				semester,
				srJrMember: srJrMember ?? null,
				srMember: srMember ?? null,
				facultyMember: facultyMember ?? null,
			});
			return ok(result);
		}

		if (action === "submit-semester") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitSemesterRecord(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
