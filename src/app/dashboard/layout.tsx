/**
 * @module DashboardLayout
 * @description Shared layout for all dashboard pages. Combines Sidebar,
 * TopBar, MobileNav, and Footer into the authenticated app shell.
 *
 * @see roadmap.md — Section 11
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { ensureUserInDb } from "@/lib/auth";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Auto-create DB user record for any signed-in Clerk user on first visit
	await ensureUserInDb();

	return (
		<div className="h-screen flex overflow-hidden bg-background">
			{/* Sidebar — hidden on mobile, visible on lg+ */}
			<aside className="hidden lg:block h-screen">
				<Sidebar />
			</aside>

			{/* Main Content Area — scrolls independently */}
			<div className="flex-1 flex flex-col min-h-0">
				<TopBar />

				<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
					{children}
				</main>

				<Footer />
			</div>

			{/* Mobile Bottom Nav — visible on mobile, hidden on lg+ */}
			<MobileNav />
		</div>
	);
}
