/**
 * GET  /api/v1/evaluations          — list the current student's evaluations
 * GET  /api/v1/evaluations?view=graph — evaluation graph data (6 semesters)
 * POST /api/v1/evaluations          — create / submit an evaluation
 *
 * body.action:
 *   "create"  — create a new periodic review (fields: semester, reviewNo, description, roleInActivity)
 *   "submit"  — submit for faculty review   (fields: id)
 *   "delete"  — delete a DRAFT evaluation   (fields: id)
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyEvaluations,
	createPeriodicReview,
	submitPeriodicReview,
	deletePeriodicReview,
	getEvaluationGraphData,
} from "@/actions/evaluations";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const view = url.searchParams.get("view");

		if (view === "graph") {
			const studentId = url.searchParams.get("studentId") ?? "";
			const data = await getEvaluationGraphData(studentId);
			return ok(data);
		}

		const evaluations = await getMyEvaluations();
		return ok(evaluations);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const { action } = body;

		if (action === "create") {
			const { semester, reviewNo, description, roleInActivity } = body;
			if (!semester || !reviewNo) {
				return err("semester and reviewNo are required", 400);
			}
			const result = await createPeriodicReview({
				semester: Number(semester),
				reviewNo: Number(reviewNo),
				description: description ?? null,
				roleInActivity: roleInActivity ?? null,
			});
			return ok(result, 201);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitPeriodicReview(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deletePeriodicReview(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
