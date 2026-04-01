/**
 * @module Department Management Actions
 * @description Server actions for HOD to manage departments, assign batches to departments,
 * and control which forms are active per department.
 *
 * Core relationships:
 * - Department → DepartmentBatch → Batch → Users (students/faculty)
 * - Department → DepartmentForm → FormDefinition
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const REVALIDATE_PATHS = [
	"/dashboard/hod/manage-system",
	"/dashboard/hod/manage-users",
];

function revalidate() {
	for (const path of REVALIDATE_PATHS) {
		revalidatePath(path);
	}
}

// ======================== VALIDATORS ========================

const createDepartmentSchema = z.object({
	name: z.string().min(1, "Department name is required").max(200),
	code: z
		.string()
		.min(1, "Department code is required")
		.max(10)
		.transform((s) => s.toUpperCase()),
	description: z.string().max(500).optional(),
});

const updateDepartmentSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(200).optional(),
	code: z
		.string()
		.min(1)
		.max(10)
		.transform((s) => s.toUpperCase())
		.optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().optional(),
});

// ======================== DEPARTMENT CRUD ========================

/**
 * Get all departments with batch/form/user counts (HOD only).
 */
export async function getAllDepartments() {
	await requireRole(["hod"]);

	const departments = await prisma.department.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			_count: {
				select: {
					departmentBatches: true,
					departmentForms: true,
					users: true,
				},
			},
			departmentBatches: {
				include: {
					batch: {
						select: {
							id: true,
							name: true,
							isActive: true,
							currentSemester: true,
							_count: {
								select: {
									students: true,
									facultyAssignments: true,
								},
							},
						},
					},
				},
			},
			departmentForms: {
				include: {
					formDefinition: {
						select: { id: true, slug: true, title: true, category: true, icon: true },
					},
				},
			},
		},
	});

	return departments.map((d) => ({
		id: d.id,
		name: d.name,
		code: d.code,
		description: d.description,
		isActive: d.isActive,
		createdAt: d.createdAt.toISOString(),
		batchCount: d._count.departmentBatches,
		formCount: d._count.departmentForms,
		userCount: d._count.users,
		batches: d.departmentBatches.map((db) => ({
			id: db.batch.id,
			name: db.batch.name,
			isActive: db.batch.isActive,
			currentSemester: db.batch.currentSemester,
			studentCount: db.batch._count.students,
			facultyCount: db.batch._count.facultyAssignments,
		})),
		forms: d.departmentForms.map((df) => ({
			id: df.id,
			formDefinitionId: df.formDefinition.id,
			slug: df.formDefinition.slug,
			title: df.formDefinition.title,
			category: df.formDefinition.category,
			icon: df.formDefinition.icon,
			isActive: df.isActive,
		})),
	}));
}

/**
 * Create a new department (HOD only).
 */
export async function createDepartment(data: {
	name: string;
	code: string;
	description?: string;
}) {
	await requireRole(["hod"]);

	const validated = createDepartmentSchema.parse(data);

	// Check for duplicate name or code
	const existing = await prisma.department.findFirst({
		where: {
			OR: [{ name: validated.name }, { code: validated.code }],
		},
	});
	if (existing) {
		return {
			success: false,
			message:
				existing.name === validated.name
					? "A department with this name already exists"
					: "A department with this code already exists",
		};
	}

	const department = await prisma.department.create({
		data: {
			name: validated.name,
			code: validated.code,
			description: validated.description ?? null,
		},
	});

	revalidate();
	return { success: true, department };
}

/**
 * Update a department (HOD only).
 */
export async function updateDepartment(data: {
	id: string;
	name?: string;
	code?: string;
	description?: string;
	isActive?: boolean;
}) {
	await requireRole(["hod"]);

	const validated = updateDepartmentSchema.parse(data);

	// Check uniqueness of name/code if changed
	if (validated.name || validated.code) {
		const conditions = [];
		if (validated.name) conditions.push({ name: validated.name });
		if (validated.code) conditions.push({ code: validated.code });

		const existing = await prisma.department.findFirst({
			where: {
				OR: conditions,
				id: { not: validated.id },
			},
		});
		if (existing) {
			return {
				success: false,
				message: "A department with this name or code already exists",
			};
		}
	}

	const updateData: Record<string, unknown> = {};
	if (validated.name !== undefined) updateData.name = validated.name;
	if (validated.code !== undefined) updateData.code = validated.code;
	if (validated.description !== undefined)
		updateData.description = validated.description;
	if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

	const department = await prisma.department.update({
		where: { id: validated.id },
		data: updateData,
	});

	revalidate();
	return { success: true, department };
}

/**
 * Delete a department (HOD only).
 * Blocked if any users are assigned or if data forms are linked.
 */
