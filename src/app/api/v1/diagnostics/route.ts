import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyDiagnosticSkillSummary,
	getMyDiagnosticSkillEntries,
	getDiagnosticSkillsForReview,
	addDiagnosticSkillRow,
	updateDiagnosticSkillEntry,
	submitDiagnosticSkillEntry,
	deleteDiagnosticSkillEntry,
	signDiagnosticSkillEntry,
	rejectDiagnosticSkillEntry,
	bulkSignDiagnosticSkillEntries,
} from "@/actions/diagnostic-skills";
import { getAvailableProcedureFaculty } from "@/actions/procedure-logs";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");
		const category = searchParams.get("category");
		const mode = searchParams.get("mode");

		if (view === "summary") {
			const summary = await getMyDiagnosticSkillSummary();
			const faculty = await getAvailableProcedureFaculty();
			return ok({ ...summary, faculty });
		}

		if (mode === "review") {
			const entries = await getDiagnosticSkillsForReview(category ?? undefined);
			return ok({ entries });
		}

		if (!category) {
			const summary = await getMyDiagnosticSkillSummary();
			return ok(summary);
		}

		const entries = await getMyDiagnosticSkillEntries(category);
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 diagnostics GET] error:", e);
		return err(e.message || "Failed to fetch diagnostic skills", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, category, data, remark, ids } = body;

		if (action === "add" || action === "create") {
			if (!category) return err("Missing category", 400);
			const res = await addDiagnosticSkillRow(category, data?.skillName, data?.slNo);
			return ok(res);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateDiagnosticSkillEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitDiagnosticSkillEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteDiagnosticSkillEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signDiagnosticSkillEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectDiagnosticSkillEntry(id, remark);
			return ok(res);
		}

		if (action === "bulk-sign") {
			if (!ids || !Array.isArray(ids)) return err("Missing ids array", 400);
			const res = await bulkSignDiagnosticSkillEntries(ids);
			return ok(res);
		}

		return err(`Unknown action: ${action}`, 400);
	} catch (e: any) {
		console.error("[API v1 diagnostics POST] error:", e);
		return err(e.message || "Failed to process diagnostic skills action", 400);
	}
}
