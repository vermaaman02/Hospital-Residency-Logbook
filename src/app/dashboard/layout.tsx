/**
 * @module DashboardLayout
 * @description Shared layout for all dashboard pages. Uses DashboardShell
 * (client) for sidebar drawer + TopBar + MobileNav + Footer.
 *
 * @see roadmap.md — Section 11
 */

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ensureUserInDb } from "@/lib/auth";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Auto-create DB user record for any signed-in Clerk user on first visit
	await ensureUserInDb();

	return <DashboardShell>{children}</DashboardShell>;
}
