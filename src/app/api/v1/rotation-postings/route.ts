/**
 * GET  /api/v1/rotation-postings          — list current student's postings
 * POST /api/v1/rotation-postings          — create / submit / delete a posting
 *
 * body.action:
 *   "create"  — create a new posting (fields: rotationName, startDate, endDate, totalDuration, facultyId)
 *   "update"  — update an existing posting (fields: id, ...same)
 *   "submit"  — submit for review (fields: id)
 *   "delete"  — delete a DRAFT (fields: id)
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyRotationPostings,
	createRotationPosting,
	updateRotationPosting,
	submitRotationPosting,
	deleteRotationPosting,
} from "@/actions/rotation-postings";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();
		const postings = await getMyRotationPostings();
		return ok(postings);
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
			const { rotationName, startDate, endDate, totalDuration, facultyId } = body;
			if (!rotationName) return err("rotationName is required", 400);
			const result = await createRotationPosting({
				rotationName,
				isElective: false,
				startDate: startDate ? new Date(startDate) : undefined,
				endDate: endDate ? new Date(endDate) : undefined,
				totalDuration: totalDuration ?? null,
				facultyId: facultyId ?? null,
			});
			return ok(result, 201);
		}

		if (action === "update") {
			const { id, rotationName, startDate, endDate, totalDuration, facultyId } = body;
			if (!id) return err("id is required", 400);
			if (!rotationName) return err("rotationName is required", 400);
			const result = await updateRotationPosting(id, {
				rotationName,
				isElective: false,
				startDate: startDate ? new Date(startDate) : undefined,
				endDate: endDate ? new Date(endDate) : undefined,
				totalDuration: totalDuration ?? null,
				facultyId: facultyId ?? null,
			});
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitRotationPosting(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteRotationPosting(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
