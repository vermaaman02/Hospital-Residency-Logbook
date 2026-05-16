/**
 * GET  /api/v1/case-management?category=<cat>   — list entries for a category
 * POST /api/v1/case-management                   — create/update/submit an entry
 *
 * body.action:
 *   "update"  — inline-edit a row   (fields: id, ...data)
 *   "submit"  — submit entry for review (fields: id)
 *   "delete"  — delete a DRAFT row  (fields: id)
 *   "init"    — initialise category rows (fields: category)
 *   "add"     — add a new row (fields: category)
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
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
} from "@/actions/case-management";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const url = new URL(req.url);
		const category = url.searchParams.get("category");
		const view = url.searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyCaseManagementSummary();
			return ok(summary);
		}

		if (!category) return err("category query param required", 400);
		const entries = await getMyCaseManagementEntries(category);
		return ok(entries);
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
			const { id, ...data } = body;
			if (!id) return err("id is required", 400);
			const result = await updateCaseManagementEntry(id, data);
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

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
