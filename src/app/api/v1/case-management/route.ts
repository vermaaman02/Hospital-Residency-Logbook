/**
 * GET  /api/v1/case-management?category=<cat>   — list entries for a category
 * GET  /api/v1/case-management?view=summary       — 24 category summary statistics
 * GET  /api/v1/case-management?mode=review        — faculty review list
 * GET  /api/v1/case-management?mode=faculty-list  — list supervising faculty
 * POST /api/v1/case-management                   — create/update/submit/sign/reject entries
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { err, ok, handleError } from "@/app/api/v1/_lib/respond";
import {
	getMyCaseManagementEntries,
	getMyCaseManagementSummary,
	updateCaseManagementEntry,
	submitCaseManagementEntry,
	deleteCaseManagementEntry,
	initializeCaseManagement,
	addCaseManagementRow,
	getAvailableCaseManagementFaculty,
	getCaseManagementForReview,
	signCaseManagementEntry,
	rejectCaseManagementEntry,
	bulkSignCaseManagementEntries,
} from "@/actions/case-management";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const category = url.searchParams.get("category");
		const view = url.searchParams.get("view");
		const mode = url.searchParams.get("mode");

		if (mode === "review") {
			const reviewEntries = await getCaseManagementForReview(category || undefined);
			return ok({ entries: reviewEntries });
		}

		if (mode === "faculty-list") {
			const facultyList = await getAvailableCaseManagementFaculty();
			return ok({ faculty: facultyList });
		}

		if (view === "summary") {
			const summary = await getMyCaseManagementSummary();
			const facultyList = await getAvailableCaseManagementFaculty();
			return ok({ ...summary, faculty: facultyList });
		}

		if (!category) return err("category query param required", 400);
		const entries = await getMyCaseManagementEntries(category);
		const facultyList = await getAvailableCaseManagementFaculty();
		return ok({ entries, faculty: facultyList });
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
			const result = await initializeCaseManagement(category);
			return ok(result, 201);
		}

		if (action === "add") {
			const { category } = body;
			if (!category) return err("category is required", 400);
			const result = await addCaseManagementRow(category);
			return ok(result, 201);
		}

		if (action === "update") {
			const { id, data, ...rest } = body;
			if (!id) return err("id is required", 400);
			const updateData = data || rest;
			const result = await updateCaseManagementEntry(id, updateData);
			return ok(result);
		}

		if (action === "submit") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await submitCaseManagementEntry(id);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteCaseManagementEntry(id);
			return ok(result);
		}

		if (action === "sign") {
			const { id, remark } = body;
			if (!id) return err("id is required", 400);
			const result = await signCaseManagementEntry(id, remark);
			return ok(result);
		}

		if (action === "reject") {
			const { id, remark } = body;
			if (!id || !remark) return err("id and remark are required", 400);
			const result = await rejectCaseManagementEntry(id, remark);
			return ok(result);
		}

		if (action === "bulk-sign") {
			const { ids } = body;
			if (!ids || !Array.isArray(ids)) return err("ids array is required", 400);
			const result = await bulkSignCaseManagementEntries(ids);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
