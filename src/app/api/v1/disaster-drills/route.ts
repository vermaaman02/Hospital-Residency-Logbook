import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyDisasterDrills,
	getMyDisasterDrillSummary,
	getAvailableDisasterFaculty,
	addDisasterDrillRow,
	updateDisasterDrillEntry,
	submitDisasterDrillEntry,
	deleteDisasterDrillEntry,
	signDisasterDrillEntry,
	rejectDisasterDrillEntry,
} from "@/actions/disaster-drills";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyDisasterDrillSummary();
			const faculty = await getAvailableDisasterFaculty();
			return ok({ ...summary, faculty });
		}

		const entries = await getMyDisasterDrills();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 disaster-drills GET] error:", e);
		return err(e.message || "Failed to fetch disaster drills", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addDisasterDrillRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateDisasterDrillEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitDisasterDrillEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteDisasterDrillEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signDisasterDrillEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectDisasterDrillEntry(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 disaster-drills POST] error:", e);
		return err(e.message || "Failed to execute disaster-drills action", 400);
	}
}
