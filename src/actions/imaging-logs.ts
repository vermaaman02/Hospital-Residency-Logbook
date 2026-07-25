/**
 * @module Imaging Log Actions
 * @description Server actions for all 5 imaging log categories.
 * Inline-editing pattern: rows are pre-initialized per category,
 * edited inline, then submitted for faculty review.
 * All categories use S/O/A/PS/PI skill levels.
 *
 * @see PG Logbook .md — "IMAGING LOGS" sections
 * @see prisma/schema.prisma — ImagingLog model
 */

"use server";

import { requireAuthHybrid, requireRoleHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitRealtimeEvent } from "@/lib/realtime-emit";
import { isAutoReviewEnabled } from "./auto-review";
import { IMAGING_CATEGORIES } from "@/lib/constants/imaging-categories";
import { recordSubmission, recordReview, buildSnapshot } from "@/lib/entry-revisions";
import { sendRealtimeNotification } from "@/lib/notifications";

// ─── Helpers ────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found in database");
  return user;
}

function revalidateAll() {
  revalidatePath("/dashboard/student/imaging");
  revalidatePath("/dashboard/faculty/imaging");
  revalidatePath("/dashboard/hod/imaging");
}

// ─── Initialize Category ────────────────────────────────────

export async function initializeImagingLogCategory(imagingCategory: string) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const existingCount = await prisma.imagingLog.count({
    where: { userId: user.id, imagingCategory: imagingCategory as never },
  });

  if (existingCount > 0) return { initialized: false };

  const catConfig = IMAGING_CATEGORIES.find((c) => c.enumValue === imagingCategory);
  const targetCount = Math.min(10, catConfig?.maxEntries || 10);

  await prisma.imagingLog.createMany({
    data: Array.from({ length: targetCount }).map((_, idx) => ({
      userId: user.id,
      imagingCategory: imagingCategory as never,
      slNo: idx + 1,
      status: "DRAFT" as never,
    })),
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging", category: imagingCategory });
  return { initialized: true };
}

// ─── Add Row ────────────────────────────────────────────────

export async function addImagingLogRow(imagingCategory: string) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const catConfig = IMAGING_CATEGORIES.find((c) => c.enumValue === imagingCategory);
  const maxEntries = catConfig?.maxEntries || 50;

  const existingEntries = await prisma.imagingLog.findMany({
    where: { userId: user.id, imagingCategory: imagingCategory as never },
    select: { slNo: true },
    orderBy: { slNo: "desc" },
  });

  if (existingEntries.length >= maxEntries) {
    throw new Error(
      `All ${maxEntries} entry rows for ${catConfig?.label || imagingCategory} have already been added to your logbook.`
    );
  }

  const maxSlNo = existingEntries.reduce((max, e) => Math.max(max, e.slNo), 0);

  const entry = await prisma.imagingLog.create({
    data: {
      userId: user.id,
      imagingCategory: imagingCategory as never,
      slNo: maxSlNo + 1,
      status: "DRAFT" as never,
    },
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging", category: imagingCategory });
  return entry;
}

export async function deleteImagingLogEntry(id: string) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const entry = await prisma.imagingLog.findUnique({ where: { id } });
  if (!entry) throw new Error("Entry not found");
  if (entry.userId !== user.id) throw new Error("Not your entry");
  if (entry.status !== "DRAFT")
    throw new Error("Can only delete DRAFT entries");

  await prisma.imagingLog.delete({ where: { id } });
  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true };
}

// ─── Read (Student) ─────────────────────────────────────────

export async function getMyImagingLogEntries(imagingCategory: string) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  let entries = await prisma.imagingLog.findMany({
    where: { userId: user.id, imagingCategory: imagingCategory as never },
    orderBy: { slNo: "asc" },
  });

  // Auto-seed initial rows if category has 0 entries
  if (entries.length === 0) {
    const catConfig = IMAGING_CATEGORIES.find((c) => c.enumValue === imagingCategory);
    const initialCount = Math.min(10, catConfig?.maxEntries || 10);
    if (initialCount > 0) {
      await prisma.imagingLog.createMany({
        data: Array.from({ length: initialCount }).map((_, idx) => ({
          userId: user.id,
          imagingCategory: imagingCategory as never,
          slNo: idx + 1,
          status: "DRAFT" as never,
        })),
      });

      entries = await prisma.imagingLog.findMany({
        where: { userId: user.id, imagingCategory: imagingCategory as never },
        orderBy: { slNo: "asc" },
      });
    }
  }

  return entries;
}

