/**
 * @module HelpGuideClient
 * @description Interactive, role-aware Help & Guide client component.
 * Features tabbed navigation, searchable module guide, collapsible FAQs,
 * role-specific workflows, and medical abbreviation reference.
 * Mobile-first responsive design.
 *
 * @see copilot-instructions.md — Section 1, 11
 * @see PG Logbook .md — All logbook sections
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
	Search,
	ExternalLink,
	Lightbulb,
	Shield,
	UserCircle,
	Settings,
	PenLine,
	Eye,
	FileCheck,
	TrendingUp,
	type LucideIcon,
} from "lucide-react";

/* ═══════════════════ TYPES ═══════════════════ */

interface HelpGuideClientProps {
	role: string;
}

interface ModuleInfo {
	title: string;
	icon: LucideIcon;
	description: string;
	path: string;
	audience: ("student" | "faculty" | "hod")[];
	category: string;
	tips: string[];
}

interface FAQ {
	question: string;
	answer: string;
	audience: ("student" | "faculty" | "hod")[];
}

interface WorkflowStep {
	step: number;
	title: string;
	description: string;
	icon: LucideIcon;
}

/* ═══════════════════ DATA ═══════════════════ */

const STUDENT_MODULES: ModuleInfo[] = [
	{
		title: "Rotation Postings",
		icon: RotateCcw,
		description:
			"Log department rotation postings across semesters 1-6. Record the department, period (from-to), and key learning experiences.",
		path: "/dashboard/student/rotation-postings",
		audience: ["student"],
		category: "Administrative",
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
			"Monthly attendance sheets covering duties, academic days, and leaves. Auto-calculates attendance percentage.",
		path: "/dashboard/student/attendance",
		audience: ["student"],
		category: "Administrative",
		tips: [
			"Submit one sheet per month — date range cannot overlap.",
			"You can retract a SUBMITTED sheet back to DRAFT if needed.",
			"All 7 rows (Working Days, Night Duties, Academic Days, etc.) are editable.",
		],
	},
	{
		title: "Case Presentations & Seminars",
		icon: BookOpen,
		description:
			"Log case presentations, seminars, and discussions. Record topic, date, venue, audience, and faculty feedback.",
		path: "/dashboard/student/case-presentations",
		audience: ["student"],
		category: "Academic",
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
		audience: ["student"],
		category: "Academic",
		tips: [
			"Record the article citation, journal name, and your analysis.",
			"Journal clubs demonstrate your research literacy.",
		],
	},
	{
		title: "Clinical Skills",
		icon: Stethoscope,
		description:
			"Track clinical skill competencies for both Adult and Pediatric Emergency Medicine. Progress across S/O/A/PS/PI levels.",
		path: "/dashboard/student/clinical-skills",
		audience: ["student"],
		category: "Clinical",
		tips: [
			"Adult and Pediatric skills are tracked separately.",
			"Progress from Simulation → Observed → Assisted → Performed under Supervision → Performed Independently.",
			"Use inline editing — click any cell to update values.",
		],
	},
	{
		title: "Case Management",
		icon: ClipboardList,
		description:
			"The largest module — log cases across 25 categories including Resuscitation, Airway, Trauma, and more. Track competency (CBD/S/O/MS/MI).",
		path: "/dashboard/student/case-management",
		audience: ["student"],
		category: "Clinical",
		tips: [
			"Each of the 25 tabs corresponds to a category from the NMC logbook.",
			"Record patient Name, Age, Sex, UHID, and complete diagnosis.",
			"Competency levels: CBD, Simulation, Observed, Managed under Supervision, Managed Independently.",
			"Auto-save works — entries start as DRAFT.",
		],
	},
	{
		title: "Procedures",
		icon: Syringe,
		description:
			"Log procedural skills across 48+ categories. Each entry tracks skill level and includes patient details.",
		path: "/dashboard/student/procedures",
		audience: ["student"],
		category: "Clinical",
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
			"Track diagnostic skill competencies including ABG interpretation, ECG reading, and others.",
		path: "/dashboard/student/diagnostics",
		audience: ["student"],
		category: "Clinical",
		tips: [
			"Categories include ABG, ECG, Lab Investigations, and more.",
			"Confidence levels: Very Confident / Fairly Confident / Slightly Confident / Not Confident.",
		],
	},
	{
		title: "Imaging",
		icon: Scan,
		description:
			"Log imaging skills including POCUS, X-Ray interpretation, CT readings, and ultrasound procedures.",
		path: "/dashboard/student/imaging",
		audience: ["student"],
		category: "Clinical",
		tips: [
			"POCUS (Point of Care Ultrasonography) is a key competency.",
			"Record findings and clinical correlation.",
		],
	},
	{
		title: "Transport Logs",
		icon: Truck,
		description:
			"Document inter-hospital or intra-hospital patient transport cases, including transport details and outcomes.",
		path: "/dashboard/student/transport",
		audience: ["student"],
		category: "Other Logs",
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
		audience: ["student"],
		category: "Other Logs",
		tips: [
			"Consent and Bad News are managed in separate tabs.",
			"Document the context, approach, and outcome.",
		],
	},
	{
		title: "Life-Support Courses",
		icon: GraduationCap,
		description:
			"Record certifications in BLS, ACLS, PALS, ATLS, and other life-support courses attended.",
		path: "/dashboard/student/life-support-courses",
		audience: ["student"],
		category: "Professional",
		tips: [
			"Upload certificate details when available.",
			"These courses are mandatory for EM residency completion.",
		],
	},
	{
		title: "Conference Participation",
		icon: Award,
		description:
			"Log participation in medical conferences, CMEs, and workshops.",
		path: "/dashboard/student/conferences",
		audience: ["student"],
		category: "Professional",
		tips: [
			"Record the conference name, date, and your role.",
			"Poster/paper presentations count towards academic output.",
		],
	},
	{
		title: "Research & Outreach",
		icon: FlaskConical,
		description:
			"Track publications, research projects, community outreach, and scholarly activities.",
		path: "/dashboard/student/research-activities",
		audience: ["student"],
		category: "Professional",
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
		audience: ["student"],
		category: "Professional",
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
		audience: ["student"],
		category: "Professional",
		tips: [
			"QI projects demonstrate systems-level thinking.",
			"Document the problem, intervention, and outcome.",
		],
	},
	{
		title: "Logbook Reviews",
		icon: ClipboardCheck,
		description:
			"Periodic faculty reviews of your entire logbook with overall assessment and comments.",
		path: "/dashboard/student/logbook-reviews",
		audience: ["student"],
		category: "Evaluation",
		tips: [
			"Reviews happen at regular intervals each semester.",
			"Faculty grades your logbook completeness and quality.",
		],
	},
	{
		title: "Evaluation Graph",
		icon: BarChart3,
		description:
			"5-domain × 6-semester radar chart showing progression in Knowledge, Clinical Skills, Procedural Skills, Soft Skills, and Research.",
		path: "/dashboard/student/evaluation-graph",
		audience: ["student"],
		category: "Evaluation",
		tips: [
			"Interactive chart shows semester-wise progression.",
			"Each domain is scored 1-5 by your supervising faculty.",
		],
	},
	{
		title: "Thesis",
		icon: BookOpen,
		description:
			"Track your thesis progress — topic, chief guide, co-guide, and status updates from proposal to completion.",
		path: "/dashboard/student/thesis",
		audience: ["student"],
		category: "Academic",
		tips: [
			"Keep your thesis status updated regularly.",
			"Your guide can review and sign off on milestones.",
		],
	},
	{
		title: "Training & Mentoring",
		icon: Users,
		description:
			"Log instances where you trained juniors, mentored interns, or conducted teaching sessions.",
		path: "/dashboard/student/training-mentoring",
		audience: ["student"],
		category: "Professional",
		tips: [
			"Teaching is a core EM competency.",
			"Include details of the topic and learner feedback.",
		],
	},
];

