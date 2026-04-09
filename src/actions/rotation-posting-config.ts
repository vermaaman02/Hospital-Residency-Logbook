/**
 * @module getRotationPostingConfigurations
 * @description Server action to fetch rotation posting configurations
 * and merge with ROTATION_POSTINGS constant
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";

export interface RotationConfigWithDetails {
	rotationSlNo: number;
	rotationName: string;
	isElective: boolean;
	isEnabled: boolean;
	configId?: string;
}

/**
 * Fetch all rotation posting configurations for a specific batch/semester/department
 * and merge with ROTATION_POSTINGS constant to return full details
 */
export async function getRotationPostingConfigurations(
	batchId: string,
	semester: number,
	departmentId: string,
): Promise<RotationConfigWithDetails[]> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	// Fetch existing configurations from database
	const configs = await prisma.rotationPostingConfiguration.findMany({
		where: {
			batchId,
			semester,
			departmentId,
		},
	});

	// Create a map for quick lookup
	const configMap = new Map(configs.map((c) => [c.rotationSlNo, c]));

	// Merge with ROTATION_POSTINGS constant
	const result: RotationConfigWithDetails[] = ROTATION_POSTINGS.map(
		(rotation) => ({
			rotationSlNo: rotation.slNo,
			rotationName: rotation.name,
			isElective: rotation.isElective,
			isEnabled: configMap.get(rotation.slNo)?.isEnabled ?? true, // Default to enabled if no config exists
			configId: configMap.get(rotation.slNo)?.id,
		}),
	);

	return result;
}

/**
 * Update a single rotation posting configuration
 */
export async function updateRotationPostingConfig(
	rotationSlNo: number,
	batchId: string,
	semester: number,
	departmentId: string,
	isEnabled: boolean,
): Promise<void> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	await prisma.rotationPostingConfiguration.upsert({
		where: {
			rotationSlNo_batchId_semester_departmentId: {
				rotationSlNo,
				batchId,
				semester,
				departmentId,
			},
		},
		update: {
			isEnabled,
			updatedAt: new Date(),
		},
		create: {
			rotationSlNo,
			batchId,
			semester,
			departmentId,
			isEnabled,
		},
	});
}

/**
 * Bulk update multiple rotation posting configurations
 */
export async function bulkUpdateRotationPostingConfigs(
	batchId: string,
	semester: number,
	departmentId: string,
	updates: Array<{ rotationSlNo: number; isEnabled: boolean }>,
): Promise<void> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	// Execute all updates in parallel
	await Promise.all(
		updates.map((update) =>
			prisma.rotationPostingConfiguration.upsert({
				where: {
					rotationSlNo_batchId_semester_departmentId: {
						rotationSlNo: update.rotationSlNo,
						batchId,
						semester,
						departmentId,
					},
				},
				update: {
					isEnabled: update.isEnabled,
					updatedAt: new Date(),
				},
				create: {
					rotationSlNo: update.rotationSlNo,
					batchId,
					semester,
					departmentId,
					isEnabled: update.isEnabled,
				},
			}),
		),
	);
}

/**
 * Get enabled rotations for a student
 * Public function (any authenticated user can call)
 * Returns only the list of enabled rotation slNos for a given batch/semester/department
 */
export async function getEnabledRotationSlNos(
	batchId: string,
	semester: number,
	departmentId: string,
): Promise<Set<number>> {
	// Fetch configurations (allow all authenticated users to read)
	const configs = await prisma.rotationPostingConfiguration.findMany({
		where: {
			batchId,
			semester,
			departmentId,
			isEnabled: true,
		},
		select: { rotationSlNo: true },
	});

	return new Set(configs.map((c) => c.rotationSlNo));
}

export async function validateRotationEnabledForStudentDetails(
	rotationName: string,
	batchId?: string | null,
	semester?: number | null,
	departmentId?: string | null,
): Promise<void> {
	if (!batchId || !semester || !departmentId) {
		throw new Error(
			"Batch, semester, and department must be assigned before filling rotation postings.",
		);
	}

	const rotation = ROTATION_POSTINGS.find((r) => r.name === rotationName);
	if (!rotation) {
		throw new Error("Invalid rotation posting name");
	}

	const config = await prisma.rotationPostingConfiguration.findUnique({
		where: {
			rotationSlNo_batchId_semester_departmentId: {
				rotationSlNo: rotation.slNo,
				batchId,
				semester,
				departmentId,
			},
		},
	});

	if (config?.isEnabled === false) {
		throw new Error(
			`Rotation posting "${rotationName}" is disabled for your batch, semester, or department.`,
		);
	}
}

/**
 * Get enabled rotations with details for student dashboard
 * Returns full rotation objects for enabled rotations, merged with ROTATION_POSTINGS constant
 */
export async function getEnabledRotationsForStudent(
	batchId: string,
	semester: number,
	departmentId: string,
): Promise<RotationConfigWithDetails[]> {
	// Fetch configurations
	const configs = await prisma.rotationPostingConfiguration.findMany({
		where: {
			batchId,
			semester,
			departmentId,
		},
	});

	// Create a map for quick lookup
	const configMap = new Map(configs.map((c) => [c.rotationSlNo, c]));

	// Merge with ROTATION_POSTINGS constant
	// Include both enabled and disabled for UI rendering (UI will show disabled as grayed out)
	const result: RotationConfigWithDetails[] = ROTATION_POSTINGS.map(
		(rotation) => ({
			rotationSlNo: rotation.slNo,
			rotationName: rotation.name,
			isElective: rotation.isElective,
			isEnabled: configMap.get(rotation.slNo)?.isEnabled ?? true, // Default to enabled if no config exists
			configId: configMap.get(rotation.slNo)?.id,
		}),
	);

	return result;
}
