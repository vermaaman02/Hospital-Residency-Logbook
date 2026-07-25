/**
 * GET  /api/v1/procedures?category=<cat>   — list procedure log entries for a category
 * GET  /api/v1/procedures?view=summary       — 49 category summary statistics
 * GET  /api/v1/procedures?mode=review        — faculty review list
 * GET  /api/v1/procedures?mode=faculty-list  — list supervising faculty
 * POST /api/v1/procedures                   — create/update/submit/sign/reject entries
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { err, ok, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyProcedureLogEntries,
	getMyProcedureLogSummary,
	updateProcedureLogEntry,
	submitProcedureLogEntry,
	deleteProcedureLogEntry,
	initializeProcedureLogCategory,
	addProcedureLogRow,
	getAvailableProcedureFaculty,
	getProcedureLogsForReview,
	signProcedureLogEntry,
	rejectProcedureLogEntry,
	bulkSignProcedureLogEntries,
} from "@/actions/procedure-logs";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const category = url.searchParams.get("category");
		const view = url.searchParams.get("view");
		const mode = url.searchParams.get("mode");

		if (mode === "review") {
			const reviewEntries = await getProcedureLogsForReview(category || undefined);
			return ok({ entries: reviewEntries });
		}

		if (mode === "faculty-list") {
			const faculty = await getAvailableProcedureFaculty();
			return ok({ faculty });
		}

		if (view === "summary") {
			const summary = await getMyProcedureLogSummary();
			const faculty = await getAvailableProcedureFaculty();
			return ok({ ...summary, faculty });
		}

		if (!category) {
			const summary = await getMyProcedureLogSummary();
			return ok(summary);
		}

		const entries = await getMyProcedureLogEntries(category);
		return ok({ entries });
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json();
		const { action } = body;

		if (action === "init") {
			const { category } = body;
			if (!category) return err("category is required", 400);
			const result = await initializeProcedureLogCategory(category);
			return ok(result, 201);
		}

		if (action === "add") {
			const { category } = body;
			if (!category) return err("category is required", 400);
			const result = await addProcedureLogRow(category);
			return ok(result, 201);
		}

		if (action === "update") {
			const { id, data, ...rest } = body;
			if (!id) return err("id is required", 400);
			const updateData = data || rest;
			const result = await updateProcedureLogEntry(id, updateData);
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitProcedureLogEntry(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteProcedureLogEntry(id);
			return ok(result);
		}

		if (action === "sign") {
			const { id, remark } = body;
			if (!id) return err("id is required", 400);
			const result = await signProcedureLogEntry(id, remark);
			return ok(result);
		}

		if (action === "reject") {
			const { id, remark } = body;
			if (!id || !remark) return err("id and remark are required", 400);
			const result = await rejectProcedureLogEntry(id, remark);
			return ok(result);
		}

		if (action === "bulk-sign") {
			const { ids } = body;
			if (!ids || !Array.isArray(ids)) return err("ids array is required", 400);
			const result = await bulkSignProcedureLogEntries(ids);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
