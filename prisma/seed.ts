/**
 * @module PrismaSeed
 * @description Seeds the database with initial data: rotation posting names,
 * case categories as reference data. Run with `npx prisma db seed`.
 *
 * This does NOT seed user data — users are created via Clerk webhooks.
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

async function main() {
	console.log("🌱 Starting database seed...");

	// Seed is minimal because all reference data (case categories,
	// procedure types, clinical skills, etc.) is stored as TypeScript
	// constants in src/lib/constants/ rather than in the database.
	//
	// The database only stores user-generated entries (log entries,
	// rotation postings, etc.). Reference lookups happen in-memory
	// from the constants files for better performance.

	console.log("✅ Database seed completed.");
	console.log("");
	console.log("Note: Reference data (case categories, procedure types, etc.)");
	console.log("is stored as TypeScript constants in src/lib/constants/.");
	console.log("User data is synced via Clerk webhooks.");
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error("❌ Seed failed:", e);
		await prisma.$disconnect();
		process.exit(1);
	});
