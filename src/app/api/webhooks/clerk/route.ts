/**
 * @module ClerkWebhook
 * @description Handles Clerk webhook events for user sync.
 * When a user signs up or updates their profile in Clerk,
 * this webhook creates/updates the corresponding User record in our database.
 *
 * @see roadmap.md — Section 8
 */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

interface ClerkWebhookEvent {
	type: string;
	data: {
		id: string;
		email_addresses: Array<{ email_address: string }>;
		first_name: string | null;
		last_name: string | null;
		image_url: string | null;
		public_metadata: {
			role?: "HOD" | "FACULTY" | "STUDENT";
		};
	};
}

export async function POST(req: NextRequest) {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		console.error("[CLERK_WEBHOOK] CLERK_WEBHOOK_SECRET is not set");
		return NextResponse.json(
			{ error: "Webhook secret not configured" },
			{ status: 500 },
		);
	}

	// Get the headers
	const svixId = req.headers.get("svix-id");
	const svixTimestamp = req.headers.get("svix-timestamp");
	const svixSignature = req.headers.get("svix-signature");

	if (!svixId || !svixTimestamp || !svixSignature) {
		return NextResponse.json(
			{ error: "Missing svix headers" },
			{ status: 400 },
		);
	}

	// Get the body
	const body = await req.text();

	// Verify the webhook
	const wh = new Webhook(WEBHOOK_SECRET);
	let evt: ClerkWebhookEvent;

	try {
		evt = wh.verify(body, {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
			"svix-signature": svixSignature,
		}) as ClerkWebhookEvent;
	} catch (err) {
		console.error("[CLERK_WEBHOOK] Verification failed:", err);
		return NextResponse.json(
			{ error: "Invalid webhook signature" },
			{ status: 400 },
		);
	}

	const { type, data } = evt;

	try {
		switch (type) {
			case "user.created":
			case "user.updated": {
				const email = data.email_addresses[0]?.email_address;
				if (!email) break;

				const role = data.public_metadata?.role ?? "STUDENT";

				await prisma.user.upsert({
					where: { clerkId: data.id },
					update: {
						email,
						firstName: data.first_name ?? "",
						lastName: data.last_name ?? "",
						profileImage: data.image_url,
						role,
					},
					create: {
						clerkId: data.id,
						email,
						firstName: data.first_name ?? "",
						lastName: data.last_name ?? "",
						profileImage: data.image_url,
						role,
					},
				});

				break;
			}

			case "user.deleted": {
				// Soft delete: We don't actually remove user data
				// (medical records must be preserved)
				console.log(
					"[CLERK_WEBHOOK] User deleted event received for:",
					data.id,
				);
				break;
			}

			default:
				break;
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[CLERK_WEBHOOK] Processing error:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}
