/**
 * GET/POST /api/v1/assessments
 * REST API route wrapper for Internal Assessments module.
 * Serves mobile application and external API clients.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import {
	getStudentAssessments,
	getFacultyAssessments,
	getAllAssessments,
	getAssessmentDetail,
	submitAssessment,
	saveDraftSubmission,
	evaluateSubmission,
	rejectSubmission,
	createAssessment,
	updateAssessment,
	deleteAssessment,
} from "@/actions/assessments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	try {
		const userId = await requireAuthHybrid();
		const user = await prisma.user.findUnique({ where: { clerkId: userId } });
		if (!user) return err("User not found", 404);

		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		const mode = url.searchParams.get("mode");

		if (id) {
			const detail = await getAssessmentDetail(id);
			return ok(detail);
		}

		if (user.role === "HOD" || mode === "hod") {
			const data = await getAllAssessments();
			return ok(data);
		}

		if (user.role === "FACULTY" || mode === "faculty") {
			const data = await getFacultyAssessments();
			return ok(data);
		}

		const data = await getStudentAssessments();
		return ok(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = await req.json().catch(() => ({}));
		const { action } = body;

		if (action === "submit") {
			const { assessmentId, content, attachments } = body;
			if (!assessmentId) return err("assessmentId is required", 400);
			const result = await submitAssessment(assessmentId, content, attachments);
			return ok(result);
		}

		if (action === "save-draft") {
			const { assessmentId, content, attachments } = body;
			if (!assessmentId) return err("assessmentId is required", 400);
			const result = await saveDraftSubmission(assessmentId, content, attachments);
			return ok(result);
		}

		if (action === "evaluate") {
			const { submissionId, marks, grade, feedback } = body;
			if (!submissionId) return err("submissionId is required", 400);
			const result = await evaluateSubmission({ submissionId, marks, grade, feedback });
			return ok(result);
		}

		if (action === "reject") {
			const { submissionId, rejectionReason } = body;
			if (!submissionId) return err("submissionId is required", 400);
			if (!rejectionReason) return err("rejectionReason is required", 400);
			const result = await rejectSubmission({ submissionId, rejectionReason });
			return ok(result);
		}

		if (action === "create") {
			const result = await createAssessment(body.data);
			return ok(result);
		}

		if (action === "update") {
			const { id, data } = body;
			if (!id) return err("id is required", 400);
			const result = await updateAssessment(id, data);
			return ok(result);
		}

		if (action === "delete") {
			const { id } = body;
			if (!id) return err("id is required", 400);
			const result = await deleteAssessment(id);
			return ok(result);
		}

		return err("Unknown action", 400);
	} catch (e) {
		return handleError(e);
	}
}
