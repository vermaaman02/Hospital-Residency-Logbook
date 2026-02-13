/**
 * @module Other Logs Actions
 * @description Server actions for H6 (TransportLog), H7 (ConsentLog), H8 (BadNewsLog).
 * All three share identical field structure (patient-based with skill levels).
 *
 * @see PG Logbook .md — Sections: Transport, Consent, Breaking Bad News
 * @see prisma/schema.prisma — TransportLog, ConsentLog, BadNewsLog models
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	transportLogSchema,
	type TransportLogInput,
	consentLogSchema,
	type ConsentLogInput,
	badNewsLogSchema,
	type BadNewsLogInput,
} from "@/lib/validators/other-logs";
import { revalidatePath } from "next/cache";

function revalidateTransport() {
	revalidatePath("/dashboard/student/transport");
}

function revalidateConsentBadNews() {
	revalidatePath("/dashboard/student/consent-bad-news");
}

// ═══════════════ H6: TRANSPORT LOG ═══════════════

export async function createTransportLog(data: TransportLogInput) {
	const userId = await requireAuth();
	const validated = transportLogSchema.parse(data);

	const last = await prisma.transportLog.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.transportLog.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription ?? null,
			performedAtLocation: validated.performedAtLocation ?? null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT" as never,
		},
	});

	revalidateTransport();
	return { success: true, entry };
}

export async function updateTransportLog(
	id: string,
	data: Partial<TransportLogInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.transportLog.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.transportLog.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.patientInfo !== undefined && { patientInfo: data.patientInfo }),
			...(data.completeDiagnosis !== undefined && {
				completeDiagnosis: data.completeDiagnosis,
			}),
			...(data.procedureDescription !== undefined && {
				procedureDescription: data.procedureDescription,
			}),
			...(data.performedAtLocation !== undefined && {
				performedAtLocation: data.performedAtLocation,
			}),
			...(data.skillLevel !== undefined && {
				skillLevel: data.skillLevel as never,
			}),
		},
	});

	revalidateTransport();
	return { success: true, entry: updated };
}

export async function submitTransportLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.transportLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.transportLog.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateTransport();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteTransportLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.transportLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.transportLog.delete({ where: { id } });
	revalidateTransport();
	return { success: true };
}

export async function getMyTransportLogs() {
	const userId = await requireAuth();
	return prisma.transportLog.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyTransportLogEntry(id: string) {
	const userId = await requireAuth();
	return prisma.transportLog.findFirst({ where: { id, userId } });
}

export async function signTransportLog(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.transportLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.transportLog.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateTransport();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectTransportLog(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.transportLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.transportLog.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateTransport();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

// ═══════════════ H7: CONSENT LOG ═══════════════

export async function createConsentLog(data: ConsentLogInput) {
	const userId = await requireAuth();
	const validated = consentLogSchema.parse(data);

	const last = await prisma.consentLog.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.consentLog.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription ?? null,
			performedAtLocation: validated.performedAtLocation ?? null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	return { success: true, entry };
}

export async function updateConsentLog(
	id: string,
	data: Partial<ConsentLogInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.consentLog.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.consentLog.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.patientInfo !== undefined && { patientInfo: data.patientInfo }),
			...(data.completeDiagnosis !== undefined && {
				completeDiagnosis: data.completeDiagnosis,
			}),
			...(data.procedureDescription !== undefined && {
				procedureDescription: data.procedureDescription,
			}),
			...(data.performedAtLocation !== undefined && {
				performedAtLocation: data.performedAtLocation,
			}),
			...(data.skillLevel !== undefined && {
				skillLevel: data.skillLevel as never,
			}),
		},
	});

	revalidateConsentBadNews();
	return { success: true, entry: updated };
}

export async function submitConsentLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.consentLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.consentLog.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteConsentLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.consentLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.consentLog.delete({ where: { id } });
	revalidateConsentBadNews();
	return { success: true };
}

export async function getMyConsentLogs() {
	const userId = await requireAuth();
	return prisma.consentLog.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyConsentLogEntry(id: string) {
	const userId = await requireAuth();
	return prisma.consentLog.findFirst({ where: { id, userId } });
}

export async function signConsentLog(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.consentLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.consentLog.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectConsentLog(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.consentLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.consentLog.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

// ═══════════════ H8: BAD NEWS LOG ═══════════════

export async function createBadNewsLog(data: BadNewsLogInput) {
	const userId = await requireAuth();
	const validated = badNewsLogSchema.parse(data);

	const last = await prisma.badNewsLog.findFirst({
		where: { userId },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.badNewsLog.create({
		data: {
			userId,
			slNo: (last?.slNo ?? 0) + 1,
			date: validated.date,
			patientInfo: validated.patientInfo,
			completeDiagnosis: validated.completeDiagnosis,
			procedureDescription: validated.procedureDescription ?? null,
			performedAtLocation: validated.performedAtLocation ?? null,
			skillLevel: validated.skillLevel as never,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	return { success: true, entry };
}

export async function updateBadNewsLog(
	id: string,
	data: Partial<BadNewsLogInput>,
) {
	const userId = await requireAuth();
	const entry = await prisma.badNewsLog.findFirst({
		where: { id, userId },
	});
	if (!entry) throw new Error("Entry not found");
	if (entry.status === "SIGNED")
		throw new Error("Signed entries cannot be edited");

	const updated = await prisma.badNewsLog.update({
		where: { id },
		data: {
			...(data.date && { date: new Date(data.date) }),
			...(data.patientInfo !== undefined && { patientInfo: data.patientInfo }),
			...(data.completeDiagnosis !== undefined && {
				completeDiagnosis: data.completeDiagnosis,
			}),
			...(data.procedureDescription !== undefined && {
				procedureDescription: data.procedureDescription,
			}),
			...(data.performedAtLocation !== undefined && {
				performedAtLocation: data.performedAtLocation,
			}),
			...(data.skillLevel !== undefined && {
				skillLevel: data.skillLevel as never,
			}),
		},
	});

	revalidateConsentBadNews();
	return { success: true, entry: updated };
}

export async function submitBadNewsLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.badNewsLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or not in draft");

	await prisma.badNewsLog.update({
		where: { id },
		data: { status: "SUBMITTED" as never },
	});

	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true };
}

export async function deleteBadNewsLog(id: string) {
	const userId = await requireAuth();
	const entry = await prisma.badNewsLog.findFirst({
		where: { id, userId, status: { in: ["DRAFT", "NEEDS_REVISION"] as never } },
	});
	if (!entry) throw new Error("Entry not found or cannot be deleted");

	await prisma.badNewsLog.delete({ where: { id } });
	revalidateConsentBadNews();
	return { success: true };
}

export async function getMyBadNewsLogs() {
	const userId = await requireAuth();
	return prisma.badNewsLog.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});
}

export async function getMyBadNewsLogEntry(id: string) {
	const userId = await requireAuth();
	return prisma.badNewsLog.findFirst({ where: { id, userId } });
}

export async function signBadNewsLog(id: string, _remark?: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.badNewsLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.badNewsLog.update({
		where: { id },
		data: { status: "SIGNED" as never },
	});
	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}

export async function rejectBadNewsLog(id: string, _remark: string) {
	await requireRole(["faculty", "hod"]);
	const entry = await prisma.badNewsLog.findFirst({
		where: { id, status: "SUBMITTED" as never },
	});
	if (!entry) throw new Error("Entry not found or not submitted");

	const updated = await prisma.badNewsLog.update({
		where: { id },
		data: { status: "NEEDS_REVISION" as never },
	});
	revalidateConsentBadNews();
	revalidatePath("/dashboard/faculty/reviews");
	return { success: true, entry: updated };
}
