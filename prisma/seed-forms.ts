/**
 * @module Seed Form Definitions
 * @description One-time seed script to populate the FormDefinition table
 * with all 23 form types that exist in the system.
 * 
 * Run with: npx tsx prisma/seed-forms.ts
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const FORM_DEFINITIONS = [
	// ═══ Academic ═══
	{ slug: "rotation-postings", title: "Rotation Postings", category: "Academic", icon: "MapPin", route: "/rotation-postings", sortOrder: 1 },
	{ slug: "thesis", title: "Thesis Tracking", category: "Academic", icon: "BookOpen", route: "/thesis", sortOrder: 2 },
	{ slug: "attendance", title: "Attendance", category: "Academic", icon: "CalendarCheck", route: "/attendance", sortOrder: 3 },
	{ slug: "case-presentations", title: "Case Presentations", category: "Academic", icon: "Presentation", route: "/case-presentations", sortOrder: 4 },
	{ slug: "seminar-discussions", title: "Seminar Discussions", category: "Academic", icon: "MessageSquare", route: "/seminars", sortOrder: 5 },
	{ slug: "journal-clubs", title: "Journal Clubs", category: "Academic", icon: "BookMarked", route: "/journal-clubs", sortOrder: 6 },
	{ slug: "internal-assessments", title: "Internal Assessments", category: "Academic", icon: "FileCheck", route: "/internal-assessments", sortOrder: 7 },

	// ═══ Clinical ═══
	{ slug: "clinical-skills", title: "Clinical Skills", category: "Clinical", icon: "Stethoscope", route: "/clinical-skills", sortOrder: 10 },
	{ slug: "case-management", title: "Case Management Logs", category: "Clinical", icon: "ClipboardList", route: "/case-management", sortOrder: 11 },
	{ slug: "procedure-logs", title: "Procedure Logs", category: "Clinical", icon: "Syringe", route: "/procedures", sortOrder: 12 },
	{ slug: "diagnostic-skills", title: "Diagnostic Skills", category: "Clinical", icon: "Activity", route: "/diagnostics", sortOrder: 13 },
	{ slug: "imaging-logs", title: "Imaging Logs", category: "Clinical", icon: "Scan", route: "/imaging", sortOrder: 14 },
	{ slug: "transport-logs", title: "Transport Logs", category: "Clinical", icon: "Ambulance", route: "/transport", sortOrder: 15 },
	{ slug: "consent-bad-news", title: "Consent & Bad News", category: "Clinical", icon: "FileWarning", route: "/consent-bad-news", sortOrder: 16 },

	// ═══ Professional ═══
	{ slug: "life-support-courses", title: "Life Support Courses", category: "Professional", icon: "HeartPulse", route: "/life-support-courses", sortOrder: 20 },
	{ slug: "conferences", title: "Conferences", category: "Professional", icon: "Users", route: "/conferences", sortOrder: 21 },
	{ slug: "research-activities", title: "Research Activities", category: "Professional", icon: "FlaskConical", route: "/research-activities", sortOrder: 22 },
	{ slug: "disaster-drills", title: "Disaster Drills", category: "Professional", icon: "AlertTriangle", route: "/disaster-drills", sortOrder: 23 },
	{ slug: "quality-improvement", title: "Quality Improvement", category: "Professional", icon: "TrendingUp", route: "/quality-improvement", sortOrder: 24 },
	{ slug: "logbook-reviews", title: "Logbook Reviews", category: "Professional", icon: "ClipboardCheck", route: "/logbook-reviews", sortOrder: 25 },
	{ slug: "evaluation-graph", title: "Evaluation Graph", category: "Professional", icon: "BarChart3", route: "/evaluation-graph", sortOrder: 26 },
	{ slug: "training-mentoring", title: "Training & Mentoring", category: "Professional", icon: "GraduationCap", route: "/training-mentoring", sortOrder: 27 },
];

async function main() {
	console.log("🌱 Seeding FormDefinitions...");

	for (const formDef of FORM_DEFINITIONS) {
		await prisma.formDefinition.upsert({
			where: { slug: formDef.slug },
			update: {
				title: formDef.title,
				category: formDef.category,
				icon: formDef.icon,
				route: formDef.route,
				sortOrder: formDef.sortOrder,
			},
			create: {
				slug: formDef.slug,
				title: formDef.title,
				category: formDef.category,
				icon: formDef.icon,
				route: formDef.route,
				sortOrder: formDef.sortOrder,
				isActive: true,
			},
		});
		console.log(`  ✅ ${formDef.title}`);
	}

	console.log(`\n🎉 Seeded ${FORM_DEFINITIONS.length} FormDefinitions.`);
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
