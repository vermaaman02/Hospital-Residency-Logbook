/**
 * @module Auto Review Settings Actions
 * @description Server actions for HOD auto-review toggle.
 * When enabled for a category, new submissions are automatically signed.
 *
 * @see prisma/schema.prisma — HodAutoReviewSetting model
 */

"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type AutoReviewCategory =
	| "rotationPostings"
	| "thesis"
	| "trainingMentoring"
	| "casePresentations"
	| "seminarDiscussions"
	| "journalClubs"
	| "clinicalSkills"
	| "caseManagement"
	| "procedureLogs"
	| "imagingLogs"
	| "transportLogs"
	| "consentLogs"
	| "badNewsLogs"
	| "lifeSupportCourses"
	| "conferences"
	| "researchActivities";

export interface AutoReviewSettings {
	rotationPostings: boolean;
	thesis: boolean;
	trainingMentoring: boolean;
	casePresentations: boolean;
	seminarDiscussions: boolean;
	journalClubs: boolean;
	clinicalSkills: boolean;
	caseManagement: boolean;
	procedureLogs: boolean;
	imagingLogs: boolean;
	transportLogs: boolean;
	consentLogs: boolean;
	badNewsLogs: boolean;
	lifeSupportCourses: boolean;
	conferences: boolean;
	researchActivities: boolean;
}

/**
 * Get current auto-review settings. Accessible by faculty/HOD.
 */
export async function getAutoReviewSettings(): Promise<AutoReviewSettings> {
	await requireRole(["faculty", "hod"]);

	const settings = await prisma.hodAutoReviewSetting.findMany();
	const map: Record<string, boolean> = {};
	for (const s of settings) {
		map[s.category] = s.enabled;
	}

	return {
		rotationPostings: map["rotationPostings"] ?? false,
		thesis: map["thesis"] ?? false,
		trainingMentoring: map["trainingMentoring"] ?? false,
		casePresentations: map["casePresentations"] ?? false,
		seminarDiscussions: map["seminarDiscussions"] ?? false,
		journalClubs: map["journalClubs"] ?? false,
		clinicalSkills: map["clinicalSkills"] ?? false,
		caseManagement: map["caseManagement"] ?? false,
		procedureLogs: map["procedureLogs"] ?? false,
		imagingLogs: map["imagingLogs"] ?? false,
		transportLogs: map["transportLogs"] ?? false,
		consentLogs: map["consentLogs"] ?? false,
		badNewsLogs: map["badNewsLogs"] ?? false,
		lifeSupportCourses: map["lifeSupportCourses"] ?? false,
		conferences: map["conferences"] ?? false,
		researchActivities: map["researchActivities"] ?? false,
	};
}

/**
 * HOD: Toggle auto-review for a category.
 */
export async function toggleAutoReview(
	category: AutoReviewCategory,
	enabled: boolean,
) {
	const { userId } = await requireRole(["hod"]);

	await prisma.hodAutoReviewSetting.upsert({
		where: { category },
		create: {
			category,
			enabled,
			updatedById: userId,
		},
		update: {
			enabled,
			updatedById: userId,
		},
	});

	revalidatePath("/dashboard/hod/rotation-postings");
	revalidatePath("/dashboard/hod/case-presentations");
	revalidatePath("/dashboard/faculty/case-presentations");
	revalidatePath("/dashboard/faculty/reviews");
	revalidatePath("/dashboard/faculty/clinical-skills");
	revalidatePath("/dashboard/hod/clinical-skills");
	revalidatePath("/dashboard/faculty/case-management");
	revalidatePath("/dashboard/hod/case-management");
	revalidatePath("/dashboard/faculty/procedures");
	revalidatePath("/dashboard/hod/procedures");
	revalidatePath("/dashboard/faculty/imaging");
	revalidatePath("/dashboard/hod/imaging");
	revalidatePath("/dashboard/faculty/transport");
	revalidatePath("/dashboard/hod/transport");
	revalidatePath("/dashboard/faculty/consent-bad-news");
	revalidatePath("/dashboard/hod/consent-bad-news");
	revalidatePath("/dashboard/faculty/life-support-courses");
	revalidatePath("/dashboard/hod/life-support-courses");
	revalidatePath("/dashboard/faculty/conferences");
	revalidatePath("/dashboard/hod/conferences");
	revalidatePath("/dashboard/faculty/research-activities");
	revalidatePath("/dashboard/hod/research-activities");
	return { success: true, category, enabled };
}

/**
 * Check if auto-review is enabled for a category.
 * Used internally by submission actions to auto-sign.
 */
export async function isAutoReviewEnabled(
	category: AutoReviewCategory,
): Promise<boolean> {
	const setting = await prisma.hodAutoReviewSetting.findUnique({
		where: { category },
	});
	return setting?.enabled ?? false;
}
