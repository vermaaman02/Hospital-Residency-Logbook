/**
 * @module PrismaSeed
 * @description Seeds the database with 3 test users (HOD, Faculty, Student)
 * and a Faculty-Student assignment. Run with `npx prisma db seed`.
 *
 * @see copilot-instructions.md — Section 7
 */

/// <reference types="node" />

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_USERS = [
	{
		clerkId: "user_hod_seed_001",
		email: "hod@aiims-patna-logbook.test",
		firstName: "Dr. Rajesh",
		lastName: "Kumar",
		role: "HOD" as const,
		department: "Emergency Medicine",
		currentSemester: null,
		batch: null,
	},
	{
		clerkId: "user_faculty_seed_001",
		email: "faculty@aiims-patna-logbook.test",
		firstName: "Dr. Priya",
		lastName: "Sharma",
		role: "FACULTY" as const,
		department: "Emergency Medicine",
		currentSemester: null,
		batch: null,
	},
	{
		clerkId: "user_student_seed_001",
		email: "student@aiims-patna-logbook.test",
		firstName: "Amit",
		lastName: "Verma",
		role: "STUDENT" as const,
		department: "Emergency Medicine",
		currentSemester: 1,
		batch: "July 2024",
	},
];

async function main() {
	console.log("Starting database seed...\n");

	// --- Seed Users ---
	console.log("Seeding users...");
	for (const userData of SEED_USERS) {
		const user = await prisma.user.upsert({
			where: { clerkId: userData.clerkId },
			update: {
				email: userData.email,
				firstName: userData.firstName,
				lastName: userData.lastName,
				role: userData.role,
				department: userData.department,
				currentSemester: userData.currentSemester,
				batch: userData.batch,
			},
			create: {
				clerkId: userData.clerkId,
				email: userData.email,
				firstName: userData.firstName,
				lastName: userData.lastName,
				role: userData.role,
				department: userData.department,
				currentSemester: userData.currentSemester,
				batch: userData.batch,
			},
		});
		console.log(
			`  [OK] ${user.role.padEnd(7)} -> ${user.firstName} ${user.lastName} (${user.email})`,
		);
	}

	// --- Seed Faculty-Student Assignment ---
	console.log("\nCreating Faculty-Student assignment...");
	const faculty = await prisma.user.findUnique({
		where: { clerkId: "user_faculty_seed_001" },
	});
	const student = await prisma.user.findUnique({
		where: { clerkId: "user_student_seed_001" },
	});

	if (faculty && student) {
		await prisma.facultyStudentAssignment.upsert({
			where: {
				facultyId_studentId_semester: {
					facultyId: faculty.id,
					studentId: student.id,
					semester: 1,
				},
			},
			update: {},
			create: {
				facultyId: faculty.id,
				studentId: student.id,
				semester: 1,
			},
		});
		console.log(
			`  [OK] ${faculty.firstName} ${faculty.lastName} -> ${student.firstName} ${student.lastName} (Semester 1)`,
		);
	}

	console.log("\nDatabase seed completed.");
	console.log("");
	console.log("Seeded users:");
	console.log(
		"  HOD:     hod@aiims-patna-logbook.test     (clerkId: user_hod_seed_001)",
	);
	console.log(
		"  Faculty: faculty@aiims-patna-logbook.test (clerkId: user_faculty_seed_001)",
	);
	console.log(
		"  Student: student@aiims-patna-logbook.test (clerkId: user_student_seed_001)",
	);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(" Seed failed:", e);
		await prisma.$disconnect();
		process.exit(1);
	});
