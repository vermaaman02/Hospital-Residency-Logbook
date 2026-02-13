/**
 * @module LandingPage
 * @description Public landing page for the AIIMS Patna PG Residency Digital Logbook.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	ClipboardList,
	Shield,
	BarChart3,
	Users,
	BookOpen,
	Stethoscope,
} from "lucide-react";
import { APP_NAME, INSTITUTION_NAME, DEPARTMENT_NAME } from "@/lib/constants";

const features = [
	{
		icon: ClipboardList,
		title: "Digital Logbook",
		description:
			"Replace your physical logbook with a comprehensive digital system that tracks all case management, procedures, diagnostics, and academic activities.",
	},
	{
		icon: Shield,
		title: "NMC Compliant",
		description:
			"Every form matches the official NMC-required PG Residency Logbook, ensuring complete compliance for your MD Emergency Medicine program.",
	},
	{
		icon: BarChart3,
		title: "Progress Tracking",
		description:
			"Visual dashboards showing your competency progression across all 6 semesters, from Simulation to Managed Independently.",
	},
	{
		icon: Users,
		title: "Faculty Review",
		description:
			"Seamless digital signature workflow. Submit entries, get faculty feedback, and track sign-off status in real time.",
	},
	{
		icon: BookOpen,
		title: "Academic Records",
		description:
			"Track case presentations, seminars, journal clubs, thesis progress, conferences, and research activities in one place.",
	},
	{
		icon: Stethoscope,
		title: "Clinical Skills",
		description:
			"Log adult and pediatric clinical skills, diagnostic interpretations, imaging studies, and procedure competencies.",
	},
];

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-lg bg-(--color-hospital-blue) flex items-center justify-center">
							<Stethoscope className="h-5 w-5 text-white" />
						</div>
						<span className="font-bold text-lg hidden sm:block">
							{APP_NAME}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Link href="/sign-in">
							<Button variant="ghost">Sign In</Button>
						</Link>
						<Link href="/sign-up">
							<Button>Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="py-20 sm:py-28 px-4">
				<div className="max-w-4xl mx-auto text-center space-y-6">
					<div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
						MD Emergency Medicine — {INSTITUTION_NAME}
					</div>
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
						PG Residency{" "}
						<span className="text-(--color-hospital-blue)">
							Digital Logbook
						</span>
					</h1>
					<p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
						A complete digital replacement for the physical PG Residency Logbook
						used by {DEPARTMENT_NAME} residents at AIIMS Patna.
					</p>
					<div className="flex items-center justify-center gap-4 pt-4">
						<Link href="/sign-up">
							<Button size="lg" className="text-base px-8">
								Start Logging
							</Button>
						</Link>
						<Link href="/sign-in">
							<Button size="lg" variant="outline" className="text-base px-8">
								Sign In
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="py-16 bg-muted/30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
						Everything You Need
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="bg-background rounded-xl border p-6 space-y-3 hover:shadow-md transition-shadow"
							>
								<div className="h-10 w-10 rounded-lg bg-(--color-hospital-blue)/10 flex items-center justify-center">
									<feature.icon className="h-5 w-5 text-(--color-hospital-blue)" />
								</div>
								<h3 className="font-semibold text-lg">{feature.title}</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
					<p className="text-sm text-muted-foreground">
						{DEPARTMENT_NAME} — {INSTITUTION_NAME}
					</p>
					<p className="text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
