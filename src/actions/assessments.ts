/**
 * @module Assessment Actions
 * @description Server actions for Internal Assessments — create, manage,
 * submit, evaluate, and query assessments across HOD, Faculty, and Student roles.
 *
 * HOD: Can create assessments for ALL batches. Can evaluate any submission.
 * Faculty: Can create assessments for ASSIGNED batches only. Can evaluate assigned batch submissions.
 * Student: Can view assessments for their batch. Can submit and view grades.
 */

"use server";

import { requireAuth, requireRole, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ======================== TYPES ========================

export interface CreateAssessmentInput {
	title: string;
	description?: string;
	assessmentType:
		| "THEORY"
		| "PRACTICAL"
		| "VIVA"
		| "ASSIGNMENT"
		| "PROJECT"
		| "OTHER";
	batchId: string;
	deadline?: string; // ISO date string
	publishAt?: string; // ISO date string — scheduled publish date
	semester?: number | null; // null = all semesters
	resourceLinks?: string[];
	maxMarks?: number;
	totalMarks?: number;
	isPublished?: boolean;
}

export interface EvaluateSubmissionInput {
	submissionId: string;
	marks?: number;
	grade?: string;
	feedback?: string;
}

export interface RejectSubmissionInput {
	submissionId: string;
	rejectionReason: string;
}

// ======================== HELPERS ========================

function revalidateAll() {
	revalidatePath("/dashboard/student/internal-assessments");
	revalidatePath("/dashboard/faculty/internal-assessments");
	revalidatePath("/dashboard/hod/internal-assessments");
}

// ======================== CREATE / MANAGE ASSESSMENTS ========================

export async function createAssessment(input: CreateAssessmentInput) {
	const { role } = await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	// Faculty can only create for assigned batches
	if (role === "faculty") {
		const assignment = await prisma.facultyBatchAssignment.findUnique({
			where: {
				facultyId_batchId: { facultyId: user.id, batchId: input.batchId },
			},
		});
		if (!assignment) throw new Error("You are not assigned to this batch");
	}

	const assessment = await prisma.internalAssessment.create({
		data: {
			title: input.title,
			description: input.description ?? null,
			assessmentType: input.assessmentType,
			batchId: input.batchId,
			createdById: user.id,
			deadline: input.deadline ? new Date(input.deadline) : null,
			publishAt: input.publishAt ? new Date(input.publishAt) : null,
			semester: input.semester ?? null,
			resourceLinks: input.resourceLinks ?? [],
			maxMarks: input.maxMarks ?? null,
			totalMarks: input.totalMarks ?? null,
			isPublished: input.isPublished ?? false,
		},
	});

	revalidateAll();
	return assessment;
}

export async function updateAssessment(
	assessmentId: string,
	input: Partial<CreateAssessmentInput>,
) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!existing) throw new Error("Assessment not found");
	if (existing.createdById !== user.id) {
		// HOD can edit anyone's, faculty can only edit own
		const { role } = await requireRole(["hod", "faculty"]);
		if (role !== "hod")
			throw new Error("You can only edit your own assessments");
	}

	const assessment = await prisma.internalAssessment.update({
		where: { id: assessmentId },
		data: {
			...(input.title !== undefined && { title: input.title }),
			...(input.description !== undefined && {
				description: input.description,
			}),
			...(input.assessmentType !== undefined && {
				assessmentType: input.assessmentType,
			}),
			...(input.batchId !== undefined && { batchId: input.batchId }),
			...(input.deadline !== undefined && {
				deadline: input.deadline ? new Date(input.deadline) : null,
			}),
			...(input.publishAt !== undefined && {
				publishAt: input.publishAt ? new Date(input.publishAt) : null,
			}),
			...(input.semester !== undefined && { semester: input.semester }),
			...(input.resourceLinks !== undefined && {
				resourceLinks: input.resourceLinks,
			}),
			...(input.maxMarks !== undefined && { maxMarks: input.maxMarks }),
			...(input.totalMarks !== undefined && { totalMarks: input.totalMarks }),
			...(input.isPublished !== undefined && {
				isPublished: input.isPublished,
			}),
		},
	});

	revalidateAll();
	return assessment;
}

export async function deleteAssessment(assessmentId: string) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!existing) throw new Error("Assessment not found");

	const { role } = await requireRole(["hod", "faculty"]);
	if (role !== "hod" && existing.createdById !== user.id) {
		throw new Error("You can only delete your own assessments");
	}

	await prisma.internalAssessment.delete({ where: { id: assessmentId } });
	revalidateAll();
	return { success: true };
}