const FACULTY_MODULES: ModuleInfo[] = [
	{
		title: "Dashboard",
		icon: LayoutDashboard,
		description:
			"Overview of your assigned students, pending reviews, recent activity, and module-wise submission counts.",
		path: "/dashboard/faculty",
		audience: ["faculty"],
		category: "Overview",
		tips: [
			"Check pending review badges regularly.",
			"The dashboard shows counts for each module needing review.",
		],
	},
	{
		title: "My Students",
		icon: Users,
		description:
			"View all students assigned to you. Click a student to see their logbook entries across all modules.",
		path: "/dashboard/faculty/students",
		audience: ["faculty"],
		category: "Overview",
		tips: [
			"Each student card shows their progress at a glance.",
			"Click to dive into individual module entries.",
		],
	},
	{
		title: "Review Entries",
		icon: ClipboardCheck,
		description:
			"Review submitted entries across all modules — case management, procedures, diagnostics, imaging, and more. Sign or request revision.",
		path: "/dashboard/faculty/students",
		audience: ["faculty"],
		category: "Review",
		tips: [
			"Entries appear under each module tab for the selected student.",
			"Click 'Sign' to approve or 'Request Revision' with remarks.",
			"Your digital signature is recorded with timestamp.",
		],
	},
	{
		title: "Evaluation Graph",
		icon: BarChart3,
		description:
			"Fill semester-wise evaluation scores (1-5) across 5 domains for each assigned student.",
		path: "/dashboard/faculty/evaluation-graph",
		audience: ["faculty"],
		category: "Evaluation",
		tips: [
			"Update scores at the end of each semester.",
			"Domains: Knowledge, Clinical Skills, Procedural Skills, Soft Skills, Research.",
		],
	},
	{
		title: "Logbook Reviews",
		icon: ClipboardCheck,
		description:
			"Conduct periodic overall logbook reviews. Provide assessment remarks on completeness and quality.",
		path: "/dashboard/faculty/logbook-reviews",
		audience: ["faculty"],
		category: "Evaluation",
		tips: [
			"Schedule reviews at regular intervals.",
			"Your comments guide students on areas needing improvement.",
		],
	},
];

