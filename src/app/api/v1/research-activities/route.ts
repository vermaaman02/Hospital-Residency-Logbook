import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyResearchActivities,
	getMyResearchSummary,
	getAvailableResearchFaculty,
	addResearchRow,
	updateResearchEntry,
	submitResearchEntry,
	deleteResearchEntry,
	signResearchEntry,
	rejectResearchEntry,
} from "@/actions/research-activities";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyResearchSummary();
			const faculty = await getAvailableResearchFaculty();
			return ok({ ...summary, faculty });
		}

		const entries = await getMyResearchActivities();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 research-activities GET] error:", e);
		return err(e.message || "Failed to fetch research activities", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addResearchRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateResearchEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitResearchEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteResearchEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signResearchEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectResearchEntry(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 research-activities POST] error:", e);
		return err(e.message || "Failed to execute research-activities action", 400);
	}
}
