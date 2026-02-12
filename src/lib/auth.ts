/**
 * @module Auth Utilities
 * @description Server-side authentication and authorization helpers using Clerk.
 * All API routes and server actions MUST use these functions.
 *
 * @see copilot-instructions.md — Section 8
 */

import { auth, currentUser } from "@clerk/nextjs/server";

export type AllowedRole = "hod" | "faculty" | "student";

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