export async function getMyImagingLogSummary() {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const counts = await prisma.imagingLog.groupBy({
    by: ["imagingCategory"],
    where: {
      userId: user.id,
      OR: [
        { completeDiagnosis: { not: null } },
        { skillLevel: { not: null } },
        { patientName: { not: null } },
        {
          status: { in: ["SUBMITTED", "SIGNED", "NEEDS_REVISION"] as never[] },
        },
      ],
    },
    _count: { id: true },
  });

  const signedCounts = await prisma.imagingLog.groupBy({
    by: ["imagingCategory"],
    where: { userId: user.id, status: "SIGNED" as never },
    _count: { id: true },
  });

  return {
    totalByCategory: Object.fromEntries(
      counts.map((c) => [c.imagingCategory, c._count.id]),
    ),
    signedByCategory: Object.fromEntries(
      signedCounts.map((c) => [c.imagingCategory, c._count.id]),
    ),
  };
}

// ─── Faculty List ───────────────────────────────────────────

export async function getAvailableImagingFaculty() {
  await requireAuthHybrid();

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

export async function updateImagingLogEntry(
  id: string,
  data: {
    date?: string | null;
    patientName?: string | null;
    patientAge?: number | null;
    patientSex?: string | null;
    uhid?: string | null;
    completeDiagnosis?: string | null;
    imagingType?: string | null;
    performedAtLocation?: string | null;
    skillLevel?: string | null;
    totalProcedureTally?: number;
    totalImagingTally?: number;
    imageUrls?: string[];
    facultyId?: string | null;
  },
) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const existing = await prisma.imagingLog.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== user.id) {
    throw new Error("Entry not found or unauthorized");
  }
  if (existing.status === "SIGNED") {
    throw new Error("Cannot edit a signed entry");
  }

  const entry = await prisma.imagingLog.update({
    where: { id },
    data: {
      date: data.date ? new Date(data.date) : null,
      patientName: data.patientName,
      patientAge: data.patientAge,
      patientSex: data.patientSex,
      uhid: data.uhid,
      completeDiagnosis: data.completeDiagnosis,
      procedureDescription: (data as any).procedureDescription ?? (data as any).imagingType ?? null,
      performedAtLocation: data.performedAtLocation,
      skillLevel: data.skillLevel as never,
      totalProcedureTally: data.totalProcedureTally ?? data.totalImagingTally ?? existing.totalProcedureTally ?? 0,
      imageUrls: data.imageUrls ?? existing.imageUrls,
      facultyId: data.facultyId,
      status: existing.status === "NEEDS_REVISION" ? ("DRAFT" as never) : existing.status,
    },
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true, data: entry };
}

// ─── Submit ─────────────────────────────────────────────────

export async function submitImagingLogEntry(id: string) {
  const clerkId = await requireAuthHybrid();
  const user = await resolveUser(clerkId);

  const existing = await prisma.imagingLog.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== user.id) {
    throw new Error("Entry not found or unauthorized");
  }
  if (existing.status === "SIGNED") {
    throw new Error("Entry is already signed");
  }

  const autoReview = await isAutoReviewEnabled("imagingLogs");

  if (autoReview) {
    await prisma.$transaction([
      prisma.imagingLog.update({
        where: { id },
        data: { status: "SIGNED" as never },
      }),
      prisma.digitalSignature.create({
        data: {
          signedById: "auto-review",
          entityType: "ImagingLog",
          entityId: id,
          remark: "Auto-reviewed by system",
        },
      }),
    ]);
  } else {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.imagingLog.update({
        where: { id },
        data: { status: "SUBMITTED" as never },
      });
      await recordSubmission(tx, {
        entityType: "ImagingLog",
        entityId: id,
        ownerId: user.id,
        snapshot: buildSnapshot(updated),
      });
    });
  }

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true };
}

// ─── Faculty/HOD: Review ────────────────────────────────────

