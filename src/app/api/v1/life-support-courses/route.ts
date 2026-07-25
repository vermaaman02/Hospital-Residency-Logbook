import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyCourses,
	getMyCourseSummary,
	getAvailableCourseFaculty,
	addCourseRow,
	updateCourseEntry,
	submitCourseEntry,
	deleteCourseEntry,
	signCourseEntry,
	rejectCourseEntry,
} from "@/actions/life-support-courses";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");

		if (view === "summary") {
			const summary = await getMyCourseSummary();
			const faculty = await getAvailableCourseFaculty();
			return ok({ ...summary, faculty });
		}

		const entries = await getMyCourses();
		return ok({ entries });
	} catch (e: any) {
		console.error("[API v1 life-support-courses GET] error:", e);
		return err(e.message || "Failed to fetch life-support courses", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, id, data, remark } = body;

		if (action === "add") {
			const entry = await addCourseRow();
			return ok(entry);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			const res = await updateCourseEntry(id, data);
			return ok(res);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			const res = await submitCourseEntry(id);
			return ok(res);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			const res = await deleteCourseEntry(id);
			return ok(res);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			const res = await signCourseEntry(id, remark);
			return ok(res);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			const res = await rejectCourseEntry(id, remark);
			return ok(res);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 life-support-courses POST] error:", e);
		return err(e.message || "Failed to execute life-support-courses action", 400);
	}
}
