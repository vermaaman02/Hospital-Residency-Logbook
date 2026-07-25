import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyTransportLogs,
	getMyTransportSummary,
	getTransportLogsForReview,
	getAvailableOtherLogFaculty,
	addTransportLogRow,
	updateTransportLog,
	submitTransportLog,
	deleteTransportLog,
	signTransportLog,
	rejectTransportLog,
} from "@/actions/other-logs";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");
		const mode = searchParams.get("mode");

		if (view === "summary") {
			const summary = await getMyTransportSummary();
			const faculty = await getAvailableOtherLogFaculty();
			return ok({ ...summary, faculty });
		}

		if (mode === "review") {
			const entries = await getTransportLogsForReview();
			return ok({ entries });
		}

		const entries = await getMyTransportLogs();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 transport GET] error:", e);
		return err(e.message || "Failed to fetch transport logs", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addTransportLogRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateTransportLog(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitTransportLog(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteTransportLog(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signTransportLog(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectTransportLog(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 transport POST] error:", e);
		return err(e.message || "Failed to execute transport action", 400);
	}
}
