import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyConferences,
	getMyConferenceSummary,
	getAvailableConferenceFaculty,
	addConferenceRow,
	updateConferenceEntry,
	submitConferenceEntry,
	deleteConferenceEntry,
	signConferenceEntry,
	rejectConferenceEntry,
} from "@/actions/conferences";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyConferenceSummary();
			const faculty = await getAvailableConferenceFaculty();
			return ok({ ...summary, faculty });
		}

		const entries = await getMyConferences();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 conferences GET] error:", e);
		return err(e.message || "Failed to fetch conferences", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addConferenceRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateConferenceEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitConferenceEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteConferenceEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signConferenceEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectConferenceEntry(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 conferences POST] error:", e);
		return err(e.message || "Failed to execute conferences action", 400);
	}
}
