/**
 * GET  /api/v1/logbook-reviews            — list the current student's logbook reviews
 * POST /api/v1/logbook-reviews            — create / update / submit / delete a review entry
 *
 * body.action:
 *   "add"     — add a new row
 *   "update"  — inline-edit a row (fields: id, reviewNo, date, description, roleInActivity, facultyId)
 *   "submit"  — submit for review (fields: id)
 *   "delete"  — delete a DRAFT   (fields: id)
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyLogbookReviews,
	getMyLogbookReviewSummary,
	addLogbookReviewRow,
	updateLogbookReviewEntry,
	submitLogbookReviewEntry,
	deleteLogbookReviewEntry,
} from "@/actions/logbook-reviews";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const view = url.searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyLogbookReviewSummary();
			return ok(summary);
		}

		const reviews = await getMyLogbookReviews();
		return ok(reviews);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const { action } = body;

		if (action === "add") {
			const result = await addLogbookReviewRow();
			return ok(result, 201);
		}

		if (action === "update") {
			const { id, reviewNo, date, description, roleInActivity, facultyId } = body;
			if (!id) return err("id is required", 400);
			const result = await updateLogbookReviewEntry(id, {
				reviewNo: reviewNo ?? null,
				date: date ?? null,
				description: description ?? null,
				roleInActivity: roleInActivity ?? null,
				facultyId: facultyId ?? null,
			});
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitLogbookReviewEntry(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteLogbookReviewEntry(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