const HOD_MODULES: ModuleInfo[] = [
	{
		title: "Dashboard",
		icon: LayoutDashboard,
		description:
			"Department-wide overview with total students, faculty, entries, completion rates, and at-a-glance stats.",
		path: "/dashboard/hod",
		audience: ["hod"],
		category: "Overview",
		tips: [
			"The dashboard gives you a bird's-eye view of the entire department.",
			"Stats update in real-time.",
		],
	},
	{
		title: "All Students",
		icon: Users,
		description:
			"View all PG residents with their entry counts, signed progress, faculty assignments, and thesis status.",
		path: "/dashboard/hod/students",
		audience: ["hod"],
		category: "Management",
		tips: [
			"Filter by batch, semester, or search by name.",
			"Click any student to see their detailed logbook.",
		],
	},
	{
		title: "Faculty Management",
		icon: UserCog,
		description:
			"View all faculty members, their workload, student assignments, signature activity, and remarks count.",
		path: "/dashboard/hod/faculty",
		audience: ["hod"],
		category: "Management",
		tips: [
			"Monitor faculty workload distribution.",
			"Check for unassigned students.",
		],
	},
	{
		title: "User Management",
		icon: Shield,
		description:
			"Manage user roles, create accounts, ban/unban users, promote student semesters, and manage batches.",
		path: "/dashboard/hod/manage-users",
		audience: ["hod"],
		category: "Management",
		tips: [
			"Assign roles when new users register.",
			"Promote students to next semester at the end of each term.",
		],
	},
	{
		title: "Faculty-Student Assignments",
		icon: UserCircle,
		description:
			"Assign faculty members to students for each semester. Faculty can only review entries from assigned students.",
		path: "/dashboard/hod/assignments",
		audience: ["hod"],
		category: "Management",
		tips: [
			"Assignments are semester-specific.",
			"Ensure every student has an assigned faculty.",
		],
	},
	{
		title: "Analytics",
		icon: TrendingUp,
		description:
			"Department-wide analytics including student rankings, module completion rates, faculty workload charts, and trend analysis.",
		path: "/dashboard/hod/analytics",
		audience: ["hod"],
		category: "Analytics",
		tips: [
			"Use analytics to identify students falling behind.",
			"Compare completion rates across batches.",
		],
	},
];

const STUDENT_WORKFLOW: WorkflowStep[] = [
	{
		step: 1,
		title: "Fill Form",
		description: "Enter patient/case details. Entry auto-saves as DRAFT.",
		icon: PenLine,
	},
	{
		step: 2,
		title: "Submit",
		description: "Click 'Submit for Review' when ready.",
		icon: ArrowRight,
	},
	{
		step: 3,
		title: "Faculty Reviews",
		description: "Assigned faculty reviews your submission.",
		icon: Eye,
	},
	{
		step: 4,
		title: "Signed / Revised",
		description: "Entry is SIGNED or marked NEEDS_REVISION.",
		icon: FileCheck,
	},
	{
		step: 5,
		title: "Track Progress",
		description: "Monitor on Dashboard & Evaluation Graph.",
		icon: TrendingUp,
	},
];

