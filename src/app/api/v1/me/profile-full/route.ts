/**
 * GET /api/v1/me/profile-full
 * Returns the authenticated user's full profile including:
 *   - Basic info (name, role, batch, semester, department, status, joined)
 *   - Thesis info (student only)
 *   - Assigned faculty (student) / assigned students (faculty)
 *   - Logbook stats
 *
 * Mirrors the data shape used by the web ProfileClient component.
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";

export async function GET() {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: {
				id: true,
				clerkId: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				batch: true,
				currentSemester: true,
				department: true,
				profileImage: true,
				status: true,
				createdAt: true,
				thesis: {
					select: { topic: true, chiefGuide: true, status: true },
				},
				assignedFaculty: {
					include: {
						faculty: {
							select: { firstName: true, lastName: true },
						},
					},
				},
				assignedStudents: {
					include: {
						student: {
							select: { firstName: true, lastName: true },
						},
					},
				},
			},
		});

		if (!user) return err("User not found", 404);

		const uid = user.id;
		const role = (user.role ?? "STUDENT").toLowerCase();

		// Compute logbook stats based on role
		let logbookStats: Record<string, number> = {};
		if (role === "student") {
			const [cases, procedures, diagnostics, attendance] = await Promise.all([
				prisma.caseManagementLog.count({ where: { userId: uid } }),
				prisma.procedureLog.count({ where: { userId: uid } }),
				prisma.diagnosticSkill.count({ where: { userId: uid } }),
				prisma.attendanceSheet.count({ where: { userId: uid } }),
			]);
			logbookStats = { caseManagement: cases, procedures, diagnostics, attendance };
		} else if (role === "faculty") {
			const signedCount = await prisma.digitalSignature.count({
				where: { signedById: uid },
			});
			logbookStats = {
				signedEntries: signedCount,
				assignedStudents: user.assignedStudents.length,
			};
		}

		const roleLabel =
			role === "hod" ? "HOD" : role === "faculty" ? "Faculty" : "Student";

		return ok({
			clerkId: user.clerkId,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			profileImage: user.profileImage,
			role: roleLabel,
			batch: user.batch,
			currentSemester: user.currentSemester,
			department: user.department,
			status: user.status ?? "ACTIVE",
			joinedAt: user.createdAt?.toISOString() ?? null,
			thesisTopic: user.thesis?.topic ?? null,
			thesisGuide: user.thesis?.chiefGuide ?? null,
			thesisStatus: (user.thesis?.status as string) ?? null,
			assignedFaculty:
				user.assignedFaculty?.map((a) => ({
					semester: a.semester,
					name: `${a.faculty.firstName} ${a.faculty.lastName}`,
				})) ?? [],
			assignedStudents:
				user.assignedStudents?.map((a) => ({
					semester: a.semester,
					name: `${a.student.firstName} ${a.student.lastName}`,
				})) ?? [],
			logbookStats,
		});
	} catch (e) {
		return handleError(e);
	}
}
