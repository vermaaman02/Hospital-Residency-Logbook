/**
 * @module Entry Revisions Actions
 * @description Public server actions for fetching the revision thread of any entry.
 * Access rules:
 *  - Owner (the student who created the entry) can always view.
 *  - Faculty: can view if the entry's owner is in one of their assigned batches.
 *  - HOD: can always view.
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentRole } from "@/lib/auth";
import {
	getRevisionsFor,
	type EntityType,
	ENTITY_TYPES,
} from "@/lib/entry-revisions";

function isEntityType(value: string): value is EntityType {
	return (ENTITY_TYPES as readonly string[]).includes(value);
}

export interface RevisionThreadItem {
	id: string;
	version: number;
	kind: "SUBMISSION" | "REVIEW";
	createdAt: string;
	// SUBMISSION
	snapshot: Record<string, unknown> | null;
	attachments: string[];
	submittedAt: string | null;
	// REVIEW
	reviewerId: string | null;
	reviewerRole: string | null;
	reviewerName: string | null;
	decision: "SIGNED" | "NEEDS_REVISION" | "REJECTED" | null;
	remark: string | null;
}

/**
 * Fetch the full revision thread for an entry. Caller must be authorised.
 */
export async function getEntryRevisions(
	entityType: string,
	entityId: string,
): Promise<RevisionThreadItem[]> {
	const clerkId = await requireAuth();
	if (!isEntityType(entityType)) {
		throw new Error(`Unsupported entity type: ${entityType}`);
	}

	const role = await getCurrentRole();

	// Owner-or-privileged check
	const me = await prisma.user.findUnique({
		where: { clerkId },
		select: { id: true, role: true },
	});
	if (!me) throw new Error("User not found");

	const revisions = await getRevisionsFor(entityType, entityId);
	if (revisions.length === 0) return [];

	const ownerId = revisions[0]?.ownerId;

	if (role !== "hod" && me.id !== ownerId) {
		// Faculty: only allow if owner is a student in one of their assigned batches.
		if (role === "faculty") {
			const owner = await prisma.user.findUnique({
				where: { id: ownerId },
				select: { batchId: true },
			});
			if (!owner?.batchId) throw new Error("Not authorised");
			const fba = await prisma.facultyBatchAssignment.findFirst({
				where: { facultyId: me.id, batchId: owner.batchId },
				select: { id: true },
			});
			if (!fba) throw new Error("Not authorised");
		} else {
			// Student trying to view someone else's thread.
			throw new Error("Not authorised");
		}
	}

	return revisions.map((r) => ({
		id: r.id,
		version: r.version,
		kind: r.kind as "SUBMISSION" | "REVIEW",
		createdAt: r.createdAt.toISOString(),
		snapshot: (r.snapshot as Record<string, unknown> | null) ?? null,
		attachments: r.attachments ?? [],
		submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
		reviewerId: r.reviewerId,
		reviewerRole: r.reviewerRole,
		reviewerName:
			r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : null,
		decision: r.decision as RevisionThreadItem["decision"],
		remark: r.remark,
	}));
}
