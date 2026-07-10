/**
 * POST /api/v1/inbox/clear
 * Mark one or more inbox notifications as cleared/archived.
 *
 * Body schema:
 *   itemId    — (Optional) ID of a single item to clear
 *   itemIds   — (Optional) Array of item IDs to clear in batch
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";

export async function POST(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();
		const user = await prisma.user.findUnique({ where: { clerkId } });
		if (!user) {
			return err("User not found", 404);
		}

		const body = await req.json();
		const itemIds: string[] = body.itemIds ?? (body.itemId ? [body.itemId] : []);

		if (itemIds.length === 0) {
			return err("No itemIds or itemId provided", 400);
		}

		await prisma.clearedNotification.createMany({
			data: itemIds.map((id) => ({
				userId: user.id,
				itemId: id,
			})),
			skipDuplicates: true,
		});

		return ok({ success: true });
	} catch (e) {
		return handleError(e);
	}
}
