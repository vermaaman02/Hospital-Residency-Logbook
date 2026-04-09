/**
 * @module Rotation Posting Actions
 * @description Server actions for CRUD operations on rotation postings.
 * Supports student CRUD, faculty review/sign, HOD oversight.
 * Faculty can only see students in their assigned batch.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 * @see prisma/schema.prisma — RotationPosting model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	rotationPostingSchema,
	type RotationPostingInput,
} from "@/lib/validators/administrative";
import { revalidatePath } from "next/cache";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";
import { validateRotationEnabledForStudentDetails } from "@/actions/rotation-posting-config";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RotationScopeSource {
	batchId: string | null;
	batch: string | null;
	currentSemester: number | null;
	departmentId: string | null;
	department: string | null;
}

async function resolveRotationScope(source: RotationScopeSource) {
	const batchById =
		source.batchId ?
			await prisma.batch.findUnique({
				where: { id: source.batchId },
				select: { id: true, currentSemester: true },
			})
		:	null;
	const batchByName =
		!batchById && source.batch ?
			await prisma.batch.findFirst({
				where: { name: source.batch },
				select: { id: true, currentSemester: true },
			})
		:	null;
	const fallbackBatch =
		!batchById && !batchByName ?
			await prisma.batch.findFirst({
				where: { isActive: true },
				orderBy: { name: "asc" },
				select: { id: true, currentSemester: true },
			})
		:	null;

	const departmentById =
		source.departmentId ?
			await prisma.department.findUnique({
				where: { id: source.departmentId },
				select: { id: true },
			})
		:	null;
	const departmentByName =
		!departmentById && source.department ?
			await prisma.department.findFirst({
				where: { name: source.department },
				select: { id: true },
			})
		:	null;
	const fallbackDepartment =
		!departmentById && !departmentByName ?
			await prisma.department.findFirst({
				where: { isActive: true },
				orderBy: { name: "asc" },
				select: { id: true },
			})
		:	null;

	return {
		batchId: batchById?.id ?? batchByName?.id ?? fallbackBatch?.id ?? null,
		semester:
			source.currentSemester ??
			batchById?.currentSemester ??
			batchByName?.currentSemester ??
			fallbackBatch?.currentSemester ??
			null,
		departmentId:
			departmentById?.id ??
			departmentByName?.id ??
			fallbackDepartment?.id ??
			null,
	};
}

// ======================== STUDENT ACTIONS ========================

/**
 * Create a new rotation posting entry.
 */
export async function createRotationPosting(data: RotationPostingInput) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: {
			id: true,
			batchId: true,
			batch: true,
			currentSemester: true,
			departmentId: true,
			department: true,
		},
	});
	if (!user) throw new Error("User not found in database");
	const rotationScope = await resolveRotationScope(user);

	// Check if rotation is enabled - throws error if disabled
	await validateRotationEnabledForStudentDetails(
		validated.rotationName,
		rotationScope.batchId,
		rotationScope.semester,
		rotationScope.departmentId,
	);

	// Validate rotation name
	const rotationConfig = ROTATION_POSTINGS.find(
		(r) => r.name === validated.rotationName,
	);
	if (!rotationConfig) throw new Error("Invalid rotation posting name");

	// Auto Sl. No.
	const lastEntry = await prisma.rotationPosting.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});
	const slNo = (lastEntry?.slNo ?? 0) + 1;

	// Calculate days if both dates
	let durationDays: number | null = null;
	if (validated.startDate && validated.endDate) {
		const diffTime =
			validated.endDate.getTime() - validated.startDate.getTime();
		durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (durationDays < 0) throw new Error("End date must be after start date");
	}

	// Validate faculty if provided
	if (validated.facultyId) {
		const faculty = await prisma.user.findUnique({
			where: { id: validated.facultyId },
		});
		if (!faculty || (faculty.role !== "FACULTY" && faculty.role !== "HOD")) {
			throw new Error("Invalid faculty selected");
		}
	}

	const entry = await prisma.rotationPosting.create({
		data: {
			userId: user.id,
			slNo,
			rotationName: validated.rotationName,
			isElective: rotationConfig.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
			durationDays,
			facultyId: validated.facultyId || null,
			status: "DRAFT",
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Update an existing rotation posting entry.
 */
export async function updateRotationPosting(
	id: string,
	data: RotationPostingInput,
) {
	const userId = await requireAuth();
	const validated = rotationPostingSchema.parse(data);

	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: {
			id: true,
			batchId: true,
			batch: true,
			currentSemester: true,
			departmentId: true,
			department: true,
		},
	});
	if (!user) throw new Error("User not found");
	const rotationScope = await resolveRotationScope(user);

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found or access denied");
	if (existing.status === "SIGNED")
		throw new Error("Cannot edit a signed entry");

	// Check if rotation is enabled - throws error if disabled
	await validateRotationEnabledForStudentDetails(
		validated.rotationName,
		rotationScope.batchId,
		rotationScope.semester,
		rotationScope.departmentId,
	);

	const rotationConfig = ROTATION_POSTINGS.find(
		(r) => r.name === validated.rotationName,
	);
	if (!rotationConfig) throw new Error("Invalid rotation posting name");

	let durationDays: number | null = null;
	if (validated.startDate && validated.endDate) {
		const diffTime =
			validated.endDate.getTime() - validated.startDate.getTime();
		durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (durationDays < 0) throw new Error("End date must be after start date");
	}

	if (validated.facultyId) {
		const faculty = await prisma.user.findUnique({
			where: { id: validated.facultyId },
		});
		if (!faculty || (faculty.role !== "FACULTY" && faculty.role !== "HOD")) {
			throw new Error("Invalid faculty selected");
		}
	}

	const entry = await prisma.rotationPosting.update({
		where: { id },
		data: {
			rotationName: validated.rotationName,
			isElective: rotationConfig.isElective,
			startDate: validated.startDate,
			endDate: validated.endDate,
			totalDuration: validated.totalDuration,
			durationDays,
			facultyId: validated.facultyId || null,
		},
	});

	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true, data: entry };
}

