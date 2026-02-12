/**
 * @module HealthCheckAPI
 * @description Health check endpoint for Railway deployment monitoring.
 */

import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		service: "aiims-patna-logbook",
	});
}
