/**
 * @module Auth Utilities
 * @description Server-side authentication and authorization helpers using Clerk.
 * All API routes and server actions MUST use these functions.
 *
 * @see copilot-instructions.md — Section 8
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AllowedRole = "hod" | "faculty" | "student";

/** Map Clerk publicMetadata role to Prisma Role enum value */
function clerkRoleToPrismaRole(
	role: string | undefined,
): "HOD" | "FACULTY" | "STUDENT" {
	if (role === "hod") return "HOD";
	if (role === "faculty") return "FACULTY";
	return "STUDENT";
}

/**
 * Ensure the signed-in Clerk user has a corresponding record in the database.
 * If not, creates one from Clerk profile data. Returns the DB user.
 * Use this instead of `prisma.user.findUnique + redirect("/sign-in")` to
 * prevent redirect loops for first-time users.
 */
export async function ensureUserInDb() {
	const { userId } = await auth();
	if (!userId) return null;

	// Check if the user already exists
	const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (existing) return existing;

	// Fetch profile from Clerk and create DB record
	const clerkUser = await currentUser();
	if (!clerkUser) return null;

	const role = clerkRoleToPrismaRole(
		(clerkUser.publicMetadata as { role?: string })?.role,
	);

	const user = await prisma.user.create({
		data: {
			clerkId: userId,
			email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
			firstName: clerkUser.firstName ?? "",
			lastName: clerkUser.lastName ?? "",
			role: role as never,
		},
	});

	return user;
}

/**
 * Require authentication. Throws if user is not signed in.
 * @returns The authenticated user's Clerk ID
 */
export async function requireAuth(): Promise<string> {
	const { userId } = await auth();
	if (!userId) {
		throw new Error("Unauthorized");
	}
	return userId;
}

/**
 * Require specific role(s). Throws if user doesn't have an allowed role.
 * @param allowedRoles - Array of roles that are permitted
 * @returns Object with userId and role
 */
export async function requireRole(
	allowedRoles: AllowedRole[],
): Promise<{ userId: string; role: AllowedRole }> {
	const { userId, sessionClaims } = await auth();
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const metadata = sessionClaims?.metadata as { role?: string } | undefined;
	const role = metadata?.role;

	if (!role || !allowedRoles.includes(role as AllowedRole)) {
		throw new Error("Forbidden");
	}

	return { userId, role: role as AllowedRole };
}

/**
 * Get current user's role from session claims.
 * Returns undefined if no role is set.
 */
export async function getCurrentRole(): Promise<AllowedRole | undefined> {
	const { sessionClaims } = await auth();
	const metadata = sessionClaims?.metadata as { role?: string } | undefined;
	return metadata?.role as AllowedRole | undefined;
}

/**
 * Get the full current user from Clerk.
 * Useful when you need profile data (name, email, image).
 */
export async function getAuthenticatedUser() {
	const user = await currentUser();
	if (!user) {
		throw new Error("Unauthorized");
	}
	return user;
}