/**
 * Submit a rotation posting for faculty review.
 */
export async function submitRotationPosting(id: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: {
			id: true,
			batchId: true,
			batch: true,
			currentSemester: true,
			departmentId: true,
			department: true,
		},
	});
	if (!user) throw new Error("User not found");
	const rotationScope = await resolveRotationScope(user);

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id },
	});
	if (!existing) throw new Error("Entry not found");
	if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
		throw new Error("Cannot submit this entry");
	}

	// Check if rotation is enabled - throws error if disabled
	await validateRotationEnabledForStudentDetails(
		existing.rotationName,
		rotationScope.batchId,
		rotationScope.semester,
		rotationScope.departmentId,
	);

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	return { success: true };
}

/**
 * Delete a draft rotation posting.
 */
export async function deleteRotationPosting(id: string) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const existing = await prisma.rotationPosting.findFirst({
		where: { id, userId: user.id, status: "DRAFT" as never },
	});
	if (!existing) throw new Error("Only draft entries can be deleted");

	await prisma.rotationPosting.delete({ where: { id } });
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Get all rotation postings for the current student.
 */
export async function getMyRotationPostings() {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const postings = await prisma.rotationPosting.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});

	// Fetch signer info for each SIGNED posting
	const postingsWithSigners = await Promise.all(
		postings.map(async (posting) => {
			if (posting.status === "SIGNED") {
				const signature = await prisma.digitalSignature.findFirst({
					where: {
						entityType: "RotationPosting",
						entityId: posting.id,
					},
					include: {
						signedBy: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				});
				return {
					...posting,
					signedByName:
						signature ?
							`${signature.signedBy.firstName} ${signature.signedBy.lastName}`
						:	null,
				};
			}
			return {
				...posting,
				signedByName: null,
			};
		}),
	);

	return postingsWithSigners;
}

// ======================== FACULTY & HOD ACTIONS ========================

/**
 * Faculty: Get postings for students in assigned batches.
 * HOD: Get all postings.
 */
export async function getRotationPostingsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	let postings;

	if (role === "hod") {
		postings = await prisma.rotationPosting.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						batchRelation: { select: { name: true } },
						currentSemester: true,
					},
				},
			},
		});
	} else {
		// Faculty: batch-scoped
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});

		postings = await prisma.rotationPosting.findMany({
			where: { userId: { in: students.map((s) => s.id) } },
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						batchRelation: { select: { name: true } },
						currentSemester: true,
					},
				},
			},
		});
	}

	// Fetch signer info for each SIGNED posting
	const postingsWithSigners = await Promise.all(
		postings.map(async (posting) => {
			if (posting.status === "SIGNED") {
				const signature = await prisma.digitalSignature.findFirst({
					where: {
						entityType: "RotationPosting",
						entityId: posting.id,
					},
					include: {
						signedBy: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				});
				return {
					...posting,
					signedByName:
						signature ?
							`${signature.signedBy.firstName} ${signature.signedBy.lastName}`
						:	null,
				};
			}
			return {
				...posting,
				signedByName: null,
			};
		}),
	);

	return postingsWithSigners;
}

/**
 * Get postings for a specific student (faculty/HOD).
 */
