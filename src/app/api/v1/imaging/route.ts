import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyImagingLogSummary,
	getMyImagingLogEntries,
	getImagingLogsForReview,
	getAvailableImagingFaculty,
	initializeImagingLogCategory,
	addImagingLogRow,
	updateImagingLogEntry,
	submitImagingLogEntry,
	deleteImagingLogEntry,
	signImagingLogEntry,
	rejectImagingLogEntry,
	bulkSignImagingLogEntries,
} from "@/actions/imaging-logs";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");
		const category = searchParams.get("category");
		const mode = searchParams.get("mode");

		if (view === "summary") {
			const summary = await getMyImagingLogSummary();
			const faculty = await getAvailableImagingFaculty();
			return ok({ ...summary, faculty });
		}

		if (mode === "review") {
			const entries = await getImagingLogsForReview(category ?? undefined);
			return ok({ entries });
		}

		if (!category) {
			const summary = await getMyImagingLogSummary();
			return ok(summary);
		}

		const entries = await getMyImagingLogEntries(category);
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 imaging GET] error:", e);
		return err(e.message || "Failed to fetch imaging logs", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, category, data, remark, ids } = body;

		if (action === "init") {
			if (!category) return err("Missing category", 400);
			const res = await initializeImagingLogCategory(category);
			return ok(res);
		}

		if (action === "add") {
			if (!category) return err("Missing category", 400);
			const entry = await addImagingLogRow(category);
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateImagingLogEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitImagingLogEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteImagingLogEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signImagingLogEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectImagingLogEntry(id, remark);
			return ok(res);
		}

		if (action === "bulk-sign") {
			if (!ids || !Array.isArray(ids)) return err("Missing ids array", 400);
			const res = await bulkSignImagingLogEntries(ids);
			return ok(res);
		}

		return err(`Unknown action: ${action}`, 400);
	} catch (e: any) {
		console.error("[API v1 imaging POST] error:", e);
		return err(e.message || "Failed to process imaging logs action", 400);
	}
}
