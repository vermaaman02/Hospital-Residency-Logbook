/**
 * @module HealthCheckAPI
 * @description Health check endpoint for Railway deployment monitoring.
 * Verifies that the app is running and can connect to the database.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		// Verify database connectivity with a lightweight query
		await prisma.$executeRaw`SELECT 1`;

		return NextResponse.json({
			status: "ok",
			timestamp: new Date().toISOString(),
			service: "aiims-patna-logbook",
			database: "connected",
		});
	} catch {
		return NextResponse.json(
			{
				status: "degraded",
				timestamp: new Date().toISOString(),
				service: "aiims-patna-logbook",
				database: "disconnected",
			},
			{ status: 503 },
		);
	}
}
