/**
 * POST /api/v1/cloudinary-sign
 * Returns a signed Cloudinary upload signature so the mobile app can upload
 * directly to Cloudinary without exposing the API secret.
 *
 * Body (optional):
 *   folder  string  — Cloudinary folder (default: "logbook")
 *
 * Accepts both Clerk cookie session and Authorization: Bearer <jwt>.
 */

import { type NextRequest } from "next/server";
import { requireAuthHybrid } from "@/lib/auth";
import { ok, handleError } from "@/app/api/v1/_lib/respond";
import crypto from "crypto";

export async function POST(req: NextRequest) {
	try {
		await requireAuthHybrid();

		const body = (await req.json().catch(() => ({}))) as { folder?: string };
		const folder = body.folder ?? "logbook";

		const timestamp = Math.round(Date.now() / 1000);
		const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
		const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? "";
		const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

		const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
		const signature = crypto
			.createHash("sha1")
			.update(paramsToSign + apiSecret)
			.digest("hex");

		return ok({ signature, timestamp, apiKey, cloudName, folder });
	} catch (e) {
		return handleError(e);
	}
}
