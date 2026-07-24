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

import { requireAuthHybrid, requireRoleHybrid, ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { sendRealtimeNotification } from "@/lib/notifications";

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
	attachments?: string[];
	maxMarks?: number;
	totalMarks?: number;
	isPublished?: boolean;
	assignedFacultyId?: string;
	assignedStudentIds?: string[];
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
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
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
			attachments: input.attachments ?? [],
			maxMarks: input.maxMarks ?? null,
			totalMarks: input.totalMarks ?? null,
			isPublished: input.isPublished ?? false,
			assignedFacultyId: input.assignedFacultyId ?? null,
			...(input.assignedStudentIds && input.assignedStudentIds.length > 0 ?
				{
					assignedStudents: {
						connect: input.assignedStudentIds.map((id) => ({ id })),
					},
				}
			:	{}),
		},
	});

	revalidateAll();
	emitRealtimeEvent("assessment:created", { assessmentId: assessment.id });
	return assessment;
}

export async function updateAssessment(
	assessmentId: string,
	input: Partial<CreateAssessmentInput>,
) {
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!existing) throw new Error("Assessment not found");
	if (existing.createdById !== user.id) {
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
			...(input.attachments !== undefined && {
				attachments: input.attachments,
			}),
			...(input.maxMarks !== undefined && { maxMarks: input.maxMarks }),
			...(input.totalMarks !== undefined && { totalMarks: input.totalMarks }),
			...(input.isPublished !== undefined && {
				isPublished: input.isPublished,
			}),
			...(input.assignedFacultyId !== undefined && {
				assignedFacultyId: input.assignedFacultyId,
			}),
			...(input.assignedStudentIds !== undefined && {
				assignedStudents: {
					set: input.assignedStudentIds.map((id) => ({ id })), // OVERWRITES existing connect lists with the new array
				},
			}),
		},
	});

	revalidateAll();
	emitRealtimeEvent("assessment:updated", { assessmentId: assessment.id });
	return assessment;
}

export async function deleteAssessment(assessmentId: string) {
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
	});
	if (!existing) throw new Error("Assessment not found");

	if (role !== "hod" && existing.createdById !== user.id) {
		throw new Error("You can only delete your own assessments");
	}

	await prisma.internalAssessment.delete({ where: { id: assessmentId } });
	revalidateAll();
	emitRealtimeEvent("assessment:updated", { assessmentId, deleted: true });
	return { success: true };
}

export async function togglePublishAssessment(assessmentId: string) {
	await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
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
	emitRealtimeEvent("assessment:updated", { assessmentId, published: !existing.isPublished });
	return updated;
}

// ======================== FETCH ASSESSMENTS ========================

/** HOD: Get all assessments with submission counts */
export async function getAllAssessments() {
	await requireRoleHybrid(["hod"]);

	return prisma.internalAssessment.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			assignedFaculty: {
				select: { id: true, firstName: true, lastName: true },
			},
			assignedStudents: {
				select: { id: true, firstName: true, lastName: true },
			},
			submissions: {
				select: {
					id: true,
					status: true,
					attachments: true,
					content: true,
					submittedAt: true,
					updatedAt: true,
					student: { select: { id: true, firstName: true, lastName: true } },
					evaluation: {
						select: {
							marks: true,
							grade: true,
							feedback: true,
							rejectionReason: true,
							evaluatedAt: true,
							isMarksLocked: true,
							evaluatedBy: { select: { firstName: true, lastName: true } },
						},
					},
				},
			},
		},
	});
}

