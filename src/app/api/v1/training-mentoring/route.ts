/**
 * GET /api/v1/training-mentoring — list current student's training & mentoring records
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, handleError } from "@/app/api/v1/_lib/respond";
import { getStudentTrainingRecords } from "@/actions/training-mentoring";

export async function GET(req: NextRequest) {
	try {
		await requireAuthHybrid();
		const records = await getStudentTrainingRecords();
		return ok(records);
	} catch (e) {
		return handleError(e);
	}
}
