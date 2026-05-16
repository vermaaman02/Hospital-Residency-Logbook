/**
 * POST   /api/v1/push-tokens   — register or refresh an Expo push token
 * DELETE /api/v1/push-tokens   — unregister a push token (logout / permission revoked)
 *
 * Body (POST):
 *   token    string        — Expo push token (ExponentPushToken[xxx] or device token)
 *   platform "IOS"|"ANDROID"
 *
 * Body (DELETE):
 *   token    string        — the token to remove
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import { z } from "zod/v4";

const registerSchema = z.object({
	token: z.string().min(1),
	platform: z.enum(["IOS", "ANDROID"]),
});

export async function POST(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: { id: true },
		});
		if (!user) return err("User not found", 404);

		const body = await req.json();
		const parsed = registerSchema.safeParse(body);
		if (!parsed.success) {
			return err("token and platform are required", 400);
		}

		const { token, platform } = parsed.data;

		const record = await prisma.mobilePushToken.upsert({
			where: { token },
			create: { userId: user.id, token, platform: platform as never },
			update: { userId: user.id, platform: platform as never },
		});

		return ok(record, 201);
	} catch (e) {
		return handleError(e);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: { id: true },
		});
		if (!user) return err("User not found", 404);

		const body = await req.json();
		const { token } = body as { token?: string };
		if (!token) return err("token is required", 400);

		await prisma.mobilePushToken.deleteMany({
			where: { token, userId: user.id },
		});

		return ok({ removed: true });
	} catch (e) {
		return handleError(e);
	}
}
