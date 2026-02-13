/**
 * @module HelpPage
 * @description User guide and FAQ for the AIIMS Patna PG Residency Digital Logbook.
 * Accessible to all roles from the dashboard.
 */

import { PageHeader } from "@/components/layout/PageHeader";
import {
	BookOpen,
	ClipboardList,
	Syringe,
	Activity,
	FileCheck,
	Shield,
	HelpCircle,
	MonitorSmartphone,
} from "lucide-react";

const faqs = [
	{
		q: "How do I add a new case log?",
		a: 'Navigate to Case Management from the sidebar, select a category, then click "New Entry". Fill the form and click "Submit for Review" when ready, or save as draft to continue later.',
	},
	{
		q: "What does each competency level mean?",
		a: "CBD = Case Based Discussion, S = Simulation, O = Observed, MS = Managed under Supervision, MI = Managed Independently. Your progression from S → MI is tracked over your 3-year residency.",
	},
	{
		q: "How does the sign-off workflow work?",
		a: "When you submit an entry, it goes to your assigned faculty for review. Faculty can sign off (approve), add remarks, or send it back for revision. Once signed, the entry becomes read-only.",
	},
	{
		q: "What is the Tally counter?",
		a: "The tally shows how many times you have performed a specific procedure or managed a specific case type. It auto-increments as you add entries. The physical logbook has target numbers (e.g., 90 for Airway Adult), and the dashboard tracks your progress against those targets.",
	},
	{
		q: "Can I edit an entry after submitting it?",
		a: "Submitted entries are locked until faculty takes action. If faculty sends it back for revision (NEEDS_REVISION status), you can edit and resubmit. SIGNED entries cannot be edited.",
	},
	{
		q: "What if I forget to complete my logbook entries?",
		a: "Use the auto-save draft feature — forms automatically save every 30 seconds. You can find incomplete drafts in each section's list view and complete them later.",
	},
	{
		q: "How does the evaluation graph work?",
		a: "The 5-domain evaluation graph tracks your growth in Knowledge, Clinical Skills, Procedural Skills, Soft Skills, and Research. Faculty scores you during periodic reviews, and the radar chart shows your progression across semesters.",
	},
	{
		q: "Who can see my logbook entries?",
		a: "Only you, your assigned faculty, and the HOD can see your entries. Your data is never visible to other students.",
	},
];

const sections = [
	{
		title: "Case Management",
		icon: ClipboardList,
		description:
			"Log cases across 25 emergency medicine categories including resuscitation, trauma, cardiac emergencies, and more.",
	},
	{
		title: "Procedures",
		icon: Syringe,
		description:
			"Track all procedural skills with skill level assessment (S/O/A/PS/PI). Includes airway, vascular access, wound management, CPR, and more.",
	},
	{
		title: "Clinical Skills",
		icon: Activity,
		description:
			"Log adult and pediatric clinical skills with confidence level tracking (VC/FC/SC/NC).",
	},
	{
		title: "Diagnostics & Imaging",
		icon: MonitorSmartphone,
		description:
			"Record diagnostic skills (ABG, ECG interpretation) and imaging competencies (X-ray, USG, CT, POCUS).",
	},
	{
		title: "Academics",
		icon: BookOpen,
		description:
			"Track case presentations, seminar presentations, and journal club participation.",
	},
	{
		title: "Sign-off Workflow",
		icon: FileCheck,
		description:
			"Entries follow: Draft → Submitted → Signed (or Needs Revision). Faculty reviews and signs off on student entries.",
	},
	{
		title: "Evaluations",
		icon: Shield,
		description:
			"Periodic reviews with 5-domain scoring, end-semester assessments, and a progression radar chart.",
	},
];

export default function HelpPage() {
	return (
		<div className="space-y-8">
			<PageHeader
				title="Help & User Guide"
				description="Everything you need to know about using the AIIMS Patna PG Residency Digital Logbook"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Help" },
				]}
			/>

			{/* Overview */}
			<div className="border rounded-lg p-6 bg-hospital-background">
				<h2 className="text-lg font-semibold mb-2">About This Application</h2>
				<p className="text-sm text-muted-foreground leading-relaxed">
					This is a digital replacement for the physical PG (Post Graduate)
					Residency Logbook used by MD Emergency Medicine residents at AIIMS
					Patna. It covers all sections of the NMC-mandated logbook including
					case management, procedures, clinical skills, diagnostics, imaging,
					academics, and professional development. Every form field matches the
					physical logbook exactly.
				</p>
			</div>

			{/* Logbook Sections */}
			<div>
				<h2 className="text-lg font-semibold mb-4">Logbook Sections</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{sections.map((s) => (
						<div key={s.title} className="border rounded-lg p-4 space-y-2">
							<div className="flex items-center gap-2">
								<s.icon className="h-5 w-5 text-hospital-primary" />
								<h3 className="font-medium">{s.title}</h3>
							</div>
							<p className="text-sm text-muted-foreground">{s.description}</p>
						</div>
					))}
				</div>
			</div>

			{/* Role Guide */}
			<div>
				<h2 className="text-lg font-semibold mb-4">Role Permissions</h2>
				<div className="border rounded-lg overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 font-medium">Role</th>
								<th className="text-left p-3 font-medium">Capabilities</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t">
								<td className="p-3 font-medium">Student</td>
								<td className="p-3 text-muted-foreground">
									Create, edit, and submit logbook entries. View own entries and
									progress. Save drafts.
								</td>
							</tr>
							<tr className="border-t">
								<td className="p-3 font-medium">Faculty</td>
								<td className="p-3 text-muted-foreground">
									View assigned students&apos; entries. Sign off, add remarks,
									or send back for revision. Score periodic evaluations.
								</td>
							</tr>
							<tr className="border-t">
								<td className="p-3 font-medium">HOD</td>
								<td className="p-3 text-muted-foreground">
									View all students and faculty. Manage role assignments,
									faculty-student pairings. View department analytics and
									evaluations.
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* FAQ */}
			<div>
				<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
					<HelpCircle className="h-5 w-5" />
					Frequently Asked Questions
				</h2>
				<div className="space-y-4">
					{faqs.map((faq, i) => (
						<div key={i} className="border rounded-lg p-4">
							<h3 className="font-medium text-sm mb-1">{faq.q}</h3>
							<p className="text-sm text-muted-foreground">{faq.a}</p>
						</div>
					))}
				</div>
			</div>

			{/* Contact */}
			<div className="border rounded-lg p-6 bg-muted/30">
				<h2 className="text-lg font-semibold mb-2">Need More Help?</h2>
				<p className="text-sm text-muted-foreground">
					Contact the Department of Emergency Medicine, AIIMS Patna for
					logbook-related queries. For technical issues, reach out to the
					application administrator.
				</p>
			</div>
		</div>
	);
}
