/**
 * @module Courses & Conferences Actions
 * @description Server actions for H1 (CourseAttended), H2 (ConferenceParticipation),
 *              H3 (ResearchActivity).
 *
 * @see PG Logbook .md — Sections: Courses, Conferences, Research
 * @see prisma/schema.prisma — CourseAttended, ConferenceParticipation, ResearchActivity
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	courseAttendedSchema,
	type CourseAttendedInput,
	conferenceParticipationSchema,
	type ConferenceParticipationInput,
	researchActivitySchema,
	type ResearchActivityInput,
} from "@/lib/validators/professional";
import { revalidatePath } from "next/cache";

function revalidateCourses() {
	revalidatePath("/dashboard/student/courses-conferences");
}

function revalidateResearch() {
	revalidatePath("/dashboard/student/research");
}

// ═══════════════ H1: COURSES ═══════════════

export async function createCourseAttended(data: CourseAttendedInput) {
	const userId = await requireAuth();
	const validated = courseAttendedSchema.parse(data);

	const last = await prisma.courseAttended.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.courseAttended.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			courseName: validated.courseName,
			conductedAt: validated.conductedAt ?? null,
			confidenceLevel: validated.confidenceLevel ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateCourses();
	return { success: true, entry };
}

export async function updateCourseAttended(
	id: string,
	data: Partial<CourseAttendedInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.courseAttended.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.courseAttended.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.courseName !== undefined && { courseName: data.courseName }),
			...(data.conductedAt !== undefined && { conductedAt: data.conductedAt }),
			...(data.confidenceLevel !== undefined && {
				confidenceLevel: data.confidenceLevel,
			}),
		},
	});

	revalidateCourses();
	return { success: true, entry: updated };
}

export async function submitCourseAttended(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.courseAttended.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.courseAttended.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteCourseAttended(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.courseAttended.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.courseAttended.delete({ where: { id } });
	revalidateCourses();
	return { success: true };
}

export async function getMyCourseAttended() {
	const userId = await requireAuth();
	return prisma.courseAttended.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyCourseAttendedEntry(id: string) {
	const userId = await requireAuth();
	return prisma.courseAttended.findFirst({ where: { id, userId } });
}

export async function signCourseAttended(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.courseAttended.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.courseAttended.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectCourseAttended(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.courseAttended.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.courseAttended.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

// ═══════════════ H2: CONFERENCES ═══════════════

export async function createConferenceParticipation(
	data: ConferenceParticipationInput,
) {
	const userId = await requireAuth();
	const validated = conferenceParticipationSchema.parse(data);

	const last = await prisma.conferenceParticipation.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.conferenceParticipation.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			conferenceName: validated.conferenceName,
			conductedAt: validated.conductedAt ?? null,
			participationRole: validated.participationRole ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateCourses();
	return { success: true, entry };
}

export async function updateConferenceParticipation(
	id: string,
	data: Partial<ConferenceParticipationInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.conferenceParticipation.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.conferenceParticipation.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.conferenceName !== undefined && {
				conferenceName: data.conferenceName,
			}),
			...(data.conductedAt !== undefined && { conductedAt: data.conductedAt }),
			...(data.participationRole !== undefined && {
				participationRole: data.participationRole,
			}),
		},
	});

	revalidateCourses();
	return { success: true, entry: updated };
}

export async function submitConferenceParticipation(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.conferenceParticipation.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.conferenceParticipation.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteConferenceParticipation(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.conferenceParticipation.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.conferenceParticipation.delete({ where: { id } });
	revalidateCourses();
	return { success: true };
}

export async function getMyConferenceParticipation() {
	const userId = await requireAuth();
	return prisma.conferenceParticipation.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyConferenceParticipationEntry(id: string) {
	const userId = await requireAuth();
	return prisma.conferenceParticipation.findFirst({ where: { id, userId } });
}

export async function signConferenceParticipation(
	id: string,
	_remark?: string,
) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.conferenceParticipation.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.conferenceParticipation.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectConferenceParticipation(
	id: string,
	_remark: string,
) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.conferenceParticipation.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.conferenceParticipation.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateCourses();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

// ═══════════════ H3: RESEARCH ACTIVITIES ═══════════════

export async function createResearchActivity(data: ResearchActivityInput) {
	const userId = await requireAuth();
	const validated = researchActivitySchema.parse(data);

	const last = await prisma.researchActivity.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.researchActivity.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			activity: validated.activity,
			conductedAt: validated.conductedAt ?? null,
			participationRole: validated.participationRole ?? null,
			status: "DRAFT" as never,
		},
	});

	revalidateResearch();
	return { success: true, entry };
}

export async function updateResearchActivity(
	id: string,
	data: Partial<ResearchActivityInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.researchActivity.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.researchActivity.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.activity !== undefined && { activity: data.activity }),
			...(data.conductedAt !== undefined && { conductedAt: data.conductedAt }),
			...(data.participationRole !== undefined && {
				participationRole: data.participationRole,
			}),
		},
	});

	revalidateResearch();
	return { success: true, entry: updated };
}

export async function submitResearchActivity(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.researchActivity.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.researchActivity.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateResearch();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteResearchActivity(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.researchActivity.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.researchActivity.delete({ where: { id } });
	revalidateResearch();
	return { success: true };
}

export async function getMyResearchActivities() {
	const userId = await requireAuth();
	return prisma.researchActivity.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyResearchActivityEntry(id: string) {
	const userId = await requireAuth();
	return prisma.researchActivity.findFirst({ where: { id, userId } });
}

export async function signResearchActivity(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.researchActivity.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.researchActivity.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateResearch();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectResearchActivity(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.researchActivity.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.researchActivity.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateResearch();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}
