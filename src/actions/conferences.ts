/**
 * @module Conferences Actions
 * @description Server actions for Conference and Other Academic Activity Participation.
 * Inline-editing pattern: rows are added via +Row, edited inline, then submitted.
 *
 * @see PG Logbook .md — "CONFERENCE AND OTHER ACADEMIC ACTIVITY PARTICIPATION"
 * @see prisma/schema.prisma — ConferenceParticipation model
 */

"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { recordSubmission, recordReview } from "@/lib/entry-revisions";
import { sendNotificationToUser } from "@/lib/notifications";
import { buildSnapshot } from "@/lib/entry-revisions";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found in database");
  return user;
}

function revalidateAll() {
  revalidatePath("/dashboard/student/conferences");
  revalidatePath("/dashboard/faculty/conferences");
  revalidatePath("/dashboard/hod/conferences");
}

// ─── Add Row ────────────────────────────────────────────────

export async function addConferenceRow() {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  const lastEntry = await prisma.conferenceParticipation.findFirst({
    where: { userId: user.id },
    orderBy: { slNo: "desc" },
    select: { slNo: true },
  });

  const newSlNo = (lastEntry?.slNo ?? 0) + 1;

  const entry = await prisma.conferenceParticipation.create({
    data: {
      userId: user.id,
      slNo: newSlNo,
      status: "DRAFT" as never,
    },
  });

  revalidateAll();
  return entry;
}

