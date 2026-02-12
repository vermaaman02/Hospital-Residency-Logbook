/**
 * @module SignOffAPI
 * @description API for faculty/HOD to sign off, reject, or request revision on entries.
 * This is the digital signature workflow endpoint.
 *
 * @see copilot-instructions.md — Section 8
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const signOffSchema = z.object({
	entityType: z.string().min(1, "Entity type is required"),
	entityId: z.string().min(1, "Entity ID is required"),
	action: z.enum(["sign", "reject", "needs_revision"]),
	remark: z.string().optional(),
});

// Map entity types to their Prisma model names
const ENTITY_MODEL_MAP: Record<string, string> = {
	CaseManagementLog: "caseManagementLog",
	ProcedureLog: "procedureLog",
	ImagingLog: "imagingLog",
	ClinicalSkillAdult: "clinicalSkillAdult",
	ClinicalSkillPediatric: "clinicalSkillPediatric",
	DiagnosticSkill: "diagnosticSkill",
	CasePresentation: "casePresentation",
	Seminar: "seminar",
	JournalClub: "journalClub",
	RotationPosting: "rotationPosting",
	AttendanceSheet: "attendanceSheet",
	TransportLog: "transportLog",
	ConsentLog: "consentLog",
	BadNewsLog: "badNewsLog",
	CourseAttended: "courseAttended",
	ConferenceParticipation: "conferenceParticipation",
	ResearchActivity: "researchActivity",
	DisasterDrill: "disasterDrill",
	QualityImprovement: "qualityImprovement",
	ResidentEvaluation: "residentEvaluation",
	TrainingMentoringRecord: "trainingMentoringRecord",
};

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		// Check role: only faculty or HOD can sign
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { id: true, role: true },
		});

		if (!user)
			return NextResponse.json({ error: "User not found" }, { status: 404 });

		if (user.role !== "FACULTY" && user.role !== "HOD") {
			return NextResponse.json(
				{ error: "Only faculty or HOD can sign off entries" },
				{ status: 403 },
			);
		}

		const body = await req.json();
		const validated = signOffSchema.parse(body);

		const modelName = ENTITY_MODEL_MAP[validated.entityType];
		if (!modelName) {
			return NextResponse.json(
				{ error: "Invalid entity type" },
				{ status: 400 },
			);
		}

		// Determine new status based on action
		const statusMap = {
			sign: "SIGNED",
			reject: "REJECTED",
			needs_revision: "NEEDS_REVISION",
		} as const;

		const newStatus = statusMap[validated.action];

		// Update the entry status using dynamic model access
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const prismaModel = (prisma as Record<string, any>)[modelName] as {
			update: (args: {
				where: { id: string };
				data: { status: string; facultyRemark?: string };
			}) => Promise<unknown>;
		};

		await prismaModel.update({
			where: { id: validated.entityId },
			data: {
				status: newStatus,
				...(validated.remark ? { facultyRemark: validated.remark } : {}),
			},
		});

		// Create digital signature record if signing
		if (validated.action === "sign") {
			await prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: validated.entityType,
					entityId: validated.entityId,
					remark: validated.remark,
				},
			});
		}

		return NextResponse.json({
			success: true,
			status: newStatus,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 },
			);
		}
		console.error("[SIGN_OFF_POST]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
