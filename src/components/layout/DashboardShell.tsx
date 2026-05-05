/**
 * @module DashboardShell
 * @description Client-side dashboard shell managing sidebar drawer state for mobile.
 * Provides the app shell with Sidebar (drawer on mobile, static on desktop),
 * TopBar, MobileNav, and Footer.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";

interface DashboardShellProps {
	children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const handleMobileMenuToggle = useCallback(() => {
		setSidebarOpen((prev) => !prev);
	}, []);

	const handleSidebarClose = useCallback(() => {
		setSidebarOpen(false);
	}, []);

	return (
		<div className="h-screen flex overflow-hidden bg-background">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
					onClick={handleSidebarClose}
					aria-hidden="true"
				/>
			)}

			{/* Sidebar — drawer on mobile, static on desktop */}
			<aside
				className={`
					fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 lg:w-auto
					${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
				`}
			>
				<Sidebar onLinkClick={handleSidebarClose} />
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-h-0 min-w-0">
				<TopBar onMobileMenuToggle={handleMobileMenuToggle} />

				<main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
					{children}
				</main>
			</div>

			{/* Mobile Bottom Nav */}
			<MobileNav />
		</div>
	);
}