export async function getStudentRotationPostings(studentId: string) {
	await requireRole(["faculty", "hod"]);
	const postings = await prisma.rotationPosting.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});

	// Fetch signer info for each SIGNED posting
	const postingsWithSigners = await Promise.all(
		postings.map(async (posting) => {
			if (posting.status === "SIGNED") {
				const signature = await prisma.digitalSignature.findFirst({
					where: {
						entityType: "RotationPosting",
						entityId: posting.id,
					},
					include: {
						signedBy: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				});
				return {
					...posting,
					signedByName:
						signature ?
							`${signature.signedBy.firstName} ${signature.signedBy.lastName}`
						:	null,
				};
			}
			return {
				...posting,
				signedByName: null,
			};
		}),
	);

	return postingsWithSigners;
}

/**
 * Faculty/HOD: sign a rotation posting.
 */
export async function signRotationPosting(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "SIGNED", facultyRemark: remark ?? null },
	});

	await prisma.digitalSignature.create({
		data: {
			signedById: user.id,
			entityType: "RotationPosting",
			entityId: id,
			remark,
		},
	});

	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Faculty/HOD: reject/request revision.
 */
export async function rejectRotationPosting(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.rotationPosting.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") throw new Error("Entry is not submitted");

	await prisma.rotationPosting.update({
		where: { id },
		data: { status: "NEEDS_REVISION", facultyRemark: remark },
	});

	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/student/rotation-postings");
	return { success: true };
}

/**
 * Get faculty users for dropdown (batch-scoped for students).
 */
export async function getAllFacultyForDropdown() {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	if (user.role === "STUDENT" && user.batchId) {
		const batchFaculty = await prisma.facultyBatchAssignment.findMany({
			where: { batchId: user.batchId },
			include: {
				faculty: {
					select: { id: true, firstName: true, lastName: true, email: true },
				},
			},
		});
		return batchFaculty.map((bf) => bf.faculty);
	}

	return prisma.user.findMany({
		where: { role: { in: ["FACULTY" as never, "HOD" as never] } },
		select: { id: true, firstName: true, lastName: true, email: true },
		orderBy: { firstName: "asc" },
	});
}

// ======================== ATTACHMENT ACTIONS ========================

/**
 * Student: Add attachment to a rotation posting row.
 */
export async function addRotationPostingAttachment(
	postingId: string,
	attachmentUrl: string,
) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const posting = await prisma.rotationPosting.findUnique({
		where: { id: postingId },
	});
	if (!posting) throw new Error("Rotation posting not found");
	if (posting.userId !== user.id)
		throw new Error("Not authorized to modify this posting");

	// Add attachment URL to the array if not already present
	const currentAttachments = posting.attachments || [];
	if (!currentAttachments.includes(attachmentUrl)) {
		currentAttachments.push(attachmentUrl);
	}

	await prisma.rotationPosting.update({
		where: { id: postingId },
		data: { attachments: currentAttachments },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	return { success: true };
}

/**
 * Student: Remove attachment from a rotation posting row.
 */
export async function removeRotationPostingAttachment(
	postingId: string,
	attachmentUrl: string,
) {
	const userId = await requireAuth();
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) throw new Error("User not found");

	const posting = await prisma.rotationPosting.findUnique({
		where: { id: postingId },
	});
	if (!posting) throw new Error("Rotation posting not found");
	if (posting.userId !== user.id)
		throw new Error("Not authorized to modify this posting");

	// Remove attachment URL from the array
	const updatedAttachments = (posting.attachments || []).filter(
		(url) => url !== attachmentUrl,
	);

	await prisma.rotationPosting.update({
		where: { id: postingId },
		data: { attachments: updatedAttachments },
	});

	revalidatePath("/dashboard/student/rotation-postings");
	revalidatePath("/dashboard/faculty/rotation-postings");
	revalidatePath("/dashboard/hod/rotation-postings");
	return { success: true };
}

/**
 * Get attachments for a rotation posting (all roles can view).
 */
export async function getRotationPostingAttachments(postingId: string) {
	await requireAuth();

	const posting = await prisma.rotationPosting.findUnique({
		where: { id: postingId },
		select: {
			id: true,
			attachments: true,
			user: {
				select: { id: true, firstName: true, lastName: true },
			},
		},
	});

	if (!posting) throw new Error("Rotation posting not found");
	return posting;
}

// ======================== PDF GENERATION ========================

/**
 * Generate a PDF of rotation postings form for student to fill manually.
 * Landscape format with 20 rows (7 core + 13 electives).
 */