const FACULTY_WORKFLOW: WorkflowStep[] = [
	{
		step: 1,
		title: "Check Pending",
		description: "Open Dashboard and view pending review counts.",
		icon: Eye,
	},
	{
		step: 2,
		title: "Select Student",
		description: "Navigate to My Students → select a student.",
		icon: Users,
	},
	{
		step: 3,
		title: "Review Entry",
		description: "Open the submitted entry and verify details.",
		icon: ClipboardCheck,
	},
	{
		step: 4,
		title: "Sign or Revise",
		description: "Approve with Sign or request changes with remarks.",
		icon: FileCheck,
	},
];

const HOD_WORKFLOW: WorkflowStep[] = [
	{
		step: 1,
		title: "Monitor Dashboard",
		description: "Check department stats and pending items.",
		icon: LayoutDashboard,
	},
	{
		step: 2,
		title: "Manage Users",
		description: "Assign roles, create batches, promote students.",
		icon: Settings,
	},
	{
		step: 3,
		title: "Assign Faculty",
		description: "Map faculty to students for each semester.",
		icon: Users,
	},
	{
		step: 4,
		title: "Review Analytics",
		description: "Track completion rates and identify gaps.",
		icon: TrendingUp,
	},
];

const GENERAL_FAQS: FAQ[] = [
	{
		question: "What are the entry statuses and what do they mean?",
		answer:
			"DRAFT — saved but not submitted. SUBMITTED — sent for faculty review. SIGNED — approved by faculty. NEEDS_REVISION — faculty requested changes. REJECTED — entry was rejected.",
		audience: ["student", "faculty", "hod"],
	},
	{
		question: "How do I access my profile and account settings?",
		answer:
			"Click 'My Profile' in the sidebar. The Overview tab shows your logbook info, and the Account Settings tab lets you change your profile photo, password, manage connected devices, and active sessions.",
		audience: ["student", "faculty", "hod"],
	},
];

const STUDENT_FAQS: FAQ[] = [
	{
		question: "How do I submit an entry for review?",
		answer:
			"Click 'Submit for Review' on any DRAFT entry. Faculty assigned to you will see it in their Pending Reviews queue. Once reviewed, it becomes SIGNED or NEEDS_REVISION.",
		audience: ["student"],
	},
	{
		question: "Can I edit a signed entry?",
		answer:
			"No. Once SIGNED by faculty, the entry becomes read-only. This ensures logbook integrity for NMC review.",
		audience: ["student"],
	},
	{
		question: "How does the attendance retract feature work?",
		answer:
			"If you submitted an attendance sheet by mistake, click 'Retract' to move it back to DRAFT. You can then edit and resubmit. Only SUBMITTED sheets can be retracted.",
		audience: ["student"],
	},
	{
		question: "What is auto-save?",
		answer:
			"Most forms auto-save your work as DRAFT periodically. You won't lose data if you close the tab accidentally. Look for the 'Saved as Draft' confirmation.",
		audience: ["student"],
	},
	{
		question: "How are competency levels tracked?",
		answer:
			"Case Management: CBD / S (Simulation) / O (Observed) / MS (Managed under Supervision) / MI (Managed Independently). Procedures: S / O / A (Assisted) / PS (Performed under Supervision) / PI (Performed Independently). CPR: S / TM (Team Member) / TL (Team Leader).",
		audience: ["student"],
	},
	{
		question: "What does the tally counter show?",
		answer:
			"The tally shows how many entries you have in a given category against the NMC target. For example, '12 of 90' means you have logged 12 of the 90 expected entries.",
		audience: ["student"],
	},
	{
		question: "How do I see my progress across all modules?",
		answer:
			"Your Student Dashboard shows a module progress grid with entry counts and completion percentages for every section of the logbook.",
		audience: ["student"],
	},
	{
		question: "What happens if faculty requests revision?",
		answer:
			"You'll see the entry marked NEEDS_REVISION with the faculty's remark. Edit the entry to address feedback, then resubmit for review.",
		audience: ["student"],
	},
];

