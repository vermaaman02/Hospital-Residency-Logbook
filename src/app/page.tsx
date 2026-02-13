/**
 * @module LandingPage
 * @description Public landing page for the AIIMS Patna PG Residency Digital Logbook.
 * Features AIIMS branding, official logo, and clear CTAs.
 */

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	ClipboardList,
	Shield,
	BarChart3,
	Users,
	BookOpen,
	Stethoscope,
	ArrowRight,
	CheckCircle2,
	GraduationCap,
	Activity,
} from "lucide-react";
import { INSTITUTION_NAME, DEPARTMENT_NAME } from "@/lib/constants";

const OFFICIAL_SITE_URL = "https://aiimspatna.edu.in/";

const features = [
	{
		icon: ClipboardList,
		title: "Digital Logbook",
		description:
			"Replace your physical logbook with a comprehensive digital system tracking case management, procedures, diagnostics, and academics.",
		color: "bg-blue-500/10 text-blue-600",
	},
	{
		icon: Shield,
		title: "NMC Compliant",
		description:
			"Every form matches the official NMC-required PG Residency Logbook, ensuring complete compliance for your MD program.",
		color: "bg-emerald-500/10 text-emerald-600",
	},
	{
		icon: BarChart3,
		title: "Progress Tracking",
		description:
			"Visual dashboards showing competency progression across all 6 semesters, from Simulation to Managed Independently.",
		color: "bg-violet-500/10 text-violet-600",
	},
	{
		icon: Users,
		title: "Faculty Review & Sign-off",
		description:
			"Seamless digital signature workflow. Submit entries, get faculty feedback, and track sign-off status in real time.",
		color: "bg-amber-500/10 text-amber-600",
	},
	{
		icon: BookOpen,
		title: "Academic Records",
		description:
			"Track case presentations, seminars, journal clubs, thesis progress, conferences, and research activities in one dashboard.",
		color: "bg-rose-500/10 text-rose-600",
	},
	{
		icon: Stethoscope,
		title: "Clinical Skills",
		description:
			"Log adult and pediatric clinical skills, diagnostic interpretations, imaging studies, and procedure competencies with tally counters.",
		color: "bg-teal-500/10 text-teal-600",
	},
];

const stats = [
	{ value: "25+", label: "Case Categories", icon: ClipboardList },
	{ value: "48", label: "Procedure Types", icon: Activity },
	{ value: "30", label: "Diagnostic Skills", icon: Stethoscope },
	{ value: "6", label: "Semesters Tracked", icon: GraduationCap },
];

