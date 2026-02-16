/**
 * @module Other Logs Actions
 * @description Server actions for H6 (TransportLog), H7 (ConsentLog), H8 (BadNewsLog).
 * Inline-editing pattern: rows are pre-initialized, edited inline, then submitted for review.
 * All three share identical field structure (patient-based with skill levels).
 *
 * @see PG Logbook .md — Sections: Transport, Consent, Breaking Bad News
 * @see prisma/schema.prisma — TransportLog, ConsentLog, BadNewsLog models
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAutoReviewEnabled } from "./auto-review";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
	const user = await prisma.user.findUnique({ where: { clerkId } });
	if (!user) throw new Error("User not found in database");
	return user;
}

function revalidateTransport() {
	revalidatePath("/dashboard/student/transport");
	revalidatePath("/dashboard/faculty/transport");
	revalidatePath("/dashboard/hod/transport");
}

function revalidateConsentBadNews() {
	revalidatePath("/dashboard/student/consent-bad-news");
	revalidatePath("/dashboard/faculty/consent-bad-news");
	revalidatePath("/dashboard/hod/consent-bad-news");
}

// ─── Shared Faculty List ──────────────────────────────────

export async function getAvailableOtherLogFaculty() {
	await requireAuth();

	return prisma.user.findMany({
		where: {
			role: { in: ["FACULTY" as never, "HOD" as never] },
			status: "ACTIVE" as never,
		},
		select: { id: true, firstName: true, lastName: true },
		orderBy: { firstName: "asc" },
	});
}

// ═══════════════════════════════════════════════════════════
//  H6: TRANSPORT LOG
// ═══════════════════════════════════════════════════════════

export async function addTransportLogRow() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.transportLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.transportLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateTransport();
	return entry;
}

export async function deleteTransportLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.transportLog.delete({ where: { id } });
	revalidateTransport();
	return { success: true };
}

export async function getMyTransportLogs() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.transportLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function updateTransportLog(
	id: string,
	data: {
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		procedureDescription?: string | null;
		performedAtLocation?: string | null;
		skillLevel?: string | null;
		totalProcedureTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.transportLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.transportLog.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			procedureDescription: data.procedureDescription,
			performedAtLocation: data.performedAtLocation,
			skillLevel: data.skillLevel as never,
			totalProcedureTally: data.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateTransport();
	return { success: true, data: entry };
}

export async function submitTransportLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.transportLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("transportLogs");

	if (autoReview) {
		await prisma.$transaction([
			prisma.transportLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "TransportLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.transportLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateTransport();
	return { success: true };
}

// Transport Review

export async function getTransportLogsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	let studentIds: string[] = [];

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
	}

	const where: Record<string, unknown> = {
		status: { not: "DRAFT" as never },
	};
	if (studentIds.length > 0) where.userId = { in: studentIds };

	return prisma.transportLog.findMany({
		where,
		orderBy: { createdAt: "desc" },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					currentSemester: true,
					batchRelation: { select: { name: true } },
				},
			},
		},
	});
}

export async function signTransportLog(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.transportLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "TransportLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateTransport();
	return { success: true };
}

export async function rejectTransportLog(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.transportLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.transportLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateTransport();
	return { success: true };
}

export async function bulkSignTransportLogs(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.transportLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.transportLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "TransportLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateTransport();
	return { success: true, signedCount: entries.length };
}

export async function getStudentTransportLogs(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.transportLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

// ═══════════════════════════════════════════════════════════
//  H7: CONSENT LOG
// ═══════════════════════════════════════════════════════════

export async function addConsentLogRow() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.consentLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.consentLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	return entry;
}

export async function deleteConsentLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.consentLog.delete({ where: { id } });
	revalidateConsentBadNews();
	return { success: true };
}

export async function getMyConsentLogs() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.consentLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function updateConsentLog(
	id: string,
	data: {
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		procedureDescription?: string | null;
		performedAtLocation?: string | null;
		skillLevel?: string | null;
		totalProcedureTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.consentLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.consentLog.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			procedureDescription: data.procedureDescription,
			performedAtLocation: data.performedAtLocation,
			skillLevel: data.skillLevel as never,
			totalProcedureTally: data.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateConsentBadNews();
	return { success: true, data: entry };
}

export async function submitConsentLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.consentLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("consentLogs");

	if (autoReview) {
		await prisma.$transaction([
			prisma.consentLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "ConsentLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.consentLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateConsentBadNews();
	return { success: true };
}

// Consent Review

export async function getConsentLogsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	let studentIds: string[] = [];

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
	}

	const where: Record<string, unknown> = {
		status: { not: "DRAFT" as never },
	};
	if (studentIds.length > 0) where.userId = { in: studentIds };

	return prisma.consentLog.findMany({
		where,
		orderBy: { createdAt: "desc" },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					currentSemester: true,
					batchRelation: { select: { name: true } },
				},
			},
		},
	});
}

export async function signConsentLog(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.consentLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "ConsentLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateConsentBadNews();
	return { success: true };
}

export async function rejectConsentLog(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.consentLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.consentLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateConsentBadNews();
	return { success: true };
}

export async function bulkSignConsentLogs(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.consentLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.consentLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "ConsentLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateConsentBadNews();
	return { success: true, signedCount: entries.length };
}

export async function getStudentConsentLogs(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.consentLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}

// ═══════════════════════════════════════════════════════════
//  H8: BAD NEWS LOG
// ═══════════════════════════════════════════════════════════

export async function addBadNewsLogRow() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const lastEntry = await prisma.badNewsLog.findFirst({
		where: { userId: user.id },
		orderBy: { slNo: "desc" },
		select: { slNo: true },
	});

	const entry = await prisma.badNewsLog.create({
		data: {
			userId: user.id,
			slNo: (lastEntry?.slNo ?? 0) + 1,
			status: "DRAFT" as never,
		},
	});

	revalidateConsentBadNews();
	return entry;
}

export async function deleteBadNewsLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.userId !== user.id) throw new Error("Not your entry");
	if (entry.status !== "DRAFT")
		throw new Error("Can only delete DRAFT entries");

	await prisma.badNewsLog.delete({ where: { id } });
	revalidateConsentBadNews();
	return { success: true };
}

export async function getMyBadNewsLogs() {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	return prisma.badNewsLog.findMany({
		where: { userId: user.id },
		orderBy: { slNo: "asc" },
	});
}

export async function updateBadNewsLog(
	id: string,
	data: {
		date?: string | null;
		patientName?: string | null;
		patientAge?: number | null;
		patientSex?: string | null;
		uhid?: string | null;
		completeDiagnosis?: string | null;
		procedureDescription?: string | null;
		performedAtLocation?: string | null;
		skillLevel?: string | null;
		totalProcedureTally?: number;
		facultyId?: string | null;
	},
) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Cannot edit a signed entry");
	}

	const entry = await prisma.badNewsLog.update({
		where: { id },
		data: {
			date: data.date ? new Date(data.date) : null,
			patientName: data.patientName,
			patientAge: data.patientAge,
			patientSex: data.patientSex,
			uhid: data.uhid,
			completeDiagnosis: data.completeDiagnosis,
			procedureDescription: data.procedureDescription,
			performedAtLocation: data.performedAtLocation,
			skillLevel: data.skillLevel as never,
			totalProcedureTally: data.totalProcedureTally,
			facultyId: data.facultyId,
			status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
		},
	});

	revalidateConsentBadNews();
	return { success: true, data: entry };
}

export async function submitBadNewsLog(id: string) {
	const clerkId = await requireAuth();
	const user = await resolveUser(clerkId);

	const existing = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!existing || existing.userId !== user.id) {
		throw new Error("Entry not found or unauthorized");
	}
	if (existing.status === "SIGNED") {
		throw new Error("Entry is already signed");
	}

	const autoReview = await isAutoReviewEnabled("badNewsLogs");

	if (autoReview) {
		await prisma.$transaction([
			prisma.badNewsLog.update({
				where: { id },
				data: { status: "SIGNED" },
			}),
			prisma.digitalSignature.create({
				data: {
					signedById: "auto-review",
					entityType: "BadNewsLog",
					entityId: id,
					remark: "Auto-reviewed by system",
				},
			}),
		]);
	} else {
		await prisma.badNewsLog.update({
			where: { id },
			data: { status: "SUBMITTED" },
		});
	}

	revalidateConsentBadNews();
	return { success: true };
}

// Bad News Review

export async function getBadNewsLogsForReview() {
	const { userId, role } = await requireRole(["faculty", "hod"]);
	const user = await prisma.user.findUnique({ where: { clerkId: userId } });
	if (!user) return [];

	let studentIds: string[] = [];

	if (role === "faculty") {
		const batchAssignments = await prisma.facultyBatchAssignment.findMany({
			where: { facultyId: user.id },
			select: { batchId: true },
		});
		const batchIds = batchAssignments.map((b) => b.batchId);
		if (batchIds.length === 0) return [];

		const students = await prisma.user.findMany({
			where: { batchId: { in: batchIds }, role: "STUDENT" as never },
			select: { id: true },
		});
		studentIds = students.map((s) => s.id);
		if (studentIds.length === 0) return [];
	}

	const where: Record<string, unknown> = {
		status: { not: "DRAFT" as never },
	};
	if (studentIds.length > 0) where.userId = { in: studentIds };

	return prisma.badNewsLog.findMany({
		where,
		orderBy: { createdAt: "desc" },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					currentSemester: true,
					batchRelation: { select: { name: true } },
				},
			},
		},
	});
}

export async function signBadNewsLog(id: string, remark?: string) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");
	if (entry.status !== "SUBMITTED") {
		throw new Error("Entry must be submitted before signing");
	}

	await prisma.$transaction([
		prisma.badNewsLog.update({
			where: { id },
			data: {
				status: "SIGNED",
				facultyRemark: remark || entry.facultyRemark,
			},
		}),
		prisma.digitalSignature.create({
			data: {
				signedById: user.id,
				entityType: "BadNewsLog",
				entityId: id,
				remark,
			},
		}),
	]);

	revalidateConsentBadNews();
	return { success: true };
}

export async function rejectBadNewsLog(id: string, remark: string) {
	await requireRole(["faculty", "hod"]);

	const entry = await prisma.badNewsLog.findUnique({ where: { id } });
	if (!entry) throw new Error("Entry not found");

	await prisma.badNewsLog.update({
		where: { id },
		data: {
			status: "NEEDS_REVISION",
			facultyRemark: remark,
		},
	});

	revalidateConsentBadNews();
	return { success: true };
}

export async function bulkSignBadNewsLogs(ids: string[]) {
	const { userId } = await requireRole(["faculty", "hod"]);
	const user = await resolveUser(userId);

	const entries = await prisma.badNewsLog.findMany({
		where: { id: { in: ids }, status: "SUBMITTED" as never },
	});
	if (entries.length === 0) throw new Error("No valid entries to sign");

	await prisma.$transaction([
		prisma.badNewsLog.updateMany({
			where: { id: { in: entries.map((e) => e.id) } },
			data: { status: "SIGNED" },
		}),
		...entries.map((entry) =>
			prisma.digitalSignature.create({
				data: {
					signedById: user.id,
					entityType: "BadNewsLog",
					entityId: entry.id,
				},
			}),
		),
	]);

	revalidateConsentBadNews();
	return { success: true, signedCount: entries.length };
}

export async function getStudentBadNewsLogs(studentId: string) {
	await requireRole(["faculty", "hod"]);
	return prisma.badNewsLog.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
