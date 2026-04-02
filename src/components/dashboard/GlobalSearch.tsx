"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { 
	DIAGNOSTIC_CATEGORY_LABELS, diagnosticEnumToSlug,
	PROCEDURE_CATEGORY_LABELS, procedureEnumToSlug,
	IMAGING_CATEGORY_LABELS, imagingEnumToSlug,
	CASE_CATEGORY_LABELS, categoryEnumToSlug,
} from "@/lib/constants";

export function GlobalSearch() {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const { role } = useRole();

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	if (!role) return null;

	const basePath = role === "hod" ? "/dashboard/hod" : role === "faculty" ? "/dashboard/faculty" : "/dashboard/student";

	const generalRoutes = [
		{ name: "Dashboard Overview", href: `${basePath}` },
		{ name: "Rotation Postings", href: `${basePath}/rotation-postings` },
		{ name: "Attendance", href: `${basePath}/attendance` },
		{ name: "Case Presentations & Seminars", href: `${basePath}/case-presentations` },
		{ name: "Journal Clubs", href: `${basePath}/journal-clubs` },
		{ name: "Internal Assessments", href: `${basePath}/internal-assessments` },
		{ name: "Clinical Skills", href: `${basePath}/clinical-skills` },
		{ name: "Conferences", href: `${basePath}/conferences` },
		{ name: "Consent & Bad News", href: `${basePath}/consent-bad-news` },
		{ name: "Disaster Drills", href: `${basePath}/disaster-drills` },
		{ name: "Life Support Courses", href: `${basePath}/life-support-courses` },
		{ name: "Quality Improvement", href: `${basePath}/quality-improvement` },
		{ name: "Research Activities", href: `${basePath}/research-activities` },
		{ name: "Thesis Tracking", href: role === "student" ? `${basePath}/thesis` : `${basePath}/thesis-review` },
		{ name: "Training & Mentoring", href: `${basePath}/training-mentoring` },
		{ name: "Transport Logs", href: `${basePath}/transport` },
		{ name: "Logbook Reviews", href: `${basePath}/logbook-reviews` },
		{ name: "Evaluation Graph", href: `${basePath}/evaluation-graph` },
	];

	if (role === "hod" || role === "faculty") {
		generalRoutes.push({ name: "All Students", href: `${basePath}/students` });
	}

	if (role === "hod") {
		generalRoutes.push({ name: "Manage Users", href: `${basePath}/manage-users` });
		generalRoutes.push({ name: "System Management", href: `${basePath}/manage-system` });
		generalRoutes.push({ name: "Analytics", href: `${basePath}/analytics` });
	}

	const caseRoutes = Object.entries(CASE_CATEGORY_LABELS).map(([key, label]) => ({
		name: label,
		href: role === "student" ? `${basePath}/case-management/${categoryEnumToSlug(key)}` : `${basePath}/case-management?tab=${key}`
	}));

	const diagnosticRoutes = Object.entries(DIAGNOSTIC_CATEGORY_LABELS).map(([key, label]) => ({
		name: label,
		href: role === "student" ? `${basePath}/diagnostics/${diagnosticEnumToSlug(key)}` : `${basePath}/diagnostics?tab=${key}`
	}));

	const procedureRoutes = Object.entries(PROCEDURE_CATEGORY_LABELS).map(([key, label]) => ({
		name: label,
		href: role === "student" ? `${basePath}/procedures/${procedureEnumToSlug(key)}` : `${basePath}/procedures?tab=${key}`
	}));

	const imagingRoutes = Object.entries(IMAGING_CATEGORY_LABELS).map(([key, label]) => ({
		name: label,
		href: role === "student" ? `${basePath}/imaging/${imagingEnumToSlug(key)}` : `${basePath}/imaging?tab=${key}`
	}));

	const runCommand = (command: () => void) => {
		setOpen(false);
		command();
	};

	return (
		<>
			<Button
				variant="outline"
				className="relative h-8 w-full justify-start rounded-md bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-56"
				onClick={() => setOpen(true)}
			>
				<Search className="mr-2 h-4 w-4" />
				<span className="hidden lg:inline-flex">Search forms...</span>
				<span className="inline-flex lg:hidden">Search...</span>
				<kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
					<span className="text-xs">⌘</span>K
				</kbd>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput placeholder="Search forms, modules, pages..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="General & Forms">
						{generalRoutes.map((route) => (
							<CommandItem
								key={route.href}
								value={route.name}
								onSelect={() => {
									runCommand(() => router.push(route.href));
								}}
							>
								{route.name}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Diagnostic Skills">
						{diagnosticRoutes.map((route) => (
							<CommandItem
								key={route.href}
								value={route.name}
								onSelect={() => {
									runCommand(() => router.push(route.href));
								}}
							>
								{route.name}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Procedures">
						{procedureRoutes.map((route) => (
							<CommandItem
								key={route.href}
								value={route.name}
								onSelect={() => {
									runCommand(() => router.push(route.href));
								}}
							>
								{route.name}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Imaging logs">
						{imagingRoutes.map((route) => (
							<CommandItem
								key={route.href}
								value={route.name}
								onSelect={() => {
									runCommand(() => router.push(route.href));
								}}
							>
								{route.name}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Case Management">
						{caseRoutes.map((route) => (
							<CommandItem
								key={route.href}
								value={route.name}
								onSelect={() => {
									runCommand(() => router.push(route.href));
								}}
							>
								{route.name}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
