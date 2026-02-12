/**
 * @module Clinical Skills Actions
 * @description Server actions for clinical skills (Adult & Pediatric).
 * 10 fixed skills per type. Auto-initializes on first access.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 * @see prisma/schema.prisma — ClinicalSkillAdult, ClinicalSkillPediatric
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	clinicalSkillSchema,
	type ClinicalSkillInput,
} from "@/lib/validators/clinical-skills";
import {
	CLINICAL_SKILLS_ADULT,
	CLINICAL_SKILLS_PEDIATRIC,
} from "@/lib/constants/clinical-skills";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/dashboard/student/clinical-skills";

// ─── Helpers ────────────────────────────────────────────────

function getModel(type: "adult" | "pediatric") {
	return type === "adult"
		? prisma.clinicalSkillAdult
		: prisma.clinicalSkillPediatric;
}

function getSkillList(type: "adult" | "pediatric") {
	return type === "adult" ? CLINICAL_SKILLS_ADULT : CLINICAL_SKILLS_PEDIATRIC;
}

// ─── Initialize ─────────────────────────────────────────────

/**
 * Auto-initialize all 10 skills for a student if none exist yet.
 * Called on first page load.
 */
export async function initializeClinicalSkills(type: "adult" | "pediatric") {
	const userId = await requireAuth();
	const model = getModel(type);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { userId },
		select: { id: true },
	});

	if (existing.length > 0) return { initialized: false };

	const skills = getSkillList(type);
	await Promise.all(
		skills.map((skill) =>
			(model as typeof prisma.clinicalSkillAdult).create({
				data: {
					userId,
					slNo: skill.slNo,
					skillName: skill.name,
					totalTimesPerformed: 0,
					status: "DRAFT",
				},
			}),
		),
	);

	revalidatePath(REVALIDATE_PATH);
	return { initialized: true };
}

// ─── Read ───────────────────────────────────────────────────

/**
 * Get all clinical skills entries for the current student.
 */
export async function getMyClinicalSkills(type: "adult" | "pediatric") {
	const userId = await requireAuth();
	const model = getModel(type);

	return (model as typeof prisma.clinicalSkillAdult).findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

// ─── Update ─────────────────────────────────────────────────

/**
 * Update a clinical skill entry (representative diagnosis, confidence, tally).
 */
export async function updateClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	data: ClinicalSkillInput,
) {
	const userId = await requireAuth();
	const model = getModel(type);
	const validated = clinicalSkillSchema.parse(data);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await (model as typeof prisma.clinicalSkillAdult).update({
		where: { id },
		data: {
			representativeDiagnosis: validated.representativeDiagnosis,
			confidenceLevel: validated.confidenceLevel,
			totalTimesPerformed: validated.totalTimesPerformed,
			status: "DRAFT",
		},
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

/**
 * Submit a clinical skill entry for faculty review.
 */
export async function submitClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
) {
	const userId = await requireAuth();
	const model = getModel(type);

	const existing = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!existing || existing.userId !== userId) {
		throw new Error("Entry not found or unauthorized");
	}

	await (model as typeof prisma.clinicalSkillAdult).update({
		where: { id },
		data: { status: "SUBMITTED" },
	});

	revalidatePath(REVALIDATE_PATH);
	return { success: true };
}

// ─── Faculty Sign / Reject ──────────────────────────────────

/**
 * Faculty: Sign a clinical skill entry.
 */
export async function signClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	remark?: string,
) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const model = getModel(type);

	const entry = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	const entityType =
		type === "adult" ? "ClinicalSkillAdult" : "ClinicalSkillPediatric";

	await prisma.$transaction([
		(model as typeof prisma.clinicalSkillAdult).update({
			where: { id },
			data: { status: "SIGNED" },
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: userId,
				entityType,
				entityId: id,
				remark,
			},
		}),
	]);

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

/**
 * Faculty: Reject a clinical skill entry with remark.
 */
export async function rejectClinicalSkill(
	type: "adult" | "pediatric",
	id: string,
	remark: string,
) {
	await requireRole(["faculty", "hod"]);
	const model = getModel(type);

	const entry = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});
	if (!entry) throw new Error("Entry not found");

	await (model as typeof prisma.clinicalSkillAdult).update({
		where: { id },
		data: { status: "NEEDS_REVISION" },
	});

	revalidatePath(REVALIDATE_PATH);
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}