export async function deleteConferenceEntry(id: string) {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  const entry = await prisma.conferenceParticipation.findUnique({
    where: { id },
  });
  if (!entry) throw new Error("Entry not found");
  if (entry.userId !== user.id) throw new Error("Not your entry");
  if (entry.status !== "DRAFT")
    throw new Error("Can only delete DRAFT entries");

  await prisma.conferenceParticipation.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyConferences() {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  return prisma.conferenceParticipation.findMany({
    where: { userId: user.id },
    orderBy: { slNo: "asc" },
  });
}

export async function getMyConferenceSummary() {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  const [total, signed, submitted, needsRevision] = await Promise.all([
    prisma.conferenceParticipation.count({
      where: {
        userId: user.id,
        OR: [
          { conferenceName: { not: null } },
          {
            status: {
              in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[],
            },
          },
        ],
      },
    }),
    prisma.conferenceParticipation.count({
      where: { userId: user.id, status: "SIGNED" },
    }),
    prisma.conferenceParticipation.count({
      where: {
        userId: user.id,
        status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
      },
    }),
    prisma.conferenceParticipation.count({
      where: { userId: user.id, status: "NEEDS_REVISION" },
    }),
  ]);

  return { total, signed, submitted, needsRevision };
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableConferenceFaculty() {
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

// ─── Update (Inline Edit) ──────────────────────────────────

export async function updateConferenceEntry(
  id: string,
  data: {
    date?: string | null;
    conferenceName?: string | null;
    conductedAt?: string | null;
    participationRole?: string | null;
    facultyId?: string | null;
  },
) {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  const existing = await prisma.conferenceParticipation.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== user.id) {
    throw new Error("Entry not found or unauthorized");
  }
  if (existing.status === "SIGNED") {
    throw new Error("Cannot edit a signed entry");
  }

  const entry = await prisma.conferenceParticipation.update({
    where: { id },
    data: {
      date: data.date ? new Date(data.date) : null,
      conferenceName: data.conferenceName,
      conductedAt: data.conductedAt,
      participationRole: data.participationRole,
      facultyId: data.facultyId,
      status: existing.status === "NEEDS_REVISION" ? "DRAFT" : existing.status,
    },
  });

  revalidateAll();
  return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitConferenceEntry(id: string) {
  const clerkId = await requireAuth();
  const user = await resolveUser(clerkId);

  const existing = await prisma.conferenceParticipation.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== user.id) {
    throw new Error("Entry not found or unauthorized");
  }
  if (existing.status === "SIGNED") {
    throw new Error("Entry is already signed");
  }

  const autoReview = await isAutoReviewEnabled("conferences");

  if (autoReview) {
    await prisma.$transaction(async (tx) => {
      await tx.conferenceParticipation.update({
        where: { id },
        data: { status: "SIGNED" },
      });
      await recordSubmission(tx, {
        entityType: "ConferenceParticipation",
        entityId: id,
        ownerId: existing.userId,
        snapshot: buildSnapshot(existing),
        attachments: [],
      });
      await tx.digitalSignature.create({
        data: {
          signedById: "auto-review",
          entityType: "ConferenceParticipation",
          entityId: id,
          remark: "Auto-reviewed by system",
        },
      });
      await recordReview(tx, {
        entityType: "ConferenceParticipation",
        entityId: id,
        ownerId: existing.userId,
        reviewerId: "auto-review",
        reviewerRole: "hod",
        decision: "SIGNED",
        remark: "Auto-reviewed by system",
      });
    });
    await sendNotificationToUser(user.id, {
      title: "Conference Participation",
      body: `Your conference entry${existing.conferenceName ? ` for "${existing.conferenceName}"` : ""} has been auto-reviewed and signed.`,
      type: "entry_signed",
      entityType: "ConferenceParticipation",
      entityId: id,
      href: "/dashboard/student/conferences",
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.conferenceParticipation.update({
        where: { id },
        data: { status: "SUBMITTED" },
      });
      await recordSubmission(tx, {
        entityType: "ConferenceParticipation",
        entityId: id,
        ownerId: user.id,
        snapshot: buildSnapshot(existing),
        attachments: [],
      });
    });
    await sendNotificationToUser(user.id, {
      title: "Conference Participation",
      body: `Your conference entry${existing.conferenceName ? ` for "${existing.conferenceName}"` : ""} has been submitted for review.`,
      type: "entry_submitted",
      entityType: "ConferenceParticipation",
      entityId: id,
      href: "/dashboard/student/conferences",
    });
  }

  revalidateAll();
  emitRealtimeEvent("entry:updated");
  return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getConferencesForReview() {
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

  const conferences = await prisma.conferenceParticipation.findMany({
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

  // Fetch signatures separately
  const conferenceIds = conferences.map((c) => c.id);
  const signatures = await prisma.digitalSignature.findMany({
    where: {
      entityType: "ConferenceParticipation",
      entityId: { in: conferenceIds },
    },
    include: {
      signedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Map signatures to conferences
  const signaturesMap = new Map<string, typeof signatures>();
  signatures.forEach((sig) => {
    if (!signaturesMap.has(sig.entityId)) {
      signaturesMap.set(sig.entityId, []);
    }
    signaturesMap.get(sig.entityId)!.push(sig);
  });

  return conferences.map((conference) => ({
    ...conference,
    signatures: signaturesMap.get(conference.id) || [],
  }));
}

export async function signConferenceEntry(id: string, remark?: string) {
  const { userId } = await requireRole(["faculty", "hod"]);
  const user = await resolveUser(userId);

  const entry = await prisma.conferenceParticipation.findUnique({
    where: { id },
  });
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "SUBMITTED") {
    throw new Error("Entry must be submitted before signing");
  }

  await prisma.$transaction(async (tx) => {
    await tx.conferenceParticipation.update({
      where: { id },
      data: {
        status: "SIGNED",
        ...(remark ? { facultyRemark: remark } : {}),
      },
    });
    await tx.digitalSignature.create({
      data: {
        signedById: user.id,
        entityType: "ConferenceParticipation",
        entityId: id,
        remark,
      },
    });
    await recordReview(tx, {
      entityType: "ConferenceParticipation",
      entityId: id,
      ownerId: entry.userId,
      reviewerId: user.id,
      reviewerRole: "faculty",
      decision: "SIGNED",
      remark,
    });
  });

  await sendNotificationToUser(entry.userId, {
    title: "Conference Participation",
    body: `Your conference entry${entry.conferenceName ? ` for "${entry.conferenceName}"` : ""} has been signed off.`,
    type: "entry_signed",
    entityType: "ConferenceParticipation",
    entityId: id,
    href: "/dashboard/student/conferences",
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated");
  return { success: true };
}

export async function rejectConferenceEntry(id: string, remark: string) {
  await requireRole(["faculty", "hod"]);
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const entry = await prisma.conferenceParticipation.findUnique({
    where: { id },
  });
  if (!entry) throw new Error("Entry not found");

  await prisma.$transaction(async (tx) => {
    await tx.conferenceParticipation.update({
      where: { id },
      data: {
        status: "NEEDS_REVISION",
        facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
      },
    });
    await recordReview(tx, {
      entityType: "ConferenceParticipation",
      entityId: id,
      ownerId: entry.userId,
      reviewerId: user.id,
      reviewerRole: "faculty",
      decision: "NEEDS_REVISION",
      remark: `[${user.firstName} ${user.lastName}] ${remark}`,
    });
  });

  await sendNotificationToUser(entry.userId, {
    title: "Conference Participation",
    body: `Your conference entry${entry.conferenceName ? ` for "${entry.conferenceName}"` : ""} needs revision: ${remark}`,
    type: "entry_needs_revision",
    entityType: "ConferenceParticipation",
    entityId: id,
    href: "/dashboard/student/conferences",
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated");
  return { success: true };
}

export async function bulkSignConferenceEntries(ids: string[]) {
  const { userId } = await requireRole(["faculty", "hod"]);
  const user = await resolveUser(userId);

  const entries = await prisma.conferenceParticipation.findMany({
    where: { id: { in: ids }, status: "SUBMITTED" as never },
  });

  if (entries.length === 0) throw new Error("No valid entries to sign");

  await prisma.$transaction(async (tx) => {
    await tx.conferenceParticipation.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { status: "SIGNED" },
    });
    for (const entry of entries) {
      await tx.digitalSignature.create({
        data: {
          signedById: user.id,
          entityType: "ConferenceParticipation",
          entityId: entry.id,
        },
      });
      await recordReview(tx, {
        entityType: "ConferenceParticipation",
        entityId: entry.id,
        ownerId: entry.userId,
        reviewerId: user.id,
        reviewerRole: "faculty",
        decision: "SIGNED",
        remark: "Bulk signed",
      });
      await sendNotificationToUser(entry.userId, {
        title: "Conference Participation",
        body: `Your conference entry${entry.conferenceName ? ` for "${entry.conferenceName}"` : ""} has been bulk signed.`,
        type: "entry_signed",
        entityType: "ConferenceParticipation",
        entityId: entry.id,
        href: "/dashboard/student/conferences",
      });
    }
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated");
  return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentConferences(studentId: string) {
  await requireRole(["faculty", "hod"]);

	return prisma.conferenceParticipation.findMany({
		where: { userId: studentId },
		orderBy: { slNo: "asc" },
	});
}