const steps = [
	{
		number: "01",
		title: "Log Your Entries",
		description:
			"Residents add entries with patient details, diagnosis, competency level, and supporting notes.",
	},
	{
		number: "02",
		title: "Faculty Reviews",
		description:
			"Faculty verify entries, provide feedback, add remarks, and request revisions when needed.",
	},
	{
		number: "03",
		title: "HOD Sign-off",
		description:
			"Final approval by HOD for completed entries, semester evaluations, and periodic reviews.",
	},
];

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white">
			{/* ── Header ── */}
			<header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
					<Link href="/" className="flex items-center gap-3">
						<Image
							src="/AIIMS%20patana%20logo.png"
							alt="AIIMS Patna"
							width={220}
							height={44}
							className="h-10 w-auto"
							priority
						/>
					</Link>
					<div className="flex items-center gap-2 sm:gap-3">
						<Link
							href={OFFICIAL_SITE_URL}
							target="_blank"
							rel="noreferrer"
							className="hidden sm:inline-flex"
						>
							<Button variant="ghost" size="sm" className="text-gray-600">
								Official Website
							</Button>
						</Link>
						<Link href="/sign-in">
							<Button variant="ghost" size="sm">
								Sign In
							</Button>
						</Link>
						<Link href="/sign-up">
							<Button size="sm">Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* ── Hero ── */}
			<section className="relative overflow-hidden">
				{/* Background gradient */}
				<div className="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-emerald-50/40" />
				<div className="absolute top-0 right-0 w-150 h-150 rounded-full bg-blue-100/30 blur-3xl -translate-y-1/2 translate-x-1/3" />
				<div className="absolute bottom-0 left-0 w-100 h-100 rounded-full bg-emerald-100/30 blur-3xl translate-y-1/2 -translate-x-1/3" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
					<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						{/* Left — Copy */}
						<div className="space-y-8">
							<div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700">
								<GraduationCap className="h-3.5 w-3.5" />
								MD Emergency Medicine — AIIMS Patna
							</div>

							<h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1]">
								PG Residency{" "}
								<span className="bg-linear-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
									Digital Logbook
								</span>
							</h1>

							<p className="text-lg text-gray-600 max-w-lg leading-relaxed">
								A secure, NMC-compliant platform for documenting cases,
								procedures, diagnostics, and academic activities — with faculty
								review and HOD sign-off built in.
							</p>

							<div className="flex flex-wrap items-center gap-3">
								<Link href="/sign-up">
									<Button size="lg" className="px-8 gap-2 text-base">
										Start Logging <ArrowRight className="h-4 w-4" />
									</Button>
								</Link>
								<Link href="/sign-in">
									<Button
										size="lg"
										variant="outline"
										className="px-8 text-base"
									>
										Sign In
									</Button>
								</Link>
							</div>

							<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
								{[
									"NMC Compliant",
									"Real-time Tracking",
									"Secure & Private",
								].map((item) => (
									<span key={item} className="flex items-center gap-1.5">
										<CheckCircle2 className="h-4 w-4 text-emerald-500" />
										{item}
									</span>
								))}
							</div>
						</div>

						{/* Right — Stats + Emblem card */}
						<div className="space-y-6">
							<div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg shadow-gray-100/50">
								<div className="flex items-center gap-4 mb-8">
									<Image
										src="/AIIMS%20patna%20icon.jpeg"
										alt="AIIMS Patna Emblem"
										width={56}
										height={56}
										className="h-14 w-14 rounded-xl object-contain"
									/>
									<div>
										<p className="text-sm text-gray-500">Program Overview</p>
										<h2 className="text-lg font-semibold text-gray-900">
											{DEPARTMENT_NAME}
										</h2>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-6">
									{stats.map((stat) => (
										<div key={stat.label} className="space-y-1">
											<div className="flex items-center gap-2">
												<stat.icon className="h-4 w-4 text-blue-600" />
												<span className="text-2xl font-bold text-gray-900">
													{stat.value}
												</span>
											</div>
											<p className="text-xs font-medium text-gray-500">
												{stat.label}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Workflow mini-card */}
							<div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
								<p className="text-sm font-semibold text-gray-900 mb-4">
									Simple 3-Step Workflow
								</p>
								<div className="space-y-3">
									{steps.map((step) => (
										<div key={step.number} className="flex items-start gap-3">
											<span className="shrink-0 h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
												{step.number}
											</span>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{step.title}
												</p>
												<p className="text-xs text-gray-500 leading-relaxed">
													{step.description}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── Features ── */}
			<section className="py-20 bg-gray-50/70">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center space-y-3 mb-14">
						<h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
							Everything You Need in One Place
						</h2>
						<p className="text-base text-gray-600 max-w-2xl mx-auto">
							All logbook sections organized for fast entry, faculty review, and
							semester-wise tracking — fully compliant with NMC requirements.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 hover:shadow-md hover:border-gray-300 transition-all duration-200"
							>
								<div
									className={`h-11 w-11 rounded-lg flex items-center justify-center ${feature.color}`}
								>
									<feature.icon className="h-5 w-5" />
								</div>
								<h3 className="font-semibold text-lg text-gray-900">
									{feature.title}
								</h3>
								<p className="text-sm text-gray-600 leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA Banner ── */}
			<section className="py-20">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
						Ready to Go Digital?
					</h2>
					<p className="text-base text-gray-600 max-w-xl mx-auto">
						Join AIIMS Patna MD Emergency Medicine residents using the digital
						logbook. No more carrying physical logbooks — everything in your
						browser.
					</p>
					<div className="flex items-center justify-center gap-4 pt-2">
						<Link href="/sign-up">
							<Button size="lg" className="px-10 gap-2 text-base">
								Create Your Account <ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* ── Footer ── */}
			<footer className="border-t border-gray-200 bg-gray-50 py-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-6">
						<div className="flex items-center gap-3">
							<Image
								src="/AIIMS%20patna%20icon.jpeg"
								alt="AIIMS Patna"
								width={32}
								height={32}
								className="h-8 w-8 rounded-md object-contain"
							/>
							<div className="text-sm">
								<p className="font-medium text-gray-900">{DEPARTMENT_NAME}</p>
								<p className="text-gray-500">{INSTITUTION_NAME}</p>
							</div>
						</div>
						<div className="flex items-center gap-4 text-sm text-gray-500">
							<Link
								href={OFFICIAL_SITE_URL}
								target="_blank"
								rel="noreferrer"
								className="hover:text-gray-900 transition-colors"
							>
								Official Website
							</Link>
							<span className="text-gray-300">|</span>
							<span>
								&copy; {new Date().getFullYear()} PG Residency Digital Logbook
							</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
