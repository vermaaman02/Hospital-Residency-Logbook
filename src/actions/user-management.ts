/**
 * @module User Management Actions
 * @description Server actions for HOD to manage users — create, ban/unban,
 * change roles, promote semesters, and assign faculty to students.
 *
 * Uses Clerk Backend API for user creation and banning.
 * Uses Prisma for local DB state (status, bannedUntil, semester, batch).
 *
 * @see copilot-instructions.md — Section 8, Section 10
 * @see https://clerk.com/docs/references/backend/user
 */

"use server";

import { requireRole, type AllowedRole } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const REVALIDATE_PATH = "/dashboard/hod/manage-users";

// ======================== VALIDATORS ========================

const createUserSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	email: z.string().email("Valid email is required"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	role: z.enum(["faculty", "student"]),
	batchId: z.string().optional(),
});

const banUserSchema = z.object({
	userId: z.string().min(1),
	reason: z.string().max(500).optional(),
	banType: z.enum(["permanent", "temporary"]),
	bannedUntilDays: z.coerce.number().int().min(1).max(365).optional(),
});

// ======================== USER CREATION ========================

/**
 * Create a new user via Clerk and sync to local DB (HOD only).
 * Generates a Clerk account + prisma record.
 */
export async function createUser(formData: {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	role: "faculty" | "student";
	batchId?: string;
}) {
	await requireRole(["hod"]);

	const validated = createUserSchema.parse(formData);

	const client = await clerkClient();

	// Check if email already exists in Clerk
	const existingUsers = await client.users.getUserList({
		emailAddress: [validated.email],
	});
	if (existingUsers.data.length > 0) {
		return {
			success: false,
			message: "A user with this email already exists in Clerk",
		};
	}

	// Create user in Clerk
	let clerkUser;
	try {
		clerkUser = await client.users.createUser({
			emailAddress: [validated.email],
			password: validated.password,
			firstName: validated.firstName,
			lastName: validated.lastName,
			publicMetadata: { role: validated.role },
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to create user in Clerk";
		console.error("[CREATE_USER_CLERK]", err);
		return { success: false, message };
	}

	// If batch is specified, get its details
	let batchName: string | null = null;
	let batchSemester: number | null = null;
	if (validated.batchId) {
		const batch = await prisma.batch.findUnique({
			where: { id: validated.batchId },
		});
		if (batch) {
			batchName = batch.name;
			batchSemester = batch.currentSemester;
		}
	}

	// Create user in local DB
	try {
		await prisma.user.create({
			data: {
				clerkId: clerkUser.id,
				email: validated.email,
				firstName: validated.firstName,
				lastName: validated.lastName,
				role: validated.role.toUpperCase() as "HOD" | "FACULTY" | "STUDENT",
				batchId: validated.batchId ?? null,
				batch: batchName,
				currentSemester:
					validated.role === "student" ? (batchSemester ?? 1) : null,
			},
		});
	} catch (err) {
		// Rollback: delete user from Clerk if DB creation fails
		console.error("[CREATE_USER_DB]", err);
		try {
			await client.users.deleteUser(clerkUser.id);
		} catch {
			/* best-effort rollback */
		}
		return {
			success: false,
			message: "Failed to create user in database. Clerk user was rolled back.",
		};
	}

	revalidatePath(REVALIDATE_PATH);
	return { success: true, clerkId: clerkUser.id };
}

// ======================== ROLE MANAGEMENT ========================

/**
 * Set a user's role (HOD only).
 */
export async function setUserRole(userId: string, role: AllowedRole) {
	await requireRole(["hod"]);

	const client = await clerkClient();
	await client.users.updateUserMetadata(userId, {
		publicMetadata: { role },
	});

	// Sync role update to local database
	await prisma.user.update({
		where: { clerkId: userId },
		data: { role: role.toUpperCase() as "HOD" | "FACULTY" | "STUDENT" },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Remove a user's role (HOD only).
 */
export async function removeUserRole(userId: string) {
	await requireRole(["hod"]);

	const client = await clerkClient();
	await client.users.updateUserMetadata(userId, {
		publicMetadata: { role: null },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

// ======================== BAN / UNBAN ========================

/**
 * Ban a user — permanently or temporarily (HOD only).
 * Uses Clerk's banUser() to disable auth + stores reason/duration in DB.
 */
export async function banUser(data: {
	userId: string;
	reason?: string;
	banType: "permanent" | "temporary";
	bannedUntilDays?: number;
}) {
	await requireRole(["hod"]);

	const validated = banUserSchema.parse(data);

	const client = await clerkClient();

	// Ban in Clerk (prevents sign-in)
	try {
		await client.users.banUser(validated.userId);
	} catch (err) {
		console.error("[BAN_USER_CLERK]", err);
		return { success: false, message: "Failed to ban user in Clerk" };
	}

	// Calculate bannedUntil for temporary bans
	let bannedUntil: Date | null = null;
	let status: "BANNED" | "TEMPORARILY_BANNED" = "BANNED";

	if (validated.banType === "temporary" && validated.bannedUntilDays) {
		bannedUntil = new Date();
		bannedUntil.setDate(bannedUntil.getDate() + validated.bannedUntilDays);
		status = "TEMPORARILY_BANNED";
	}

	// Update local DB
	await prisma.user.update({
		where: { clerkId: validated.userId },
		data: {
			status: status as never,
			bannedUntil,
			banReason: validated.reason ?? null,
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Unban a user (HOD only).
 */
export async function unbanUser(clerkId: string) {
	await requireRole(["hod"]);

	const client = await clerkClient();

	try {
		await client.users.unbanUser(clerkId);
	} catch (err) {
		console.error("[UNBAN_USER_CLERK]", err);
		return { success: false, message: "Failed to unban user in Clerk" };
	}

	await prisma.user.update({
		where: { clerkId },
		data: {
			status: "ACTIVE" as never,
			bannedUntil: null,
			banReason: null,
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Check and auto-unban users whose temporary ban has expired.
 * Called from dashboard layout or middleware.
 */
export async function autoUnbanExpiredUsers() {
	const now = new Date();

	const expiredBans = await prisma.user.findMany({
		where: {
			status: "TEMPORARILY_BANNED" as never,
			bannedUntil: { lte: now },
		},
	});

	if (expiredBans.length === 0) return;

	const client = await clerkClient();

	for (const user of expiredBans) {
		try {
			await client.users.unbanUser(user.clerkId);
			await prisma.user.update({
				where: { id: user.id },
				data: {
					status: "ACTIVE" as never,
					bannedUntil: null,
					banReason: null,
				},
			});
		} catch (err) {
			console.error(`[AUTO_UNBAN] Failed for user ${user.clerkId}:`, err);
		}
	}
}

// ======================== SEMESTER PROMOTION ========================

/**
 * Promote selected students to next semester (HOD only, bulk operation).
 */
export async function promoteStudents(studentIds: string[]) {
	await requireRole(["hod"]);

	if (studentIds.length === 0) {
		return { success: false, message: "No students selected" };
	}

	const students = await prisma.user.findMany({
		where: { id: { in: studentIds }, role: "STUDENT" as never },
	});

	const alreadyMaxSemester = students.filter(
		(s) => (s.currentSemester ?? 6) >= 6,
	);

	if (alreadyMaxSemester.length > 0) {
		const names = alreadyMaxSemester
			.map((s) => `${s.firstName} ${s.lastName}`)
			.join(", ");
		return {
			success: false,
			message: `The following students are already in semester 6 (max): ${names}`,
		};
	}

	// Promote each student
	let promoted = 0;
	for (const student of students) {
		const nextSemester = (student.currentSemester ?? 1) + 1;
		if (nextSemester <= 6) {
			await prisma.user.update({
				where: { id: student.id },
				data: { currentSemester: nextSemester },
			});
			promoted++;
		}
	}

	revalidatePath(REVALIDATE_PATH);
	return {
		success: true,
		message: `${promoted} student(s) promoted to next semester`,
	};
}

/**
 * Set a specific semester for a student (HOD only).
 */
export async function setStudentSemester(studentId: string, semester: number) {
	await requireRole(["hod"]);

	if (semester < 1 || semester > 6) {
		return { success: false, message: "Semester must be between 1 and 6" };
	}

	await prisma.user.update({
		where: { id: studentId },
		data: { currentSemester: semester },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Demote selected students to previous semester (HOD only, bulk operation).
 */
export async function demoteStudents(studentIds: string[]) {
	await requireRole(["hod"]);

	if (studentIds.length === 0) {
		return { success: false, message: "No students selected" };
	}

	const students = await prisma.user.findMany({
		where: { id: { in: studentIds }, role: "STUDENT" as never },
	});

	const alreadyMinSemester = students.filter(
		(s) => (s.currentSemester ?? 1) <= 1,
	);

	if (alreadyMinSemester.length > 0) {
		const names = alreadyMinSemester
			.map((s) => `${s.firstName} ${s.lastName}`)
			.join(", ");
		return {
			success: false,
			message: `The following students are already in semester 1 (min): ${names}`,
		};
	}

	let demoted = 0;
	for (const student of students) {
		const prevSemester = (student.currentSemester ?? 1) - 1;
		if (prevSemester >= 1) {
			await prisma.user.update({
				where: { id: student.id },
				data: { currentSemester: prevSemester },
			});
			demoted++;
		}
	}

	revalidatePath(REVALIDATE_PATH);
	return {
		success: true,
		message: `${demoted} student(s) demoted to previous semester`,
	};
}

// ======================== EDIT USER INFO ========================

const updateUserSchema = z.object({
	userId: z.string().min(1),
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
	email: z.string().email().optional(),
	password: z.string().min(8).optional(),
});

/**
 * Update user info in both Clerk and local DB (HOD only).
 */
export async function updateUserInfo(data: {
	userId: string; // clerkId
	firstName?: string;
	lastName?: string;
	email?: string;
	password?: string;
}) {
	await requireRole(["hod"]);

	const validated = updateUserSchema.parse(data);

	const client = await clerkClient();

	// Update Clerk user
	try {
		const updates: Record<string, unknown> = {};
		if (validated.firstName) updates.firstName = validated.firstName;
		if (validated.lastName) updates.lastName = validated.lastName;
		if (validated.password) updates.password = validated.password;

		if (Object.keys(updates).length > 0) {
			await client.users.updateUser(validated.userId, updates);
		}

		// Email change requires a different Clerk flow (create + make primary + delete old)
		// For now, only update local DB email if provided
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to update user in Clerk";
		console.error("[UPDATE_USER_CLERK]", err);
		return { success: false, message };
	}

	// Update local DB
	const dbUpdates: Record<string, unknown> = {};
	if (validated.firstName) dbUpdates.firstName = validated.firstName;
	if (validated.lastName) dbUpdates.lastName = validated.lastName;
	if (validated.email) dbUpdates.email = validated.email;

	if (Object.keys(dbUpdates).length > 0) {
		await prisma.user.update({
			where: { clerkId: validated.userId },
			data: dbUpdates,
		});
	}

	revalidatePath(REVALIDATE_PATH);
	return { success: true, message: "User info updated successfully" };
}

// ======================== BAN STATUS (public lookup) ========================

/**
 * Look up ban status by email — publicly accessible (no auth required).
 */
export async function getBanStatus(email: string) {
	if (!email || !email.includes("@")) {
		return { found: false, message: "Please enter a valid email" };
	}

	const user = await prisma.user.findUnique({
		where: { email: email.toLowerCase() },
		select: {
			firstName: true,
			lastName: true,
			status: true,
			bannedUntil: true,
			banReason: true,
		},
	});

	if (!user) {
		return { found: false, message: "No account found with this email" };
	}

	const isBanned =
		user.status === "BANNED" || user.status === "TEMPORARILY_BANNED";

	return {
		found: true,
		isBanned,
		status: user.status as string,
		firstName: user.firstName,
		lastName: user.lastName,
		bannedUntil: user.bannedUntil?.toISOString() ?? null,
		banReason: user.banReason,
	};
}

// ======================== DATA FETCHING ========================

/**
 * Get all users from local DB + Clerk enrichment (HOD only).
 */
export async function getAllUsers(_query?: string) {
	await requireRole(["hod"]);

	// Get all users from local DB (reliable source for batch/status)
	const dbUsers = await prisma.user.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			batchRelation: { select: { id: true, name: true } },
		},
	});

	const client = await clerkClient();

	const enrichedUsers = await Promise.all(
		dbUsers.map(async (user) => {
			let imageUrl = user.profileImage ?? "";
			let clerkBanned = false;
			try {
				const clerkUser = await client.users.getUser(user.clerkId);
				imageUrl = clerkUser.imageUrl;
				clerkBanned = clerkUser.banned;
			} catch {
				// Clerk user may have been deleted
			}

			return {
				id: user.id,
				clerkId: user.clerkId,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				imageUrl,
				role: user.role.toLowerCase() as "hod" | "faculty" | "student",
				status: user.status as string,
				bannedUntil: user.bannedUntil?.toISOString() ?? null,
				banReason: user.banReason,
				batch: user.batch,
				batchId: user.batchId,
				batchName: user.batchRelation?.name ?? null,
				currentSemester: user.currentSemester,
				clerkBanned,
				createdAt: user.createdAt.toISOString(),
			};
		}),
	);

	return enrichedUsers;
}

// ======================== FACULTY ASSIGNMENT ========================

/**
 * Assign a faculty member to a student (HOD only).
 */
export async function assignFacultyToStudent(
	facultyClerkId: string,
	studentClerkId: string,
	semester: number = 1,
) {
	await requireRole(["hod"]);

	const existing = await prisma.facultyStudentAssignment.findFirst({
		where: {
			facultyId: facultyClerkId,
			studentId: studentClerkId,
			semester,
		},
	});

	if (existing) {
		return {
			success: false,
			message: "Assignment already exists for this semester",
		};
	}

	await prisma.facultyStudentAssignment.create({
		data: {
			facultyId: facultyClerkId,
			studentId: studentClerkId,
			semester,
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

/**
 * Remove a faculty-student assignment (HOD only).
 */
export async function removeFacultyAssignment(assignmentId: string) {
	await requireRole(["hod"]);

	await prisma.facultyStudentAssignment.delete({
		where: { id: assignmentId },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}