const FACULTY_FAQS: FAQ[] = [
	{
		question: "How do I review a student's entries?",
		answer:
			"Go to 'My Students' → click on a student → navigate to the specific module tab. SUBMITTED entries will have a 'Review' option. You can Sign (approve) or Request Revision with remarks.",
		audience: ["faculty"],
	},
	{
		question: "Can I see entries from students not assigned to me?",
		answer:
			"No. You can only view and review entries from students assigned to you by the HOD. Contact the HOD if you need different assignments.",
		audience: ["faculty"],
	},
	{
		question: "How do I add remarks to an entry?",
		answer:
			"When reviewing a submitted entry, use the 'Add Remark' field. Your remark will be visible to the student. You can add remarks when signing or when requesting revision.",
		audience: ["faculty"],
	},
	{
		question: "How do I fill the Evaluation Graph?",
		answer:
			"Go to Evaluation Graph → select a student → choose the semester. Rate the student 1-5 across 5 domains: Knowledge, Clinical Skills, Procedural Skills, Soft Skills, and Research.",
		audience: ["faculty"],
	},
	{
		question: "What are Logbook Reviews?",
		answer:
			"Periodic overall assessments of a student's entire logbook. You provide comments on completeness, quality, and areas for improvement. These are separate from individual entry reviews.",
		audience: ["faculty"],
	},
];

const HOD_FAQS: FAQ[] = [
	{
		question: "How do I assign faculty to students?",
		answer:
			"Go to Dashboard → Faculty-Student Assignments. Select a semester, then map faculty members to students. Each student should have at least one assigned faculty per semester.",
		audience: ["hod"],
	},
	{
		question: "How do I manage user roles?",
		answer:
			"Go to User Management. New users default to the Student role. Use the role dropdown to change a user to Faculty or HOD. You can also ban/unban users from this page.",
		audience: ["hod"],
	},
	{
		question: "How do I promote students to the next semester?",
		answer:
			"In User Management, select students and use the 'Promote Semester' action. This updates their current semester, affecting which data they see in semester-filtered views.",
		audience: ["hod"],
	},
	{
		question: "How does the analytics page work?",
		answer:
			"Analytics shows department-wide data: student rankings by entries/completion, faculty workload distribution, module completion rates, and semester-wise trends. Use it to identify students or modules that need attention.",
		audience: ["hod"],
	},
	{
		question: "Can I see all entries across all students?",
		answer:
			"Yes. As HOD, you have access to every student's entries across all modules. Navigate to any module from the sidebar — the HOD view shows entries from all students with filterable columns.",
		audience: ["hod"],
	},
	{
		question: "How do I manage batches?",
		answer:
			"In User Management, use the Batch Management section to create batches (e.g., 'July 2024'), assign students to batches, and filter views by batch.",
		audience: ["hod"],
	},
];

const ABBREVIATIONS = [
	{ abbr: "UHID", full: "Unique Hospital Identification Number" },
	{ abbr: "CBD", full: "Case Based Discussion" },
	{
		abbr: "S/O/MS/MI",
		full: "Simulation / Observed / Managed Supervision / Managed Independently",
	},
	{
		abbr: "S/O/A/PS/PI",
		full: "Simulation / Observed / Assisted / Performed Supervision / Performed Independently",
	},
	{
		abbr: "VC/FC/SC/NC",
		full: "Very Confident / Fairly Confident / Slightly Confident / Not Confident",
	},
	{ abbr: "ABG", full: "Arterial Blood Gas" },
	{ abbr: "ECG", full: "Electrocardiogram" },
	{ abbr: "POCUS", full: "Point of Care Ultrasonography" },
	{ abbr: "ICD", full: "Intercostal Chest Drain" },
	{ abbr: "CPR", full: "Cardiopulmonary Resuscitation" },
	{ abbr: "NMC", full: "National Medical Commission" },
	{ abbr: "AIIMS", full: "All India Institute of Medical Sciences" },
	{ abbr: "BLS", full: "Basic Life Support" },
	{ abbr: "ACLS", full: "Advanced Cardiac Life Support" },
	{ abbr: "PALS", full: "Pediatric Advanced Life Support" },
	{ abbr: "ATLS", full: "Advanced Trauma Life Support" },
	{ abbr: "EM", full: "Emergency Medicine" },
	{ abbr: "HOD", full: "Head of Department" },
];

/* ═══════════════════ COMPONENT ═══════════════════ */