export async function togglePublishAssessment(assessmentId: string) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const existing = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!existing) throw new Error("Assessment not found");

	const updated = await prisma.internalAssessment.update({
		where: { id: assessmentId },
		data: { isPublished: !existing.isPublished },
	});

	revalidateAll();
	return updated;
}

// ======================== FETCH ASSESSMENTS ========================

/** HOD: Get all assessments with submission counts */
export async function getAllAssessments() {
	await requireRole(["hod"]);

	return prisma.internalAssessment.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			submissions: {
				select: {
					id: true,
					status: true,
					student: { select: { id: true, firstName: true, lastName: true } },
					evaluation: {
						select: { marks: true, grade: true },
					},
				},
			},
		},
	});
}

/** Faculty: Get assessments for assigned batches only */
export async function getFacultyAssessments() {
	await requireRole(["faculty", "hod"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const assignments = await prisma.facultyBatchAssignment.findMany({
		where: { facultyId: user.id },
		select: { batchId: true },
	});
	const batchIds = assignments.map((a) => a.batchId);

	return prisma.internalAssessment.findMany({
		where: { batchId: { in: batchIds } },
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			submissions: {
				select: {
					id: true,
					status: true,
					student: { select: { id: true, firstName: true, lastName: true } },
					evaluation: {
						select: { marks: true, grade: true },
					},
				},
			},
		},
	});
}

/** Student: Get published assessments for their batch */
export async function getStudentAssessments() {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user || !user.batchId) return [];

	return prisma.internalAssessment.findMany({
		where: {
			batchId: user.batchId,
			isPublished: true,
		},
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			submissions: {
				where: { studentId: user.id },
				select: {
					id: true,
					status: true,
					content: true,
					submittedAt: true,
					evaluation: {
						select: {
							marks: true,
							grade: true,
							feedback: true,
							rejectionReason: true,
							evaluatedAt: true,
							evaluatedBy: { select: { firstName: true, lastName: true } },
						},
					},
				},
			},
		},
	});
}

/** Get detailed view of a single assessment with all submissions (for HOD/Faculty) */
export async function getAssessmentDetail(assessmentId: string) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const assessment = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
		include: {
			batch: {
				select: {
					id: true,
					name: true,
					students: {
						where: { role: "STUDENT", status: "ACTIVE" },
						select: { id: true, firstName: true, lastName: true, email: true },
					},
				},
			},
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			submissions: {
				include: {
					student: {
						select: { id: true, firstName: true, lastName: true, email: true },
					},
					evaluation: {
						include: {
							evaluatedBy: { select: { firstName: true, lastName: true } },
						},
					},
				},
			},
		},
	});

	if (!assessment) throw new Error("Assessment not found");

	// Faculty: verify batch assignment
	const { role } = await requireRole(["hod", "faculty"]);
	if (role === "faculty") {
		const assignment = await prisma.facultyBatchAssignment.findUnique({
			where: {
				facultyId_batchId: { facultyId: user.id, batchId: assessment.batchId },
			},
		});
		if (!assignment)
			throw new Error("Not authorized for this assessment's batch");
	}

	return assessment;
}

// ======================== STUDENT SUBMISSION ACTIONS ========================

export async function submitAssessment(assessmentId: string, content?: string) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	// Verify published and batch match
	const assessment = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!assessment || !assessment.isPublished)
		throw new Error("Assessment not available");
	if (assessment.batchId !== user.batchId) throw new Error("Not authorized");

	// Check deadline
	if (assessment.deadline && new Date() > assessment.deadline) {
		throw new Error("Submission deadline has passed");
	}

	const submission = await prisma.assessmentSubmission.upsert({
		where: {
			assessmentId_studentId: { assessmentId, studentId: user.id },
		},
		create: {
			assessmentId,
			studentId: user.id,
			content: content ?? null,
			status: "SUBMITTED",
			submittedAt: new Date(),
		},
		update: {
			content: content ?? null,
			status: "SUBMITTED",
			submittedAt: new Date(),
		},
	});

	revalidateAll();
	return submission;
}