export async function getImagingLogsForReview(imagingCategory?: string) {
  const { userId, role } = await requireRoleHybrid(["faculty", "hod"]);
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
  if (imagingCategory) where.imagingCategory = imagingCategory as never;

  const entries = await prisma.imagingLog.findMany({
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

  const entryIds = entries.map((e) => e.id);
  const signatures = await prisma.digitalSignature.findMany({
    where: {
      entityType: "ImagingLog",
      entityId: { in: entryIds },
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
    orderBy: { signedAt: "desc" },
  });

  const signaturesMap = new Map<string, typeof signatures>();
  for (const sig of signatures) {
    if (!signaturesMap.has(sig.entityId)) {
      signaturesMap.set(sig.entityId, []);
    }
    signaturesMap.get(sig.entityId)?.push(sig);
  }

  return entries.map((entry) => ({
    ...entry,
    signatures: signaturesMap.get(entry.id) || [],
  }));
}

export async function signImagingLogEntry(id: string, remark?: string) {
  const { userId } = await requireRoleHybrid(["faculty", "hod"]);
  const user = await resolveUser(userId);

  const entry = await prisma.imagingLog.findUnique({ where: { id } });
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "SUBMITTED") {
    throw new Error("Entry must be submitted before signing");
  }

  await prisma.$transaction(async (tx) => {
    await tx.imagingLog.update({
      where: { id },
      data: {
        status: "SIGNED" as never,
        facultyRemark: remark || entry.facultyRemark,
      },
    });
    await recordReview(tx, {
      entityType: "ImagingLog",
      entityId: id,
      ownerId: entry.userId,
      reviewerId: user.id,
      reviewerRole: "faculty",
      decision: "SIGNED",
      remark: remark ?? null,
    });
    await tx.digitalSignature.create({
      data: {
        signedById: user.id,
        entityType: "ImagingLog",
        entityId: id,
        remark,
      },
    });
  });

  // Send Real-Time Push Notification to Student
  const catConfig = IMAGING_CATEGORIES.find((c) => c.enumValue === entry.imagingCategory);
  await sendRealtimeNotification(
    entry.userId,
    "Imaging Log Signed",
    `Your imaging log entry '${catConfig?.label || entry.imagingCategory}' (Sl No: ${entry.slNo}) has been signed off.`,
    { type: "ENTRY_SIGNED", entityId: id, module: "imaging", category: entry.imagingCategory },
  ).catch(() => {});

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true };
}

export async function rejectImagingLogEntry(id: string, remark: string) {
  const { userId: clerkId } = await requireRoleHybrid(["faculty", "hod"]);
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const entry = await prisma.imagingLog.findUnique({ where: { id } });
  if (!entry) throw new Error("Entry not found");

  await prisma.$transaction(async (tx) => {
    await tx.imagingLog.update({
      where: { id },
      data: {
        status: "NEEDS_REVISION" as never,
        facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`,
      },
    });
    await recordReview(tx, {
      entityType: "ImagingLog",
      entityId: id,
      ownerId: entry.userId,
      reviewerId: user.id,
      reviewerRole: "faculty",
      decision: "NEEDS_REVISION",
      remark: `[${user.firstName} ${user.lastName}] ${remark}`,
    });
  });

  // Send Real-Time Push Notification to Student
  const catConfig = IMAGING_CATEGORIES.find((c) => c.enumValue === entry.imagingCategory);
  await sendRealtimeNotification(
    entry.userId,
    "Imaging Log Revision Requested",
    `Revision requested for imaging log entry '${catConfig?.label || entry.imagingCategory}': ${remark}`,
    { type: "ENTRY_REVISED", entityId: id, module: "imaging", category: entry.imagingCategory },
  ).catch(() => {});

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true };
}

export async function bulkSignImagingLogEntries(ids: string[]) {
  const { userId } = await requireRoleHybrid(["faculty", "hod"]);
  const user = await resolveUser(userId);

  const entries = await prisma.imagingLog.findMany({
    where: { id: { in: ids }, status: "SUBMITTED" as never },
  });

  if (entries.length === 0) throw new Error("No valid entries to sign");

  await prisma.$transaction(async (tx) => {
    await tx.imagingLog.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: {
        status: "SIGNED" as never,
      },
    });
    for (const entry of entries) {
      await tx.digitalSignature.create({
        data: {
          signedById: user.id,
          entityType: "ImagingLog",
          entityId: entry.id,
        },
      });
      await recordReview(tx, {
        entityType: "ImagingLog",
        entityId: entry.id,
        ownerId: entry.userId,
        reviewerId: user.id,
        reviewerRole: "faculty",
        decision: "SIGNED",
        remark: "Bulk signed",
      });
    }
  });

  revalidateAll();
  emitRealtimeEvent("entry:updated", { module: "imaging" });
  return { success: true, signedCount: entries.length };
}

// ─── Student Detail (Faculty/HOD) ───────────────────────────

export async function getStudentImagingLogs(
  studentId: string,
  imagingCategory?: string,
) {
  await requireRoleHybrid(["faculty", "hod"]);

  const where: Record<string, unknown> = { userId: studentId };
  if (imagingCategory) where.imagingCategory = imagingCategory as never;

  return prisma.imagingLog.findMany({
    where,
    orderBy: [{ imagingCategory: "asc" }, { slNo: "asc" }],
  });
}
