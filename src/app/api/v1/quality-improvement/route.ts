import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyQualityImprovements,
	getMyQualityImprovementSummary,
	getAvailableQIFaculty,
	addQualityImprovementRow,
	updateQualityImprovementEntry,
	submitQualityImprovementEntry,
	deleteQualityImprovementEntry,
	signQualityImprovementEntry,
	rejectQualityImprovementEntry,
} from "@/actions/quality-improvement";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyQualityImprovementSummary();
			const faculty = await getAvailableQIFaculty();
			return ok({ ...summary, faculty });
		}

		const entries = await getMyQualityImprovements();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 quality-improvement GET] error:", e);
		return err(e.message || "Failed to fetch quality improvements", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addQualityImprovementRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateQualityImprovementEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitQualityImprovementEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteQualityImprovementEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signQualityImprovementEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectQualityImprovementEntry(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 quality-improvement POST] error:", e);
		return err(e.message || "Failed to execute quality-improvement action", 400);
	}
}
