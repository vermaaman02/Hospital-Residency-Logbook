/**
 * POST /api/v1/export/token
 * Creates a short-lived download token authenticated with HMAC-SHA256.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err, handleError } from "@/app/api/v1/_lib/respond";
import crypto from "crypto";

const SECRET = process.env.CLERK_SECRET_KEY || "fallback_secret_key_123456";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	try {
		const clerkId = await requireAuthHybrid();

		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: { id: true },
		});
		if (!user) return err("User not found", 404);

		const body = await req.json().catch(() => ({}));
		const { module, format } = body as { module?: string; format?: string };

		if (!module || !format) {
			return err("module and format are required", 400);
		}

		// Token expires in 1 minute (60,000ms)
		const expiresAt = Date.now() + 60000;
		const payload = `${user.id}:${module}:${format}:${expiresAt}`;
		const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
		const token = Buffer.from(`${payload}:${signature}`).toString("base64");

		return ok({ token });
	} catch (e) {
		return handleError(e);
	}
}
