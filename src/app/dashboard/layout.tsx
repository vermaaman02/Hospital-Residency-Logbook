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

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex bg-background">
			{/* Sidebar — hidden on mobile, visible on lg+ */}
			<aside className="hidden lg:block">
				<Sidebar />
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-h-screen">
				<TopBar />

				<main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
					{children}
				</main>

				<Footer />
			</div>

			{/* Mobile Bottom Nav — visible on mobile, hidden on lg+ */}
			<MobileNav />
		</div>
	);
}
