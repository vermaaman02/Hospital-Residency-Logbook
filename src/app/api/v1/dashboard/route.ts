/**
 * GET /api/v1/dashboard
 * Returns lightweight counters for the student mobile home screen.
 * Counts entries per module grouped by status for the authenticated student.
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";

export async function GET() {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({ where: { clerkId } });
		if (!user) return err("User not found", 404);
		if (user.role !== "STUDENT") return err("Student access only", 403);

		const uid = user.id;

		const [
			caseManagement, procedures, diagnostics, imaging,
			clinicalAdult, clinicalPed, casePresentations,
			rotationPostings, attendance,
		] = await Promise.all([
			prisma.caseManagementLog.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.procedureLog.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.diagnosticSkill.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.imagingLog.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.clinicalSkillAdult.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.clinicalSkillPediatric.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.casePresentation.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.rotationPosting.groupBy({
				by: ["status"], where: { userId: uid }, _count: { id: true },
			}),
			prisma.attendanceEntry.groupBy({
				by: ["presentAbsent"],
				where: { attendanceSheet: { userId: uid } },
				_count: { id: true },
			}),
		]);

		function toMap(rows: { status: string; _count: { id: number } }[]) {
			return Object.fromEntries(rows.map((r) => [r.status, r._count.id]));
		}

		const attendanceSummary = Object.fromEntries(
			attendance.map((r) => [r.presentAbsent ?? "Unknown", r._count.id]),
		);

		return ok({
			caseManagement: toMap(caseManagement),
			procedures: toMap(procedures),
			diagnostics: toMap(diagnostics),
			imaging: toMap(imaging),
			clinicalSkillsAdult: toMap(clinicalAdult),
			clinicalSkillsPediatric: toMap(clinicalPed),
			casePresentations: toMap(casePresentations),
			rotationPostings: toMap(rotationPostings),
			attendance: attendanceSummary,
		});
	} catch (e) {
		return handleError(e);
	}
}