export async function deleteDepartment(departmentId: string) {
	await requireRole(["hod"]);

	// Check for assigned users
	const userCount = await prisma.user.count({
		where: { departmentId },
	});
	if (userCount > 0) {
		return {
			success: false,
			message: `Cannot delete department with ${userCount} user(s) assigned. Remove users first.`,
		};
	}

	// Check for linked batches
	const batchCount = await prisma.departmentBatch.count({
		where: { departmentId },
	});
	if (batchCount > 0) {
		return {
			success: false,
			message: `Cannot delete department with ${batchCount} batch(es) linked. Remove batch assignments first.`,
		};
	}

	// Clean up DepartmentForm links before deleting
	await prisma.departmentForm.deleteMany({ where: { departmentId } });

	await prisma.department.delete({ where: { id: departmentId } });

	revalidate();
	return { success: true };
}

// ======================== DEPARTMENT-BATCH ASSIGNMENTS ========================

/**
 * Assign a batch to a department (HOD only).
 */
export async function assignBatchToDepartment(
	batchId: string,
	departmentId: string,
) {
	await requireRole(["hod"]);

	const existing = await prisma.departmentBatch.findUnique({
		where: { departmentId_batchId: { departmentId, batchId } },
	});
	if (existing) {
		return {
			success: false,
			message: "Batch is already assigned to this department",
		};
	}

	await prisma.departmentBatch.create({
		data: { departmentId, batchId },
	});

	revalidate();
	return { success: true, message: "Batch assigned to department" };
}

/**
 * Remove a batch from a department (HOD only).
 */
export async function removeBatchFromDepartment(
	batchId: string,
	departmentId: string,
) {
	await requireRole(["hod"]);

	await prisma.departmentBatch.delete({
		where: { departmentId_batchId: { departmentId, batchId } },
	});

	revalidate();
	return { success: true, message: "Batch removed from department" };
}

// ======================== DEPARTMENT-FORM MANAGEMENT ========================

/**
 * Toggle a form on/off for a department (HOD only).
 * Creates the DepartmentForm junction if it doesn't exist.
 */
export async function toggleFormForDepartment(
	departmentId: string,
	formDefinitionId: string,
	isActive: boolean,
) {
	await requireRole(["hod"]);

	await prisma.departmentForm.upsert({
		where: {
			departmentId_formDefinitionId: { departmentId, formDefinitionId },
		},
		update: { isActive },
		create: { departmentId, formDefinitionId, isActive },
	});

	revalidate();
	return { success: true };
}

/**
 * Bulk enable all forms for a department (HOD only).
 * Used when setting up a new department.
 */
export async function enableAllFormsForDepartment(departmentId: string) {
	await requireRole(["hod"]);

	const allForms = await prisma.formDefinition.findMany({
		where: { isActive: true },
		select: { id: true },
	});

	for (const form of allForms) {
		await prisma.departmentForm.upsert({
			where: {
				departmentId_formDefinitionId: {
					departmentId,
					formDefinitionId: form.id,
				},
			},
			update: { isActive: true },
			create: { departmentId, formDefinitionId: form.id, isActive: true },
		});
	}

	revalidate();
	return {
		success: true,
		message: `${allForms.length} forms enabled for department`,
	};
}

// ======================== ASSIGN USER TO DEPARTMENT ========================

/**
 * Assign a user to a department (HOD only).
 */
export async function assignUserToDepartment(
	userId: string,
	departmentId: string,
) {
	await requireRole(["hod"]);

	const dept = await prisma.department.findUnique({
		where: { id: departmentId },
	});
	if (!dept) return { success: false, message: "Department not found" };

	await prisma.user.update({
		where: { id: userId },
		data: {
			departmentId,
			department: dept.name, // sync legacy field
		},
	});

	revalidate();
	return { success: true, message: `User assigned to ${dept.name}` };
}

/**
 * Remove a user from their department (HOD only).
 */
export async function removeUserFromDepartment(userId: string) {
	await requireRole(["hod"]);

	await prisma.user.update({
		where: { id: userId },
		data: { departmentId: null },
	});

	revalidate();
	return { success: true };
}

// ======================== DEPARTMENT TREE (for React Flow canvas) ========================

/**
 * Get the full department tree for the canvas visualization.
 * Returns: Departments → Batches → Students/Faculty + Forms
 */
export async function getDepartmentTree() {
	await requireRole(["hod"]);

	const departments = await prisma.department.findMany({
		where: { isActive: true },
		include: {
			departmentBatches: {
				include: {
					batch: {
						include: {
							students: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
									role: true,
									currentSemester: true,
								},
								take: 50, // limit for canvas performance
							},
							facultyAssignments: {
								include: {
									faculty: {
										select: {
											id: true,
											firstName: true,
											lastName: true,
											email: true,
											role: true,
										},
									},
								},
							},
						},
					},
				},
			},
			departmentForms: {
				where: { isActive: true },
				include: {
					formDefinition: {
						select: {
							id: true,
							slug: true,
							title: true,
							category: true,
							icon: true,
						},
					},
				},
			},
		},
	});

	// Get unassigned users (no department)
	const unassignedUsers = await prisma.user.findMany({
		where: { departmentId: null },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			role: true,
			batchId: true,
		},
		take: 100,
	});

	return { departments, unassignedUsers };
}
