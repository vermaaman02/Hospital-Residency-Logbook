/**
 * @module HelpGuidePage
 * @description Comprehensive help & guide page for the AIIMS Patna
 * PG Residency Digital Logbook. Covers all modules, workflows,
 * FAQs, and role-specific guidance.
 *
 * @see copilot-instructions.md — Section 1
 */

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	LayoutDashboard,
	RotateCcw,
	CalendarDays,
	BookOpen,
	Stethoscope,
	ClipboardList,
	Syringe,
	Activity,
	Scan,
	Truck,
	FileText,
	GraduationCap,
	Award,
	FlaskConical,
	Siren,
	ShieldCheck,
	ClipboardCheck,
	BarChart3,
	Users,
	UserCog,
	HelpCircle,
	CheckCircle2,
	ArrowRight,
	BookMarked,
	type LucideIcon,
} from "lucide-react";

/* ─── Module reference data ─── */

interface ModuleInfo {
	title: string;
	icon: LucideIcon;
	description: string;
	path: string;
	role: "student" | "faculty" | "hod" | "all";
	tips: string[];
}

const MODULES: ModuleInfo[] = [
	// ── Administrative ──
	{
		title: "Rotation Postings",
		icon: RotateCcw,
		description:
			"Log your department rotation postings across semesters 1-6. Record the department, period (from-to), and key learning experiences.",
		path: "/dashboard/student/rotation-postings",
		role: "student",
		tips: [
			"Add each rotation as soon as you start a new posting.",
			"Include the from-date and to-date accurately.",
			"Faculty verifies your rotation records periodically.",
		],
	},
	{
		title: "Attendance",
		icon: CalendarDays,
		description:
			"Monthly attendance sheets covering duties, academic days, and leaves. Sheets auto-calculate your attendance percentage.",
		path: "/dashboard/student/attendance",
		role: "student",
		tips: [
			"Submit one sheet per month — date range cannot overlap.",
			"You can retract a SUBMITTED sheet back to DRAFT if you need edits.",
			"All 7 rows (Working Days, Night Duties, Academic Days, etc.) are editable.",
			"Select your HOD name from the dropdown for each sheet.",
		],
	},
	// ── Academic ──
	{
		title: "Case Presentations & Seminars",
		icon: BookOpen,
		description:
			"Log case presentations, seminars, and discussions. Record the topic, date, venue, audience, and faculty feedback.",
		path: "/dashboard/student/case-presentations",
		role: "student",
		tips: [
			"Presentations and Seminars are managed in separate tabs.",
			"Include patient demographics when applicable.",
			"Submit for faculty signature after presentation.",
		],
	},
	{
		title: "Journal Clubs",
		icon: FlaskConical,
		description:
			"Document journal club sessions where you critically appraise published research articles.",
		path: "/dashboard/student/journal-clubs",
		role: "student",
		tips: [
			"Record the article citation, journal name, and your analysis.",
			"Journal clubs demonstrate your research literacy.",
		],
	},
	// ── Clinical ──
	{
		title: "Clinical Skills",
		icon: Stethoscope,
		description:
			"Track clinical skill competencies for both Adult and Pediatric Emergency Medicine. Progress across S/O/A/PS/PI levels.",
		path: "/dashboard/student/clinical-skills",
		role: "student",
		tips: [
			"Adult and Pediatric skills are tracked separately.",
			"Aim to progress from Simulation → Observed → Assisted → Performed under Supervision → Performed Independently.",
			"Use inline editing — click any cell to update values.",
		],
	},
	{
		title: "Case Management",
		icon: ClipboardList,
		description:
			"The largest module — log cases across 25 categories including Resuscitation, Airway, Trauma, and more. Track competency (CBD/S/O/MS/MI).",
		path: "/dashboard/student/case-management",
		role: "student",
		tips: [
			"Each of the 25 tabs corresponds to a category from the NMC logbook.",
			"Record patient Name, Age, Sex, UHID, and complete diagnosis.",
			"Competency level options: CBD, Simulation, Observed, Managed under Supervision, Managed Independently.",
			"Auto-save works — entries start as DRAFT.",
		],
	},
	{
		title: "Procedures",
		icon: Syringe,
		description:
			"Log procedural skills across 48+ categories. Each entry tracks skill level (S/O/A/PS/PI) and includes patient details.",
		path: "/dashboard/student/procedures",
		role: "student",
		tips: [
			"Select the specific procedure category tab first.",
			"Record the skill level achieved for each attempt.",
			"CPR procedures use a different scale: S/TM/TL.",
		],
	},
	{
		title: "Diagnostics",
		icon: Activity,
		description:
			"Track diagnostic skill competencies including ABG interpretation, ECG reading, and other diagnostic procedures.",
		path: "/dashboard/student/diagnostics",
		role: "student",
		tips: [
			"Categories include ABG, ECG, Lab Investigations, and more.",
			"Confidence level options: Very Confident / Fairly Confident / Slightly Confident / Not Confident.",
		],
	},
	{
		title: "Imaging",
		icon: Scan,
		description:
			"Log imaging skills including POCUS, X-Ray interpretation, CT readings, and ultrasound procedures.",
		path: "/dashboard/student/imaging",
		role: "student",
		tips: [
			"POCUS (Point of Care Ultrasonography) is a key competency.",
			"Record findings and clinical correlation.",
		],
	},
	// ── Other Logs ──
	{
		title: "Transport Logs",
		icon: Truck,
		description:
			"Document inter-hospital or intra-hospital patient transport cases, including transport details and outcomes.",
		path: "/dashboard/student/transport",
		role: "student",
		tips: [
			"Record transport mode, destination, and patient condition.",
			"These demonstrate your emergency transfer management skills.",
		],
	},
	{
		title: "Consent & Bad News",
		icon: FileText,
		description:
			"Log instances of informed consent taking and breaking bad news to patients/families — key communication skills.",
		path: "/dashboard/student/consent-bad-news",
		role: "student",
		tips: [
			"Consent and Bad News are managed in separate tabs.",
			"Document the context, approach, and outcome.",
		],
	},
	// ── Professional Development ──
	{
		title: "Life-Support Courses",
		icon: GraduationCap,
		description:
			"Record certifications in BLS, ACLS, PALS, ATLS, and other life-support courses attended.",
		path: "/dashboard/student/life-support-courses",
		role: "student",
		tips: [
			"Upload certificate details when available.",
			"These courses are mandatory for EM residency completion.",
		],
	},
	{
		title: "Conferences",
		icon: Award,
		description:
			"Log participation in medical conferences, CMEs, and workshops. Record whether you attended, presented, or organized.",
		path: "/dashboard/student/conferences",
		role: "student",
		tips: [
			"Record the conference name, date, and your role.",
			"Poster/paper presentations count towards academic output.",
		],
	},
	{
		title: "Research & Outreach",
		icon: FlaskConical,
		description:
			"Track publications, research projects, community outreach, and other scholarly activities.",
		path: "/dashboard/student/research-activities",
		role: "student",
		tips: [
			"Include thesis progress as a research activity.",
			"Community outreach and health camps also count.",
		],
	},
	{
		title: "Disaster Drills",
		icon: Siren,
		description:
			"Document participation in disaster management drills and mock exercises.",
		path: "/dashboard/student/disaster-drills",
		role: "student",
		tips: [
			"Record your specific role in the drill.",
			"Include lessons learned and areas for improvement.",
		],
	},
	{
		title: "Quality Improvement",
		icon: ShieldCheck,
		description:
			"Log quality improvement projects, safety audits, and process improvement initiatives in the ED.",
		path: "/dashboard/student/quality-improvement",
		role: "student",
		tips: [
			"QI projects demonstrate systems-level thinking.",
			"Document the problem, intervention, and outcome.",
		],
	},
	{
		title: "Logbook Reviews",
		icon: ClipboardCheck,
		description:
			"Periodic faculty reviews of your entire logbook. Faculty provides overall assessment and comments.",
		path: "/dashboard/student/logbook-reviews",
		role: "student",
		tips: [
			"Reviews happen at regular intervals each semester.",
			"Faculty grades your logbook completeness and quality.",
		],
	},
	{
		title: "Evaluation Graph",
		icon: BarChart3,
		description:
			"Visual 5-domain × 6-semester radar chart showing your progression in Knowledge, Clinical Skills, Procedural Skills, Soft Skills, and Research.",
		path: "/dashboard/student/evaluation-graph",
		role: "student",
		tips: [
			"Interactive chart shows semester-wise progression.",
			"Each domain is scored 1-5 by your supervising faculty.",
		],
	},
];