export function HelpGuideClient({ role }: HelpGuideClientProps) {
	const [search, setSearch] = useState("");

	const defaultTab =
		role === "hod" ? "hod"
		: role === "faculty" ? "faculty"
		: "student";

	// Get relevant FAQs
	const faqs = useMemo(() => {
		const roleFaqs =
			role === "hod" ? HOD_FAQS
			: role === "faculty" ? FACULTY_FAQS
			: STUDENT_FAQS;
		return [...GENERAL_FAQS, ...roleFaqs];
	}, [role]);

	// Get workflow for current role
	const workflow = useMemo(() => {
		if (role === "hod") return HOD_WORKFLOW;
		if (role === "faculty") return FACULTY_WORKFLOW;
		return STUDENT_WORKFLOW;
	}, [role]);

	return (
		<div className="space-y-5">
			{/* ── Getting Started ── */}
			<Card className="border-0 shadow-sm overflow-hidden">
				<div className="bg-linear-to-r from-hospital-primary/5 via-blue-50/50 to-teal-50/50 p-4 sm:p-6">
					<div className="flex items-start gap-3">
						<div className="h-10 w-10 rounded-xl bg-hospital-primary/10 flex items-center justify-center shrink-0">
							<BookMarked className="h-5 w-5 text-hospital-primary" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-900">
								Welcome to the Digital Logbook
							</h2>
							<p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-3xl">
								This application replaces the physical PG Residency logbook for
								MD Emergency Medicine residents at AIIMS Patna. Every form from
								the physical logbook has a digital equivalent. Entries are
								reviewed and signed by assigned faculty, with the HOD overseeing
								department-wide progress.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
						<RoleCard
							role="Student"
							icon={GraduationCap}
							color="text-blue-700"
							borderColor="border-blue-200"
							bg="bg-white"
							highlight={role === "student"}
							items={[
								"Log cases, procedures, skills & diagnostics",
								"Submit entries for faculty review",
								"Track progress on dashboard",
								"View evaluation graphs & thesis progress",
							]}
						/>
						<RoleCard
							role="Faculty"
							icon={Users}
							color="text-teal-700"
							borderColor="border-teal-200"
							bg="bg-white"
							highlight={role === "faculty"}
							items={[
								"Review assigned students' entries",
								"Sign approved entries digitally",
								"Add remarks or request revision",
								"Fill semester evaluation scores",
							]}
						/>
						<RoleCard
							role="HOD"
							icon={UserCog}
							color="text-purple-700"
							borderColor="border-purple-200"
							bg="bg-white"
							highlight={role === "hod"}
							items={[
								"Department-wide oversight & analytics",
								"Manage users, roles & batches",
								"Assign faculty to students",
								"Monitor completion rates & rankings",
							]}
						/>
					</div>
				</div>
			</Card>

			{/* ── Your Workflow ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<ArrowRight className="h-4 w-4 text-hospital-primary" />
						Your Workflow
						<Badge variant="secondary" className="text-[10px] ml-1 capitalize">
							{role}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
						{workflow.map((s, idx) => {
							const Icon = s.icon;
							return (
								<div key={s.step} className="relative">
									<div className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center rounded-lg border border-gray-100 bg-gray-50/50 p-3 h-full">
										<div className="relative shrink-0">
											<div className="h-9 w-9 rounded-full bg-hospital-primary text-white flex items-center justify-center text-sm font-bold">
												{s.step}
											</div>
											<div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center">
												<Icon className="h-2.5 w-2.5 text-hospital-primary" />
											</div>
										</div>
										<div className="sm:mt-1">
											<p className="text-sm font-semibold">{s.title}</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{s.description}
											</p>
										</div>
									</div>
									{idx < workflow.length - 1 && (
										<ArrowRight className="h-4 w-4 text-gray-300 hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10" />
									)}
								</div>
							);
						})}
					</div>

					<Separator className="my-4" />

					<div className="flex flex-wrap gap-2">
						<span className="text-xs text-muted-foreground mr-1 self-center">
							Status Legend:
						</span>
						<StatusBadge label="DRAFT" className="bg-gray-100 text-gray-700" />
						<StatusBadge
							label="SUBMITTED"
							className="bg-amber-50 text-amber-700 border-amber-200"
						/>
						<StatusBadge
							label="SIGNED"
							className="bg-emerald-50 text-emerald-700 border-emerald-200"
						/>
						<StatusBadge
							label="NEEDS REVISION"
							className="bg-orange-50 text-orange-700 border-orange-200"
						/>
						<StatusBadge
							label="REJECTED"
							className="bg-red-50 text-red-700 border-red-200"
						/>
					</div>
				</CardContent>
			</Card>

			{/* ── Module Guide (tabbed by role) ── */}
			<div>
				<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<LayoutDashboard className="h-5 w-5 text-hospital-primary" />
						Module Guide
					</h3>
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search modules..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9 h-9 text-sm"
						/>
					</div>
				</div>

				<Tabs defaultValue={defaultTab}>
					<TabsList className="mb-4 h-9">
						<TabsTrigger value="student" className="text-xs">
							<GraduationCap className="h-3.5 w-3.5 mr-1" />
							Student
						</TabsTrigger>
						<TabsTrigger value="faculty" className="text-xs">
							<Users className="h-3.5 w-3.5 mr-1" />
							Faculty
						</TabsTrigger>
						<TabsTrigger value="hod" className="text-xs">
							<Shield className="h-3.5 w-3.5 mr-1" />
							HOD
						</TabsTrigger>
					</TabsList>

					<TabsContent value="student">
						<ModuleGrid modules={filterBySearch(STUDENT_MODULES, search)} />
					</TabsContent>
					<TabsContent value="faculty">
						<ModuleGrid modules={filterBySearch(FACULTY_MODULES, search)} />
					</TabsContent>
					<TabsContent value="hod">
						<ModuleGrid modules={filterBySearch(HOD_MODULES, search)} />
					</TabsContent>
				</Tabs>
			</div>

			{/* ── FAQs (accordion) ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<HelpCircle className="h-5 w-5 text-hospital-primary" />
						Frequently Asked Questions
					</CardTitle>
					<p className="text-xs text-muted-foreground mt-1">
						Showing answers relevant to your role ({role})
					</p>
				</CardHeader>
				<CardContent>
					<Accordion type="multiple" className="w-full">
						{faqs.map((faq, idx) => (
							<AccordionItem key={idx} value={`faq-${idx}`}>
								<AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-3">
									{faq.question}
								</AccordionTrigger>
								<AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
									{faq.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</CardContent>
			</Card>

			{/* ── Quick Tips ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<Lightbulb className="h-4 w-4 text-amber-500" />
						Quick Tips
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{role === "student" && (
							<>
								<TipCard
									title="Stay Consistent"
									description="Log entries on the same day as the case/procedure. Backdating reduces accuracy."
									color="bg-blue-50 text-blue-700"
								/>
								<TipCard
									title="Use UHID Always"
									description="Every patient entry should have the UHID for verification. Never skip this field."
									color="bg-teal-50 text-teal-700"
								/>
								<TipCard
									title="Aim for MI/PI"
									description="Your goal is to progress from Simulation to Managed/Performed Independently by final year."
									color="bg-purple-50 text-purple-700"
								/>
								<TipCard
									title="Check Your Dashboard"
									description="The module progress grid shows exactly where you stand. Aim for green across all modules."
									color="bg-emerald-50 text-emerald-700"
								/>
							</>
						)}
						{role === "faculty" && (
							<>
								<TipCard
									title="Review Promptly"
									description="Students wait for your signature. Try to review submitted entries within 48 hours."
									color="bg-teal-50 text-teal-700"
								/>
								<TipCard
									title="Add Constructive Remarks"
									description="When requesting revision, include specific feedback. Vague remarks don't help students improve."
									color="bg-blue-50 text-blue-700"
								/>
								<TipCard
									title="Check Pending Counts"
									description="Badge counts on your dashboard show how many entries await review in each module."
									color="bg-amber-50 text-amber-700"
								/>
								<TipCard
									title="Semester Evaluations"
									description="Fill the 5-domain evaluation graph for each student at the end of every semester."
									color="bg-purple-50 text-purple-700"
								/>
							</>
						)}
						{role === "hod" && (
							<>
								<TipCard
									title="Monitor Unassigned Students"
									description="Check the Faculty page for students without faculty assignments. Every student needs a mentor."
									color="bg-amber-50 text-amber-700"
								/>
								<TipCard
									title="Use Analytics"
									description="The analytics dashboard reveals which students are falling behind and which modules need attention."
									color="bg-blue-50 text-blue-700"
								/>
								<TipCard
									title="Batch Promotions"
									description="At the end of each semester, promote students to their next semester in User Management."
									color="bg-teal-50 text-teal-700"
								/>
								<TipCard
									title="Faculty Workload Balance"
									description="Check faculty student counts are balanced. Overloaded faculty may delay reviews."
									color="bg-purple-50 text-purple-700"
								/>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{/* ── Key Abbreviations ── */}
			<Card className="border-0 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<BookOpen className="h-4 w-4 text-hospital-primary" />
						Key Abbreviations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
						{ABBREVIATIONS.map((item) => (
							<div key={item.abbr} className="flex items-baseline gap-2">
								<Badge
									variant="outline"
									className="text-[10px] px-1.5 font-mono shrink-0"
								>
									{item.abbr}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{item.full}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* ── Contact / Footer ── */}
			<Card className="border-0 shadow-sm bg-gray-50/50">
				<CardContent className="p-4 sm:p-6 text-center">
					<p className="text-sm font-medium text-gray-700">Need More Help?</p>
					<p className="text-xs text-muted-foreground mt-1">
						Contact the Department of Emergency Medicine, AIIMS Patna for any
						logbook-related queries.
					</p>
					<p className="text-[11px] text-muted-foreground mt-3">
						AIIMS Patna — Department of Emergency Medicine — PG Residency
						Digital Logbook
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

/* ═══════════════════ HELPERS ═══════════════════ */

function filterBySearch(modules: ModuleInfo[], search: string): ModuleInfo[] {
	if (!search.trim()) return modules;
	const q = search.toLowerCase();
	return modules.filter(
		(m) =>
			m.title.toLowerCase().includes(q) ||
			m.description.toLowerCase().includes(q) ||
			m.category.toLowerCase().includes(q),
	);
}

/* ═══════════════════ SUB-COMPONENTS ═══════════════════ */

function RoleCard({
	role,
	icon: Icon,
	color,
	borderColor,
	bg,
	highlight,
	items,
}: {
	role: string;
	icon: LucideIcon;
	color: string;
	borderColor: string;
	bg: string;
	highlight: boolean;
	items: string[];
}) {
	return (
		<div
			className={`rounded-xl ${bg} border ${highlight ? `${borderColor} ring-2 ring-offset-1 ring-blue-200` : "border-gray-100"} p-4 transition-all`}
		>
			<div className="flex items-center gap-2 mb-2.5">
				<div
					className={`h-7 w-7 rounded-lg ${highlight ? "bg-hospital-primary/10" : "bg-gray-100"} flex items-center justify-center`}
				>
					<Icon className={`h-4 w-4 ${color}`} />
				</div>
				<h4 className={`text-sm font-semibold ${color}`}>{role}</h4>
				{highlight && (
					<Badge className="text-[9px] h-4 ml-auto bg-hospital-primary">
						You
					</Badge>
				)}
			</div>
			<ul className="space-y-1.5">
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

function ModuleGrid({ modules }: { modules: ModuleInfo[] }) {
	const categories = [...new Set(modules.map((m) => m.category))];

	if (modules.length === 0) {
		return (
			<div className="text-center py-10 text-sm text-muted-foreground">
				No modules match your search.
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{categories.map((cat) => (
				<div key={cat}>
					<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
						{cat}
					</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{modules
							.filter((m) => m.category === cat)
							.map((mod) => {
								const Icon = mod.icon;
								return (
									<Card
										key={mod.title}
										className="border-0 shadow-sm hover:shadow-md transition-shadow group"
									>
										<CardContent className="p-4">
											<div className="flex items-start gap-3">
												<div className="h-9 w-9 rounded-lg bg-hospital-primary/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-hospital-primary/15 transition-colors">
													<Icon className="h-5 w-5 text-hospital-primary" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold">
															{mod.title}
														</h4>
														<Link
															href={mod.path}
															className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
														>
															<ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-hospital-primary" />
														</Link>
													</div>
													<p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
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
			))}
		</div>
	);
}

function StatusBadge({
	label,
	className,
}: {
	label: string;
	className: string;
}) {
	return (
		<Badge variant="outline" className={`text-[10px] ${className}`}>
			{label}
		</Badge>
	);
}

function TipCard({
	title,
	description,
	color,
}: {
	title: string;
	description: string;
	color: string;
}) {
	return (
		<div className={`rounded-lg ${color} p-3.5`}>
			<div className="flex items-start gap-2.5">
				<Lightbulb className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
				<div>
					<p className="text-sm font-medium">{title}</p>
					<p className="text-xs opacity-80 mt-0.5 leading-relaxed">
						{description}
					</p>
				</div>
			</div>
		</div>
	);
}
