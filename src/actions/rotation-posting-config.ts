/**
 * @module getRotationPostingConfigurations
 * @description Server action to fetch rotation posting configurations
 * and merge with ROTATION_POSTINGS constant
 */

"use server";

import { requireAuth, requireRole, requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROTATION_POSTINGS } from "@/lib/constants/rotation-postings";
import { emitRealtimeEvent } from "@/lib/realtime-emit";

export interface RotationConfigWithDetails {
	rotationSlNo: number;
	rotationName: string;
	isElective: boolean;
	isEnabled: boolean;
	isOverridden?: boolean;
	configId?: string;
}

export interface RotationConfigStudentOption {
	id: string;
	name: string;
	email: string;
}

interface RotationFlagRecord {
	id: string;
	rotationSlNo: number;
	isEnabled: boolean;
}

function mergeRotationConfigs(
	baseConfigs: RotationFlagRecord[],
	studentOverrides: RotationFlagRecord[] = [],
): RotationConfigWithDetails[] {
	const baseMap = new Map(baseConfigs.map((c) => [c.rotationSlNo, c]));
	const studentMap = new Map(studentOverrides.map((c) => [c.rotationSlNo, c]));

	return ROTATION_POSTINGS.map((rotation) => {
		const base = baseMap.get(rotation.slNo);
		const override = studentMap.get(rotation.slNo);

		return {
			rotationSlNo: rotation.slNo,
			rotationName: rotation.name,
			isElective: rotation.isElective,
			isEnabled: override?.isEnabled ?? base?.isEnabled ?? true,
			isOverridden: Boolean(override),
			configId: override?.id ?? base?.id,
		};
	});
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

	const configs = await prisma.rotationPostingConfiguration.findMany({
		where: {
			batchId,
			semester,
			departmentId,
		},
		select: {
			id: true,
			rotationSlNo: true,
			isEnabled: true,
		},
	});

	return mergeRotationConfigs(configs);
}

/**
 * Get students in selected batch/semester/department for specific-student overrides.
 */
/**
 * Get students in selected batch/semester/department for specific-student overrides.
 * If departmentId matches, show those students first. Also include students
 * without a departmentId assigned (fallback for legacy data).
 */
export async function getStudentsForRotationPostingConfig(
	batchId: string,
	semester: number,
	departmentId: string,
): Promise<RotationConfigStudentOption[]> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	const students = await prisma.user.findMany({
		where: {
			role: "STUDENT" as never,
			batchId,
			// Include students who match departmentId OR have no departmentId assigned yet
			OR: [{ departmentId }, { departmentId: null }],
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
		},
		orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
	});

	return students.map((student) => ({
		id: student.id,
		name:
			`${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
			student.email,
		email: student.email,
	}));
}

/**
 * Fetch effective rotation posting configuration for one specific student.
 * Effective = student override (if present) otherwise base filter config.
 */
export async function getRotationPostingConfigurationsForSpecificStudent(
	batchId: string,
	semester: number,
	departmentId: string,
	studentId: string,
): Promise<RotationConfigWithDetails[]> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	const [baseConfigs, studentOverrides] = await Promise.all([
		prisma.rotationPostingConfiguration.findMany({
			where: {
				batchId,
				semester,
				departmentId,
			},
			select: {
				id: true,
				rotationSlNo: true,
				isEnabled: true,
			},
		}),
		prisma.rotationPostingStudentConfiguration.findMany({
			where: {
				batchId,
				semester,
				departmentId,
				studentId,
			},
			select: {
				id: true,
				rotationSlNo: true,
				isEnabled: true,
			},
		}),
	]);

	return mergeRotationConfigs(baseConfigs, studentOverrides);
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

	await emitRealtimeEvent("rotation:updated");
}

/**
 * Update a single student-specific rotation posting configuration.
 */
export async function updateRotationPostingConfigForSpecificStudent(
	rotationSlNo: number,
	batchId: string,
	semester: number,
	departmentId: string,
	studentId: string,
	isEnabled: boolean,
): Promise<void> {
	try {
		await requireRole(["hod"]);
	} catch {
		throw new Error("Unauthorized");
	}

	const student = await prisma.user.findUnique({
		where: { id: studentId },
		select: { id: true, role: true },
	});
	if (!student || student.role !== "STUDENT") {
		throw new Error("Invalid student selection");
	}

	const baseConfig = await prisma.rotationPostingConfiguration.findUnique({
		where: {
			rotationSlNo_batchId_semester_departmentId: {
				rotationSlNo,
				batchId,
				semester,
				departmentId,
			},
		},
		select: { isEnabled: true },
	});
	const baseEnabled = baseConfig?.isEnabled ?? true;

	if (isEnabled === baseEnabled) {
		await prisma.rotationPostingStudentConfiguration.deleteMany({
			where: {
				rotationSlNo,
				batchId,
				semester,
				departmentId,
				studentId,
			},
		});
		await emitRealtimeEvent("rotation:updated");
		return;
	}

	await prisma.rotationPostingStudentConfiguration.upsert({
		where: {
			rotationSlNo_batchId_semester_departmentId_studentId: {
				rotationSlNo,
				batchId,
				semester,
				departmentId,
				studentId,
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
			studentId,
			isEnabled,
		},
	});

	await emitRealtimeEvent("rotation:updated");
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

	await emitRealtimeEvent("rotation:updated");
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
	studentId?: string,
): Promise<Set<number>> {
	const configs = await getEnabledRotationsForStudent(
		batchId,
		semester,
		departmentId,
		studentId,
	);

	return new Set(
		configs
			.filter((config) => config.isEnabled)
			.map((config) => config.rotationSlNo),
	);
}

export async function validateRotationEnabledForStudentDetails(
	rotationName: string,
	batchId?: string | null,
	semester?: number | null,
	departmentId?: string | null,
	studentId?: string | null,
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

	if (studentId) {
		const studentOverride =
			await prisma.rotationPostingStudentConfiguration.findUnique({
				where: {
					rotationSlNo_batchId_semester_departmentId_studentId: {
						rotationSlNo: rotation.slNo,
						batchId,
						semester,
						departmentId,
						studentId,
					},
				},
			});

		if (studentOverride) {
			if (!studentOverride.isEnabled) {
				throw new Error(
					`Rotation posting "${rotationName}" is disabled for this student.`,
				);
			}
			return;
		}
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
	studentId?: string,
): Promise<RotationConfigWithDetails[]> {
	await requireAuthHybrid();

	const baseConfigs = await prisma.rotationPostingConfiguration.findMany({
		where: {
			batchId,
			semester,
			departmentId,
		},
		select: {
			id: true,
			rotationSlNo: true,
			isEnabled: true,
		},
	});
	const studentOverrides =
		studentId ?
			await prisma.rotationPostingStudentConfiguration.findMany({
				where: {
					batchId,
					semester,
					departmentId,
					studentId,
				},
				select: {
					id: true,
					rotationSlNo: true,
					isEnabled: true,
				},
			})
		:	[];

	return mergeRotationConfigs(baseConfigs, studentOverrides);
}
