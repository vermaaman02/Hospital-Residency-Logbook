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

/** Routes that must NOT require auth (healthcheck, webhooks) */
const isPublicApiRoute = createRouteMatcher([
	"/api/health",
	"/api/webhooks(.*)",
]);

/**
 * /api/v1/* routes are authenticated via Bearer token or cookie.
 * Clerk's authenticateRequest() inside each handler does the check,
 * so the middleware must NOT call auth.protect() on them (which would
 * reject Bearer-only requests before the handler runs).
 */
const isV1ApiRoute = createRouteMatcher(["/api/v1(.*)"]);

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

/**
 * Add CORS headers required by the mobile app (Expo).
 * Permissive for the /api/v1/* namespace only.
 */
function withMobileCors(response: ReturnType<typeof NextResponse.next>) {
	response.headers.set("Access-Control-Allow-Origin", "*");
	response.headers.set(
		"Access-Control-Allow-Methods",
		"GET,POST,PUT,PATCH,DELETE,OPTIONS",
	);
	response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);
	return response;
}

export default clerkMiddleware(async (auth, req) => {
	// Handle CORS preflight for mobile (/api/v1/*)
	if (isV1ApiRoute(req) && req.method === "OPTIONS") {
		return withMobileCors(new NextResponse(null, { status: 204 }));
	}

	// /api/v1/* — skip Clerk's protect(); each handler calls requireAuthHybrid()
	if (isV1ApiRoute(req)) {
		return withMobileCors(NextResponse.next());
	}

	// Allow public API routes through without auth (healthcheck, webhooks)
	if (isPublicApiRoute(req)) {
		return NextResponse.next();
	}

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