/* ─── FAQ data ─── */

interface FAQ {
	question: string;
	answer: string;
}

const FAQS: FAQ[] = [
	{
		question: "What are the entry statuses and what do they mean?",
		answer:
			"DRAFT — saved but not submitted. SUBMITTED — sent for faculty review. SIGNED — approved by faculty. NEEDS_REVISION — faculty requested changes. REJECTED — entry was rejected.",
	},
	{
		question: "How do I submit an entry for review?",
		answer:
			'Click "Submit for Review" on any DRAFT entry. Faculty assigned to you will see it in their Pending Reviews queue. Once reviewed, it will be either SIGNED or marked NEEDS_REVISION.',
	},
	{
		question: "Can I edit a signed entry?",
		answer:
			"No. Once an entry is SIGNED by faculty, it becomes read-only. This ensures the integrity of the logbook for NMC review.",
	},
	{
		question: "How does the attendance retract feature work?",
		answer:
			'If you submitted an attendance sheet by mistake, click the "Retract" button to move it back to DRAFT status. You can then edit and resubmit. Only SUBMITTED sheets can be retracted.',
	},
	{
		question: "What is the auto-save feature?",
		answer:
			"Most forms auto-save your work as DRAFT periodically. You won\'t lose data if you close the tab accidentally.",
	},
	{
		question: "How are competency levels tracked?",
		answer:
			"For Case Management: CBD / S (Simulation) / O (Observed) / MS (Managed under Supervision) / MI (Managed Independently). For Procedures: S / O / A (Assisted) / PS (Performed under Supervision) / PI (Performed Independently). For CPR: S / TM (Team Member) / TL (Team Leader).",
	},
	{
		question: "What does the tally counter show?",
		answer:
			"The tally shows how many entries you have in a given category against the NMC target. For example, '12 of 90' means you have logged 12 of the 90 expected entries.",
	},
	{
		question: "How do I see my progress across all modules?",
		answer:
			"Your Student Dashboard shows a module progress grid with entry counts and completion percentages for every section of the logbook.",
	},
	{
		question: "What should faculty do when reviewing entries?",
		answer:
			'Go to "My Students" to see all assigned students. Click on a student to review their entries. You can SIGN approved entries or mark them as NEEDS_REVISION with remarks.',
	},
	{
		question: "How does the HOD analytics page work?",
		answer:
			"HOD sees department-wide analytics including student rankings, faculty workload distribution, module completion rates, and trend charts across all semesters.",
	},
];

