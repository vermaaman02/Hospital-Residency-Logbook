/**
 * GET/POST /api/v1/journal-clubs
 * REST API route wrapper for Journal Clubs module.
 * Serves mobile application and external API clients.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyJournalClubs,
	getJournalClubsForReview,
	getAvailableJournalClubFaculty,
	createJournalClub,
	updateJournalClub,
	submitJournalClub,
	deleteJournalClub,
	signJournalClub,
	rejectJournalClub,
	bulkSignJournalClubs,
} from "@/actions/journal-clubs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const mode = url.searchParams.get("mode");
		const view = url.searchParams.get("view");

		if (view === "faculty") {
			const facultyList = await getAvailableJournalClubFaculty();
			return ok(facultyList);
		}

		if (mode === "review") {
			const reviews = await getJournalClubsForReview();
			return ok(reviews);
		}

		const data = await getMyJournalClubs();
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
			const result = await createJournalClub(body.data);
			return ok(result);
		}

		if (action === "update") {
			const { id, data } = body;
			if (!id) return err("id is required", 400);
			const result = await updateJournalClub(id, data);
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitJournalClub(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteJournalClub(id);
			return ok(result);
		}

		if (action === "sign") {
			const { id, remark } = body;
			if (!id) return err("id is required", 400);
			const result = await signJournalClub(id, remark);
			return ok(result);
		}

		if (action === "reject") {
			const { id, remark } = body;
			if (!id) return err("id is required", 400);
			if (!remark) return err("remark is required for rejection", 400);
			const result = await rejectJournalClub(id, remark);
			return ok(result);
		}

		if (action === "bulk-sign") {
			const { ids } = body;
			if (!Array.isArray(ids) || ids.length === 0) return err("ids array is required", 400);
			const result = await bulkSignJournalClubs(ids);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