export async function generateRotationPostingsPDF(userId: string) {
	const user = await requireAuth();
	const currentUser = await prisma.user.findUnique({
		where: { clerkId: user },
	});
	if (!currentUser) throw new Error("User not found");

	// Verify the student ID matches or user is HOD/Faculty
	if (currentUser.role === "STUDENT" && currentUser.id !== userId) {
		throw new Error("Not authorized to generate this PDF");
	}

	// Fetch student info
	const student = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			batchId: true,
			currentSemester: true,
			departmentId: true,
			batchRelation: { select: { name: true } },
		},
	});

	if (!student) throw new Error("Student not found");

	// Fetch enabled rotations for this student
	let enabledRotationSlNos: Set<number> = new Set(
		ROTATION_POSTINGS.map((r) => r.slNo),
	); // Default to all enabled
	if (student.batchId && student.currentSemester && student.departmentId) {
		const configs = await prisma.rotationPostingConfiguration.findMany({
			where: {
				batchId: student.batchId,
				semester: student.currentSemester,
				departmentId: student.departmentId,
			},
			select: { rotationSlNo: true, isEnabled: true },
		});
		if (configs.length > 0) {
			// If configs exist, only include enabled ones
			enabledRotationSlNos = new Set(
				configs.filter((c) => c.isEnabled).map((c) => c.rotationSlNo),
			);
		}
	}

	const existingPostings = await prisma.rotationPosting.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
	const signatureRecords = await prisma.digitalSignature.findMany({
		where: {
			entityType: "RotationPosting",
			entityId: { in: existingPostings.map((entry) => entry.id) },
		},
		include: {
			signedBy: {
				select: { firstName: true, lastName: true },
			},
		},
	});
	const signatureByEntity = new Map(
		signatureRecords.map((record) => [
			record.entityId,
			`${record.signedBy.firstName} ${record.signedBy.lastName}`,
		]),
	);
	const postingsBySlNo = new Map(
		existingPostings.map((entry) => [entry.slNo, entry]),
	);

	function formatDateValue(date: Date | string | null | undefined): string {
		if (!date) return "";
		try {
			return new Date(date).toLocaleDateString("en-IN", {
				day: "2-digit",
				month: "2-digit",
				year: "2-digit",
			});
		} catch {
			return typeof date === "string" ? date : date.toString();
		}
	}

	// Create PDF in landscape orientation
	const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
	const autoTableFn =
		(
			autoTable as unknown as {
				default?: typeof autoTable;
				autoTable?: typeof autoTable;
			}
		).default ??
		(autoTable as unknown as { autoTable?: typeof autoTable }).autoTable ??
		autoTable;

	// Set up fonts
	doc.setFontSize(14);
	doc.text(
		"LOG OF ROTATION POSTINGS DURING PG IN EMERGENCY MEDICINE",
		148,
		15,
		{
			align: "center",
		},
	);

	// Student info section
	doc.setFontSize(10);
	doc.text(
		`Student: ${student.firstName} ${student.lastName}  |  Batch: ${student.batchRelation?.name || "N/A"}  |  Date: _______________`,
		10,
		25,
	);

	// Manual table drawing
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 10;

	const headers = [
		"Sl. No.",
		"Rotation Posting",
		"Date",
		"Duration",
		"Faculty Signature",
	];

	// Filter rotations to only include enabled ones
	const enabledRotations = ROTATION_POSTINGS.filter((rotation) =>
		enabledRotationSlNos.has(rotation.slNo),
	);

	const rows = enabledRotations.map((rotation) => {
		const existing = postingsBySlNo.get(rotation.slNo);
		const dateText =
			existing ?
				`${formatDateValue(existing.startDate)}${existing.startDate && existing.endDate ? " - " : ""}${formatDateValue(existing.endDate)}`.trim()
			:	"";
		const durationText =
			existing?.durationDays ? existing.durationDays.toString() : "";
		const signatureText =
			existing ? (signatureByEntity.get(existing.id) ?? "") : "";

		return [
			rotation.slNo.toString(),
			rotation.name,
			dateText,
			durationText,
			signatureText,
		];
	});

	autoTableFn(doc, {
		head: [headers],
		body: rows,
		startY: 35,
		theme: "grid",
		styles: {
			font: "helvetica",
			fontSize: 9,
			cellPadding: 3,
			overflow: "ellipsize",
		},
		headStyles: {
			fillColor: [41, 128, 185],
			textColor: [255, 255, 255],
			fontStyle: "bold",
		},
		columnStyles: {
			0: { cellWidth: 12 },
			1: { cellWidth: 120 },
			2: { cellWidth: 45 },
			3: { cellWidth: 40 },
			4: { cellWidth: 60 },
		},
		margin: { left: margin, right: margin },
		didDrawPage: (data: { pageNumber: number }) => {
			doc.setFontSize(8);
			doc.text(
				`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
				pageWidth - margin,
				pageHeight - 5,
				{ align: "right" },
			);
		},
	});

	const tableEndY =
		(doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
			?.finalY ?? 35;
	let finalY = tableEndY + 10;
	if (finalY > pageHeight - margin) {
		doc.addPage();
		finalY = 25;
	}
	doc.setFontSize(9);
	doc.text("Student Signature: __________________", margin, finalY);
	doc.text("Faculty Signature: __________________", margin + 70, finalY);
	doc.text("HOD Signature: __________________", margin + 130, finalY);

	// Return PDF as base64 for download
	const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
	return pdfBuffer.toString("base64");
}