/* ─── Workflow steps ─── */

interface WorkflowStep {
	step: number;
	title: string;
	description: string;
}

const STUDENT_WORKFLOW: WorkflowStep[] = [
	{
		step: 1,
		title: "Log Entry",
		description:
			"Fill in the form with patient/case details. Entry saves as DRAFT.",
	},
	{
		step: 2,
		title: "Review & Submit",
		description: "Review your entry, then click 'Submit for Review'.",
	},
	{
		step: 3,
		title: "Faculty Review",
		description: "Your assigned faculty reviews the entry.",
	},
	{
		step: 4,
		title: "Signed or Revision",
		description: "Entry gets SIGNED (approved) or marked NEEDS_REVISION.",
	},
	{
		step: 5,
		title: "Track Progress",
		description: "Monitor your progress on the Dashboard and Evaluation Graph.",
	},
];

export default function HelpGuidePage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Help & Guide"
				description="Everything you need to know about the AIIMS Patna PG Residency Digital Logbook"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Help & Guide" },
				]}
			/>

			{/* ── Getting Started ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<BookMarked className="h-5 w-5 text-hospital-primary" />
						Getting Started
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground leading-relaxed">
						This digital logbook replaces the physical PG Residency logbook for
						MD Emergency Medicine residents at AIIMS Patna. Every form from the
						physical logbook has a digital equivalent here. Your entries are
						reviewed and signed by assigned faculty, and the HOD oversees
						department-wide progress.
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
						<RoleCard
							role="Student"
							icon={GraduationCap}
							color="text-blue-600"
							bg="bg-blue-50"
							items={[
								"Log cases, procedures, skills",
								"Submit entries for faculty review",
								"Track progress on dashboard",
								"View evaluation graphs",
							]}
						/>
						<RoleCard
							role="Faculty"
							icon={Users}
							color="text-teal-600"
							bg="bg-teal-50"
							items={[
								"Review assigned students' entries",
								"Sign approved entries",
								"Add remarks or request revision",
								"Monitor student progress",
							]}
						/>
						<RoleCard
							role="HOD"
							icon={UserCog}
							color="text-purple-600"
							bg="bg-purple-50"
							items={[
								"Department-wide oversight",
								"Manage users and batches",
								"View analytics and rankings",
								"Assign faculty to students",
							]}
						/>
					</div>
				</CardContent>
			</Card>

			{/* ── Entry Workflow ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<ArrowRight className="h-4 w-4 text-hospital-primary" />
						Entry Workflow
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center justify-between">
						{STUDENT_WORKFLOW.map((s, idx) => (
							<div
								key={s.step}
								className="flex items-center gap-2 sm:flex-col sm:text-center flex-1"
							>
								<div className="h-8 w-8 rounded-full bg-hospital-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
									{s.step}
								</div>
								<div className="sm:mt-2">
									<p className="text-sm font-medium">{s.title}</p>
									<p className="text-xs text-muted-foreground mt-0.5 max-w-45">
										{s.description}
									</p>
								</div>
								{idx < STUDENT_WORKFLOW.length - 1 && (
									<ArrowRight
										className="h-4 w-4 text-muted-foreground hidden sm:block absolute"
										style={{ display: "none" }}
									/>
								)}
							</div>
						))}
					</div>

					<Separator className="my-4" />

					<div className="flex flex-wrap gap-2">
						<Badge variant="outline" className="bg-gray-100 text-gray-700">
							DRAFT
						</Badge>
						<Badge variant="outline" className="bg-amber-50 text-amber-700">
							SUBMITTED
						</Badge>
						<Badge variant="outline" className="bg-emerald-50 text-emerald-700">
							SIGNED
						</Badge>
						<Badge variant="outline" className="bg-orange-50 text-orange-700">
							NEEDS REVISION
						</Badge>
						<Badge variant="outline" className="bg-red-50 text-red-700">
							REJECTED
						</Badge>
					</div>
				</CardContent>
			</Card>

			{/* ── Module Guide ── */}
			<div>
				<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
					<LayoutDashboard className="h-5 w-5 text-hospital-primary" />
					Module Guide
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{MODULES.map((mod) => {
						const Icon = mod.icon;
						return (
							<Card
								key={mod.title}
								className="border-0 shadow-sm hover:shadow-md transition-shadow"
							>
								<CardContent className="p-4">
									<div className="flex items-start gap-3">
										<div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
											<Icon className="h-5 w-5 text-hospital-primary" />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-sm font-semibold">{mod.title}</h4>
											<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
												{mod.description}
											</p>
											{mod.tips.length > 0 && (
												<ul className="mt-2 space-y-1">
													{mod.tips.slice(0, 2).map((tip, i) => (
														<li
															key={i}
															className="text-[11px] text-muted-foreground flex items-start gap-1"
														>
															<CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
															<span>{tip}</span>
														</li>
													))}
												</ul>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>

			{/* ── FAQs ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<HelpCircle className="h-5 w-5 text-hospital-primary" />
						Frequently Asked Questions
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-0">
					{FAQS.map((faq, idx) => (
						<div key={idx} className={idx > 0 ? "border-t pt-4 mt-4" : ""}>
							<p className="text-sm font-medium">{faq.question}</p>
							<p className="text-sm text-muted-foreground mt-1 leading-relaxed">
								{faq.answer}
							</p>
						</div>
					))}
				</CardContent>
			</Card>

			{/* ── Key Terms ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<BookOpen className="h-4 w-4 text-hospital-primary" />
						Key Abbreviations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
						<Term abbr="UHID" full="Unique Hospital Identification Number" />
						<Term abbr="CBD" full="Case Based Discussion" />
						<Term
							abbr="S/O/MS/MI"
							full="Simulation / Observed / Managed Supervision / Managed Independently"
						/>
						<Term
							abbr="S/O/A/PS/PI"
							full="Simulation / Observed / Assisted / Performed Supervision / Performed Independently"
						/>
						<Term
							abbr="VC/FC/SC/NC"
							full="Very Confident / Fairly Confident / Slightly Confident / Not Confident"
						/>
						<Term abbr="ABG" full="Arterial Blood Gas" />
						<Term abbr="ECG" full="Electrocardiogram" />
						<Term abbr="POCUS" full="Point of Care Ultrasonography" />
						<Term abbr="ICD" full="Intercostal Chest Drain" />
						<Term abbr="CPR" full="Cardiopulmonary Resuscitation" />
						<Term abbr="NMC" full="National Medical Commission" />
						<Term abbr="AIIMS" full="All India Institute of Medical Sciences" />
					</div>
				</CardContent>
			</Card>

			{/* ── Footer ── */}
			<div className="text-center text-xs text-muted-foreground py-4">
				AIIMS Patna — Department of Emergency Medicine — PG Residency Digital
				Logbook
			</div>
		</div>
	);
}

/* ─── Sub-components ─── */

function RoleCard({
	role,
	icon: Icon,
	color,
	bg,
	items,
}: {
	role: string;
	icon: LucideIcon;
	color: string;
	bg: string;
	items: string[];
}) {
	return (
		<div className={`rounded-lg ${bg} p-4`}>
			<div className="flex items-center gap-2 mb-2">
				<Icon className={`h-5 w-5 ${color}`} />
				<h4 className={`text-sm font-semibold ${color}`}>{role}</h4>
			</div>
			<ul className="space-y-1">
				{items.map((item, i) => (
					<li
						key={i}
						className="text-xs text-muted-foreground flex items-start gap-1.5"
					>
						<CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
						<span>{item}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function Term({ abbr, full }: { abbr: string; full: string }) {
	return (
		<div className="flex items-baseline gap-2">
			<Badge
				variant="outline"
				className="text-[10px] px-1.5 font-mono shrink-0"
			>
				{abbr}
			</Badge>
			<span className="text-xs text-muted-foreground">{full}</span>
		</div>
	);
}
