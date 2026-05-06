/**
 * @module entry-revisions
 * @description Helpers for recording submission snapshots and review comments
 * for any entry/form across the application. Polymorphic on `entityType`.
 *
 * Usage in a server action (typical pattern):
 * ```ts
 * await prisma.$transaction(async (tx) => {
 *   await tx.rotationPosting.update({ where: { id }, data: { status: "SUBMITTED" } });
 *   await recordSubmission(tx, {
 *     entityType: "RotationPosting",
 *     entityId: id,
 *     ownerId: user.id,
 *     snapshot: buildSnapshot(existing),
 *     attachments: existing.attachments,
 *   });
 * });
 * ```
 */

import { prisma } from "@/lib/prisma";

/**
 * Whitelist of entity types that can have revisions. Add a new string here
 * when wiring revisions into a new model.
 */
export const ENTITY_TYPES = [
	"RotationPosting",
	"Thesis",
	"ThesisSemesterRecord",
	"AttendanceSheet",
	"AttendanceEntry",
	"CasePresentation",
	"Seminar",
	"JournalClub",
	"ClinicalSkillAdult",
	"ClinicalSkillPediatric",
	"CaseManagementLog",
	"ProcedureLog",
	"DiagnosticSkill",
	"ImagingLog",
	"TransportLog",
	"ConsentLog",
	"BadNewsLog",
	"CourseAttended",
	"ConferenceParticipation",
	"ResearchActivity",
	"DisasterDrill",
	"QualityImprovement",
	"LogbookFacultyReview",
	"ResidentEvaluation",
	"TrainingMentoringRecord",
	"AssessmentSubmission",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export type ReviewDecision = "SIGNED" | "NEEDS_REVISION" | "REJECTED";

/**
 * Minimal client interface that both `prisma` and a transaction client satisfy.
 * Avoids tight coupling to Prisma's generated `TransactionClient` type.
 */
type Client = {
	entryRevision: typeof prisma.entryRevision;
};

/**
 * Wide transaction-client type for callbacks that need access to arbitrary
 * model delegates (e.g. `tx.casePresentation.update`). Inferred from the
 * generated Prisma client's `$transaction` callback parameter.
 */
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Strip volatile/audit fields from a row before snapshotting. Keeps the
 * domain payload only so future schema additions don't pollute snapshots.
 */
const VOLATILE_FIELDS = new Set([
	"createdAt",
	"updatedAt",
	"status",
	"facultyRemark",
]);

export function buildSnapshot<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (VOLATILE_FIELDS.has(key)) continue;
		// Convert Date instances to ISO strings for stable JSON storage.
		if (value instanceof Date) {
			out[key] = value.toISOString();
		} else {
			out[key] = value;
		}
	}
	return out;
}

/**
 * Compute the next monotonic version for a given entity. Caller should pass
 * the same client (`tx` or `prisma`) used for the write.
 */
export async function nextVersion(
	client: Client,
	entityType: EntityType,
	entityId: string,
): Promise<number> {
	const last = await client.entryRevision.findFirst({
		where: { entityType, entityId },
		orderBy: { version: "desc" },
		select: { version: true },
	});
	return (last?.version ?? 0) + 1;
}

export interface RecordSubmissionInput {
	entityType: EntityType;
	entityId: string;
	ownerId: string;
	snapshot: Record<string, unknown>;
	attachments?: string[];
	submittedAt?: Date;
}

export async function recordSubmission(
	client: Client,
	input: RecordSubmissionInput,
) {
	const version = await nextVersion(client, input.entityType, input.entityId);
	return client.entryRevision.create({
		data: {
			entityType: input.entityType,
			entityId: input.entityId,
			ownerId: input.ownerId,
			version,
			kind: "SUBMISSION",
			snapshot: input.snapshot as object,
			attachments: input.attachments ?? [],
			submittedAt: input.submittedAt ?? new Date(),
		},
	});
}

export interface RecordReviewInput {
	entityType: EntityType;
	entityId: string;
	ownerId: string;
	reviewerId: string;
	reviewerRole: "faculty" | "hod";
	decision: ReviewDecision;
	remark?: string | null;
}

export async function recordReview(
	client: Client,
	input: RecordReviewInput,
) {
	const version = await nextVersion(client, input.entityType, input.entityId);
	return client.entryRevision.create({
		data: {
			entityType: input.entityType,
			entityId: input.entityId,
			ownerId: input.ownerId,
			version,
			kind: "REVIEW",
			reviewerId: input.reviewerId,
			reviewerRole: input.reviewerRole,
			decision: input.decision,
			remark: input.remark ?? null,
		},
	});
}

/**
 * Convenience wrapper: snapshot an entry on submission. Wraps the typical
 * `update + recordSubmission` pattern in a single transaction.
 *
 * @example
 * await submitEntryWithRevision({
 *   entityType: "CasePresentation",
 *   entityId: id,
 *   ownerId: user.id,
 *   updateRow: (tx) => tx.casePresentation.update({ where: { id }, data: { status: "SUBMITTED" } }),
 * });
 */
export async function submitEntryWithRevision<TRow extends Record<string, unknown>>(opts: {
	entityType: EntityType;
	entityId: string;
	ownerId: string;
	updateRow: (tx: TxClient) => Promise<TRow>;
	attachmentsKey?: keyof TRow;
}): Promise<TRow> {
	return prisma.$transaction(async (tx) => {
		const updated = await opts.updateRow(tx);
		const attachments =
			opts.attachmentsKey && Array.isArray(updated[opts.attachmentsKey])
				? (updated[opts.attachmentsKey] as string[])
				: undefined;
		await recordSubmission(tx, {
			entityType: opts.entityType,
			entityId: opts.entityId,
			ownerId: opts.ownerId,
			snapshot: buildSnapshot(updated),
			attachments,
		});
		return updated;
	});
}

/**
 * Convenience wrapper: record a review (sign / needs-revision / reject) and
 * the corresponding row update in a single transaction.
 */
export async function reviewEntryWithRevision(opts: {
	entityType: EntityType;
	entityId: string;
	ownerId: string;
	reviewerId: string;
	reviewerRole: "faculty" | "hod";
	decision: ReviewDecision;
	remark?: string | null;
	updateRow: (tx: TxClient) => Promise<unknown>;
}): Promise<void> {
	await prisma.$transaction(async (tx) => {
		await opts.updateRow(tx);
		await recordReview(tx, {
			entityType: opts.entityType,
			entityId: opts.entityId,
			ownerId: opts.ownerId,
			reviewerId: opts.reviewerId,
			reviewerRole: opts.reviewerRole,
			decision: opts.decision,
			remark: opts.remark ?? null,
		});
	});
}

/**
 * Fetch the full revision thread for an entry, oldest first.
 * Includes reviewer name for display.
 */
export async function getRevisionsFor(
	entityType: EntityType,
	entityId: string,
) {
	return prisma.entryRevision.findMany({
		where: { entityType, entityId },
		orderBy: [{ version: "asc" }, { createdAt: "asc" }],
		include: {
			reviewer: {
				select: { id: true, firstName: true, lastName: true, role: true },
			},
		},
	});
}
