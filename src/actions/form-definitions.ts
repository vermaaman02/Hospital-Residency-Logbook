/**
 * @module Form Definitions Actions
 * @description Server actions for managing form definitions and providing
 * department-aware form visibility for students and faculty.
 *
 * Core query paths:
 * - Student: batchId → DepartmentBatch → Department → DepartmentForm → FormDefinition
 * - Faculty: FacultyBatchAssignment → Batch → DepartmentBatch → Department → DepartmentForm → FormDefinition
 * - HOD: sees all forms
 */

"use server";

import { requireRole } from "@/lib/auth";
import { ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ======================== FORM DEFINITIONS CRUD ========================

/**
 * Get all form definitions (HOD only).
 */
export async function getAllFormDefinitions() {
	await requireRole(["hod"]);

	const forms = await prisma.formDefinition.findMany({
		orderBy: { sortOrder: "asc" },
		include: {
			_count: { select: { departmentForms: true } },
		},
	});

	return forms.map((f) => ({
		id: f.id,
		slug: f.slug,
		title: f.title,
		description: f.description,
		category: f.category,
		icon: f.icon,
		route: f.route,
		isActive: f.isActive,
		sortOrder: f.sortOrder,
		departmentCount: f._count.departmentForms,
	}));
}

/**
 * Toggle a form definition globally (HOD only).
 */
export async function toggleFormDefinition(formId: string, isActive: boolean) {
	await requireRole(["hod"]);

	await prisma.formDefinition.update({
		where: { id: formId },
		data: { isActive },
	});

	revalidatePath("/dashboard/hod/manage-system");
	return { success: true };
}

// ======================== DEPARTMENT-AWARE FORM VISIBILITY ========================

export interface ActiveForm {
	slug: string;
	title: string;
	category: string | null;
	icon: string | null;
	route: string;
}

/**
 * Get active forms for the current user based on their department.
 *
 * Logic:
 * - Student: Looks up their batchId → finds departments that contain that batch
 *            → returns forms enabled for those departments
 * - Faculty: Looks up their FacultyBatchAssignment → finds departments
 *            → returns forms enabled for those departments
 * - HOD: Returns ALL active form definitions (no department filter)
 *
 * If user has no department or batch, returns empty array (unassigned).
 */
export async function getActiveFormsForUser(): Promise<ActiveForm[]> {
	const user = await ensureUserInDb();
	if (!user) return [];

	const role = user.role;

	// HOD sees everything
	if (role === "HOD") {
		const forms = await prisma.formDefinition.findMany({
			where: { isActive: true },
			orderBy: { sortOrder: "asc" },
			select: { slug: true, title: true, category: true, icon: true, route: true },
		});
		return forms;
	}

	// Student: find departments via batch
	if (role === "STUDENT") {
		if (!user.batchId) return []; // unassigned — no forms

		// Find departments this batch belongs to
		const departmentBatches = await prisma.departmentBatch.findMany({
			where: { batchId: user.batchId },
			select: { departmentId: true },
		});

		if (departmentBatches.length === 0) return []; // batch not in any department

		const departmentIds = departmentBatches.map((db) => db.departmentId);

		// Get active forms for these departments
		const departmentForms = await prisma.departmentForm.findMany({
			where: {
				departmentId: { in: departmentIds },
				isActive: true,
				formDefinition: { isActive: true },
			},
			include: {
				formDefinition: {
					select: {
						slug: true,
						title: true,
						category: true,
						icon: true,
						route: true,
						sortOrder: true,
					},
				},
			},
			orderBy: { formDefinition: { sortOrder: "asc" } },
		});

		// Deduplicate (student may be in multiple departments via batch)
		const seen = new Set<string>();
		const result: ActiveForm[] = [];
		for (const df of departmentForms) {
			if (!seen.has(df.formDefinition.slug)) {
				seen.add(df.formDefinition.slug);
				result.push({
					slug: df.formDefinition.slug,
					title: df.formDefinition.title,
					category: df.formDefinition.category,
					icon: df.formDefinition.icon,
					route: df.formDefinition.route,
				});
			}
		}
		return result;
	}

	// Faculty: find departments via faculty batch assignments
	if (role === "FACULTY") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});

		if (batchAssignments.length === 0) return []; // no batch assignments

		const batchIds = batchAssignments.map((ba) => ba.batchId);

		// Find departments these batches belong to
		const departmentBatches = await prisma.departmentBatch.findMany({
			where: { batchId: { in: batchIds } },
			select: { departmentId: true },
		});

		if (departmentBatches.length === 0) return [];

		const departmentIds = [
			...new Set(departmentBatches.map((db) => db.departmentId)),
		];

		// Get active forms for these departments
		const departmentForms = await prisma.departmentForm.findMany({
			where: {
				departmentId: { in: departmentIds },
				isActive: true,
				formDefinition: { isActive: true },
			},
			include: {
				formDefinition: {
					select: {
						slug: true,
						title: true,
						category: true,
						icon: true,
						route: true,
						sortOrder: true,
					},
				},
			},
			orderBy: { formDefinition: { sortOrder: "asc" } },
		});

		// Deduplicate
		const seen = new Set<string>();
		const result: ActiveForm[] = [];
		for (const df of departmentForms) {
			if (!seen.has(df.formDefinition.slug)) {
				seen.add(df.formDefinition.slug);
				result.push({
					slug: df.formDefinition.slug,
					title: df.formDefinition.title,
					category: df.formDefinition.category,
					icon: df.formDefinition.icon,
					route: df.formDefinition.route,
				});
			}
		}
		return result;
	}

	return [];
}

/**
 * Check if a user is "unassigned" (no department/batch).
 * Used by the dashboard to show the "Setup Required" page.
 */
export async function isUserSetupComplete(): Promise<{
	isComplete: boolean;
	missingDepartment: boolean;
	missingBatch: boolean;
}> {
	const user = await ensureUserInDb();
	if (!user) return { isComplete: false, missingDepartment: true, missingBatch: true };

	// HOD is always "complete"
	if (user.role === "HOD") {
		return { isComplete: true, missingDepartment: false, missingBatch: false };
	}

	const missingBatch = !user.batchId;

	// Check if their batch is linked to any department
	let missingDepartment = true;
	if (user.batchId) {
		const deptBatch = await prisma.departmentBatch.findFirst({
			where: { batchId: user.batchId },
		});
		missingDepartment = !deptBatch;
	}

	return {
		isComplete: !missingBatch && !missingDepartment,
		missingDepartment,
		missingBatch,
	};
}
