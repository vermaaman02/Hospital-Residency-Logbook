/**
 * @module User Management Actions
 * @description Server actions for HOD to manage user roles and faculty-student assignments.
 * Only HOD role can invoke these actions.
 *
 * @see copilot-instructions.md — Section 8, Section 10
 */

"use server";

import { requireRole, type AllowedRole } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Set a user's role (HOD only).
 */
export async function setUserRole(userId: string, role: AllowedRole) {
	await requireRole(["hod"]);

	const client = await clerkClient();
	await client.users.updateUserMetadata(userId, {
		publicMetadata: { role },
	});

	// Sync role update to our database
	await prisma.user.update({
		where: { clerkId: userId },
		data: { role: role.toUpperCase() as "HOD" | "FACULTY" | "STUDENT" },
	});

	revalidatePath("/dashboard/hod/manage-users");
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

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true };
}

/**
 * Get all users from Clerk (HOD only).
 */
export async function getAllUsers(query?: string) {
	await requireRole(["hod"]);

	const client = await clerkClient();
	const users =
		query ?
			(await client.users.getUserList({ query, limit: 50 })).data
		:	(await client.users.getUserList({ limit: 100 })).data;

	return users.map((user) => ({
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
			?.emailAddress,
		imageUrl: user.imageUrl,
		role: (user.publicMetadata as { role?: string })?.role ?? "none",
		createdAt: user.createdAt,
	}));
}

/**
 * Assign a faculty member to a student (HOD only).
 */
export async function assignFacultyToStudent(
	facultyClerkId: string,
	studentClerkId: string,
	semester: number = 1,
) {
	await requireRole(["hod"]);

	// Check if assignment already exists for this semester
	const existing = await prisma.facultyStudentAssignment.findFirst({
		where: {
			facultyId: facultyClerkId,
			studentId: studentClerkId,
			semester,
		},
	});

	if (existing) {
		return { success: false, message: "Assignment already exists for this semester" };
	}

	await prisma.facultyStudentAssignment.create({
		data: {
			facultyId: facultyClerkId,
			studentId: studentClerkId,
			semester,
		},
	});

	revalidatePath("/dashboard/hod/manage-users");
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

	revalidatePath("/dashboard/hod/manage-users");
	return { success: true };
}
