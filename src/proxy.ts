/**
 * @module Clerk Proxy (Next.js 16 middleware)
 * @description Protects /dashboard and /api routes.
 * Enforces role-based routing: /dashboard/hod requires hod role, etc.
 *
 * @see copilot-instructions.md — Section 8
 * @see Clerk RBAC: https://clerk.com/docs/guides/basic-rbac
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api(.*)"]);

const isHodRoute = createRouteMatcher(["/dashboard/hod(.*)"]);
const isFacultyRoute = createRouteMatcher(["/dashboard/faculty(.*)"]);
const isStudentRoute = createRouteMatcher(["/dashboard/student(.*)"]);

/** Return the correct dashboard path for a given role */
function getDashboardForRole(role: string | undefined): string {
	if (role === "hod") return "/dashboard/hod";
	if (role === "faculty") return "/dashboard/faculty";
	return "/dashboard/student";
}

export default clerkMiddleware(async (auth, req) => {
	// Protect all dashboard and API routes — must be signed in
	if (isProtectedRoute(req)) {
		await auth.protect();
	}

	const { sessionClaims } = await auth();
	const role = (sessionClaims?.metadata as { role?: string })?.role;
	const { pathname } = req.nextUrl;

	// Redirect /dashboard (exact) to the role-appropriate dashboard
	if (pathname === "/dashboard" || pathname === "/dashboard/") {
		return NextResponse.redirect(new URL(getDashboardForRole(role), req.url));
	}

	// HOD accessing student routes → redirect to /dashboard/hod
	if (isStudentRoute(req) && role === "hod") {
		return NextResponse.redirect(new URL("/dashboard/hod", req.url));
	}

	// Faculty accessing student routes → redirect to /dashboard/faculty
	if (isStudentRoute(req) && role === "faculty") {
		return NextResponse.redirect(new URL("/dashboard/faculty", req.url));
	}

	// Non-HOD accessing HOD routes → redirect to their dashboard
	if (isHodRoute(req) && role !== "hod") {
		return NextResponse.redirect(new URL(getDashboardForRole(role), req.url));
	}

	// Non-faculty/non-HOD accessing faculty routes → redirect to student
	if (isFacultyRoute(req) && role !== "faculty" && role !== "hod") {
		return NextResponse.redirect(new URL("/dashboard/student", req.url));
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
