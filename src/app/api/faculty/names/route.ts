/**
 * @module POST /api/faculty/names
 * @description Fetches faculty names by their IDs
 * Used by RevisionThread to resolve facultyId to faculty names
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
	try {
		const { facultyIds } = await req.json();

		if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
			return NextResponse.json({});
		}

		const faculty = await prisma.user.findMany({
			where: { id: { in: facultyIds } },
			select: {
				id: true,
				firstName: true,
				lastName: true,
			},
		});

		// Transform to { facultyId: { firstName, lastName } }
		const result: Record<string, { firstName: string; lastName: string }> = {};
		for (const fac of faculty) {
			result[fac.id] = {
				firstName: fac.firstName,
				lastName: fac.lastName,
			};
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("[FACULTY_NAMES_API]", error);
		return NextResponse.json(
			{ error: "Failed to fetch faculty names" },
			{ status: 500 },
		);
	}
}