export async function saveDraftSubmission(
	assessmentId: string,
	content?: string,
) {
	await requireAuth();
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const assessment = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!assessment || !assessment.isPublished)
		throw new Error("Assessment not available");
	if (assessment.batchId !== user.batchId) throw new Error("Not authorized");

	const submission = await prisma.assessmentSubmission.upsert({
		where: {
			assessmentId_studentId: { assessmentId, studentId: user.id },
		},
		create: {
			assessmentId,
			studentId: user.id,
			content: content ?? null,
			status: "DRAFT",
		},
		update: {
			content: content ?? null,
			status: "DRAFT",
		},
	});

	revalidateAll();
	return submission;
}

// ======================== EVALUATION ACTIONS (FACULTY / HOD) ========================

export async function evaluateSubmission(input: EvaluateSubmissionInput) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const submission = await prisma.assessmentSubmission.findUnique({
		where: { id: input.submissionId },
		include: { assessment: true },
	});
	if (!submission) throw new Error("Submission not found");

	// Verify max marks
	if (input.marks !== undefined && submission.assessment.maxMarks) {
		if (input.marks > submission.assessment.maxMarks) {
			throw new Error(`Marks cannot exceed ${submission.assessment.maxMarks}`);
		}
		if (input.marks < 0) {
			throw new Error("Marks cannot be negative");
		}
	}

	// Upsert evaluation
	const evaluation = await prisma.assessmentEvaluation.upsert({
		where: { submissionId: input.submissionId },
		create: {
			submissionId: input.submissionId,
			evaluatedById: user.id,
			marks: input.marks ?? null,
			grade: input.grade ?? null,
			feedback: input.feedback ?? null,
			evaluatedAt: new Date(),
		},
		update: {
			evaluatedById: user.id,
			marks: input.marks ?? null,
			grade: input.grade ?? null,
			feedback: input.feedback ?? null,
			evaluatedAt: new Date(),
		},
	});

	// Update submission status to SIGNED
	await prisma.assessmentSubmission.update({
		where: { id: input.submissionId },
		data: { status: "SIGNED" },
	});

	revalidateAll();
	return evaluation;
}

export async function rejectSubmission(input: RejectSubmissionInput) {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const submission = await prisma.assessmentSubmission.findUnique({
		where: { id: input.submissionId },
	});
	if (!submission) throw new Error("Submission not found");

	// Upsert evaluation with rejection
	await prisma.assessmentEvaluation.upsert({
		where: { submissionId: input.submissionId },
		create: {
			submissionId: input.submissionId,
			evaluatedById: user.id,
			rejectionReason: input.rejectionReason,
			evaluatedAt: new Date(),
		},
		update: {
			evaluatedById: user.id,
			rejectionReason: input.rejectionReason,
			evaluatedAt: new Date(),
		},
	});

	// Update submission status to NEEDS_REVISION
	await prisma.assessmentSubmission.update({
		where: { id: input.submissionId },
		data: { status: "NEEDS_REVISION" },
	});

	revalidateAll();
	return { success: true };
}

// ======================== UTILITY QUERIES ========================

export async function getAvailableBatches() {
	await requireRole(["hod", "faculty"]);
	const user = await ensureUserInDb();
	if (!user) throw new Error("User not found");

	const { role } = await requireRole(["hod", "faculty"]);

	if (role === "hod") {
		return prisma.batch.findMany({
			where: { isActive: true },
			select: { id: true, name: true, currentSemester: true },
			orderBy: { name: "asc" },
		});
	}

	// Faculty: only assigned batches
	const assignments = await prisma.facultyBatchAssignment.findMany({
		where: { facultyId: user.id },
		select: {
			batch: { select: { id: true, name: true, currentSemester: true } },
		},
	});
	return assignments.map((a) => a.batch);
}

export async function getAssessmentStats() {
	await requireRole(["hod"]);

	const [total, published, batches] = await Promise.all([
		prisma.internalAssessment.count(),
		prisma.internalAssessment.count({ where: { isPublished: true } }),
		prisma.batch.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				_count: { select: { students: true, assessments: true } },
			},
		}),
	]);

	const submissions = await prisma.assessmentSubmission.groupBy({
		by: ["status"],
		_count: { id: true },
	});

	const statusCounts = {
		draft: 0,
		submitted: 0,
		signed: 0,
		needsRevision: 0,
	};
	for (const s of submissions) {
		if (s.status === "DRAFT") statusCounts.draft = s._count.id;
		if (s.status === "SUBMITTED") statusCounts.submitted = s._count.id;
		if (s.status === "SIGNED") statusCounts.signed = s._count.id;
		if (s.status === "NEEDS_REVISION") statusCounts.needsRevision = s._count.id;
	}

	return { total, published, batches, statusCounts };
}
