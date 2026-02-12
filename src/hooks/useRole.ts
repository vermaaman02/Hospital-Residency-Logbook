/**
 * @module useRole Hook
 * @description Client-side role detection hook using Clerk.
 * Use for UI rendering decisions ONLY — never trust client-side role checks for security.
 *
 * @see copilot-instructions.md — Section 8
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { type Role } from "@/types";

export function useRole() {
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role as Role | undefined;

  return {
    role,
    isHod: role === "hod",
    isFaculty: role === "faculty",
    isStudent: role === "student",
    isLoaded,
    user,
  };
}