/** Faculty: Get assessments for assigned batches only */
export async function getFacultyAssessments() {
	await requireRoleHybrid(["faculty", "hod"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const assignments = await prisma.facultyBatchAssignment.findMany({
		where: { facultyId: user.id },
		select: { batchId: true },
	});
	const batchIds = assignments.map((a) => a.batchId);

	return prisma.internalAssessment.findMany({
		where: {
			batchId: { in: batchIds },
			OR: [{ assignedFacultyId: user.id }, { assignedFacultyId: null }],
		},
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			assignedFaculty: {
				select: { id: true, firstName: true, lastName: true },
			},
			assignedStudents: {
				select: { id: true, firstName: true, lastName: true },
			},
			submissions: {
				select: {
					id: true,
					status: true,
					attachments: true,
					content: true,
					submittedAt: true,
					updatedAt: true,
					student: { select: { id: true, firstName: true, lastName: true } },
					evaluation: {
						select: {
							marks: true,
							grade: true,
							feedback: true,
							rejectionReason: true,
							evaluatedAt: true,
							isMarksLocked: true,
							evaluatedBy: { select: { firstName: true, lastName: true } },
						},
					},
				},
			},
		},
	});
}

/** Student: Get published assessments for their batch */
export async function getStudentAssessments() {
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user || !user.batchId) return [];

	return prisma.internalAssessment.findMany({
		where: {
			batchId: user.batchId,
			isPublished: true,
			OR: [
				{ assignedStudents: { some: { id: user.id } } }, // specifically for this student
				{ assignedStudents: { none: {} } }, // OR fallback: no specific students = entire batch
			],
		},
		orderBy: { createdAt: "desc" },
		include: {
			batch: { select: { id: true, name: true } },
			createdBy: { select: { id: true, firstName: true, lastName: true } },
			assignedStudents: {
				select: { id: true, firstName: true, lastName: true },
			},
			submissions: {
				where: { studentId: user.id },
				select: {
					id: true,
					status: true,
					content: true,
					attachments: true,
					submittedAt: true,
					student: { select: { id: true, firstName: true, lastName: true } },
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
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
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

	// Enforce strict faculty scoping
	if (
		role === "faculty" &&
		assessment.assignedFacultyId &&
		assessment.assignedFacultyId !== user.id
	) {
		throw new Error(
			"You are not authorized to view this specific assessment detail",
		);
	}

	// Faculty: verify batch assignment
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

export async function submitAssessment(
	assessmentId: string,
	content?: string,
	attachments?: string[],
) {
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	// Verify published and batch match
	const assessment = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
		include: { assignedStudents: { select: { id: true } } },
	});
	if (!assessment || !assessment.isPublished)
		throw new Error("Assessment not available");

	if (assessment.assignedStudents.length > 0) {
		const isAssigned = assessment.assignedStudents.some(
			(s) => s.id === user.id,
		);
		if (!isAssigned) throw new Error("Not specifically configured for you");
	} else if (assessment.batchId !== user.batchId) {
		throw new Error("Not authorized for your batch");
	}

	// Check deadline
	if (assessment.deadline && new Date() > assessment.deadline) {
		throw new Error("Submission deadline has passed");
	}

	// Use transaction to record submission with revision
	const result = await prisma.$transaction(async (tx) => {
		const submission = await tx.assessmentSubmission.upsert({
			where: {
				assessmentId_studentId: { assessmentId, studentId: user.id },
			},
			create: {
				assessmentId,
				studentId: user.id,
				content: content ?? null,
				attachments: attachments ?? [],
				status: "SUBMITTED",
				submittedAt: new Date(),
			},
			update: {
				content: content ?? null,
				...(attachments !== undefined && { attachments }),
				status: "SUBMITTED",
				submittedAt: new Date(),
			},
		});

		await recordSubmission(tx, {
			entityType: "AssessmentSubmission",
			entityId: submission.id,
			ownerId: user.id,
			snapshot: { content, attachments },
		});

		return submission;
	});

	revalidateAll();
	emitRealtimeEvent("assessment:submitted", { assessmentId, submissionId: result.id });
	return result;
}

export async function saveDraftSubmission(
	assessmentId: string,
	content?: string,
	attachments?: string[],
) {
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const assessment = await prisma.internalAssessment.findUnique({
		where: { id: assessmentId },
		include: { assignedStudents: { select: { id: true } } },
	});
	if (!assessment || !assessment.isPublished)
		throw new Error("Assessment not available");

	if (assessment.assignedStudents.length > 0) {
		const isAssigned = assessment.assignedStudents.some(
			(s) => s.id === user.id,
		);
		if (!isAssigned) throw new Error("Not explicitly assigned to you");
	} else if (assessment.batchId !== user.batchId) {
		throw new Error("Not authorized for your batch");
	}

	const submission = await prisma.assessmentSubmission.upsert({
		where: {
			assessmentId_studentId: { assessmentId, studentId: user.id },
		},
		create: {
			assessmentId,
			studentId: user.id,
			content: content ?? null,
			attachments: attachments ?? [],
			status: "DRAFT",
		},
		update: {
			content: content ?? null,
			...(attachments !== undefined && { attachments }),
			status: "DRAFT",
		},
	});

	revalidateAll();
	return submission;
}

// ======================== EVALUATION ACTIONS (FACULTY / HOD) ========================

export async function evaluateSubmission(input: EvaluateSubmissionInput) {
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const submission = await prisma.assessmentSubmission.findUnique({
		where: { id: input.submissionId },
		include: { assessment: true, evaluation: true },
	});
	if (!submission) throw new Error("Submission not found");

	// Feature 5 constraint: If a specific faculty is assigned, only they can evaluate (for faculty)
	if (
		role === "faculty" &&
		submission.assessment.assignedFacultyId &&
		submission.assessment.assignedFacultyId !== user.id
	) {
		throw new Error("You are not the designated evaluator for this assessment");
	}

	// Check if marks are locked (Feature 6: lock after one edit)
	if (submission.evaluation?.isMarksLocked) {
		throw new Error(
			"Marks are locked and cannot be changed after the first evaluation.",
		);
	}

	// Verify max marks
	if (input.marks !== undefined && submission.assessment.maxMarks) {
		if (input.marks > submission.assessment.maxMarks) {
			throw new Error(`Marks cannot exceed ${submission.assessment.maxMarks}`);
		}
		if (input.marks < 0) {
			throw new Error("Marks cannot be negative");
		}
	}

	// Use transaction for evaluation with revision recording
	const evaluation = await prisma.$transaction(async (tx) => {
		// Upsert evaluation — lock marks after first evaluation
		const evalRecord = await tx.assessmentEvaluation.upsert({
			where: { submissionId: input.submissionId },
			create: {
				submissionId: input.submissionId,
				evaluatedById: user.id,
				marks: input.marks ?? null,
				grade: input.grade ?? null,
				feedback: input.feedback ?? null,
				isMarksLocked: true,
				evaluatedAt: new Date(),
			},
			update: {
				evaluatedById: user.id,
				marks: input.marks ?? null,
				grade: input.grade ?? null,
				feedback: input.feedback ?? null,
				isMarksLocked: true,
				evaluatedAt: new Date(),
			},
		});

		// Update submission status to SIGNED
		await tx.assessmentSubmission.update({
			where: { id: input.submissionId },
			data: { status: "SIGNED" },
		});

		// Record review revision
		await recordReview(tx, {
			entityType: "AssessmentSubmission",
			entityId: input.submissionId,
			ownerId: submission.studentId,
			reviewerId: user.id,
			reviewerRole: role as "faculty" | "hod",
			decision: "SIGNED",
			remark: input.feedback,
		});

		return evalRecord;
	});

	revalidateAll();
	emitRealtimeEvent("assessment:evaluated", { submissionId: input.submissionId });
	await sendRealtimeNotification(
		submission.studentId,
		"Assessment Evaluated",
		`Your submission for "${submission.assessment.title}" has been evaluated. Marks: ${input.marks ?? "—"}/${submission.assessment.maxMarks ?? "100"}, Grade: ${input.grade ?? "N/A"}.`,
		{ type: "internal-assessments", id: submission.assessmentId }
	);
	return evaluation;
}

export async function rejectSubmission(input: RejectSubmissionInput) {
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

	const submission = await prisma.assessmentSubmission.findUnique({
		where: { id: input.submissionId },
		include: { assessment: true },
	});
	if (!submission) throw new Error("Submission not found");

	// Feature 5 constraint: If a specific faculty is assigned, only they can reject (for faculty)
	if (
		role === "faculty" &&
		submission.assessment.assignedFacultyId &&
		submission.assessment.assignedFacultyId !== user.id
	) {
		throw new Error("You are not the designated evaluator for this assessment");
	}

	// Use transaction for rejection with revision recording
	await prisma.$transaction(async (tx) => {
		// Upsert evaluation with rejection
		await tx.assessmentEvaluation.upsert({
			where: { submissionId: input.submissionId },
			create: {
				submissionId: input.submissionId,
				evaluatedById: user.id,
				rejectionReason: `[${user.firstName} ${user.lastName}] ${input.rejectionReason}`,
				evaluatedAt: new Date(),
			},
			update: {
				evaluatedById: user.id,
				rejectionReason: `[${user.firstName} ${user.lastName}] ${input.rejectionReason}`,
				evaluatedAt: new Date(),
			},
		});

		// Update submission status to NEEDS_REVISION
		await tx.assessmentSubmission.update({
			where: { id: input.submissionId },
			data: { status: "NEEDS_REVISION" },
		});

		// Record review revision
		await recordReview(tx, {
			entityType: "AssessmentSubmission",
			entityId: input.submissionId,
			ownerId: submission.studentId,
			reviewerId: user.id,
			reviewerRole: role as "faculty" | "hod",
			decision: "REJECTED",
			remark: `[${user.firstName} ${user.lastName}] ${input.rejectionReason}`,
		});
	});

	revalidateAll();
	emitRealtimeEvent("assessment:evaluated", { submissionId: input.submissionId, rejected: true });
	await sendRealtimeNotification(
		submission.studentId,
		"Assessment Revision Required",
		`Revision requested for "${submission.assessment.title}": ${input.rejectionReason}`,
		{ type: "internal-assessments", id: submission.assessmentId }
	);
	return { success: true };
}

// ======================== UTILITY QUERIES ========================

export async function getAvailableBatches() {
	const { role } = await requireRoleHybrid(["hod", "faculty"]);
	const clerkId = await requireAuthHybrid();
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found");

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
	await requireRoleHybrid(["hod"]);

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
