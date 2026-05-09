import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { saveSubscription } from "@/lib/notifications";

export async function POST(req: Request) {
	try {
		const { userId: clerkId } = await auth();
		if (!clerkId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		// Ensure user record exists in database
		const clerkUser = await currentUser();
		if (!clerkUser) {
			return NextResponse.json(
				{ error: "User not found in Clerk" },
				{ status: 401 },
			);
		}

		// Upsert user to ensure they exist before saving subscription
		const dbUser = await prisma.user.upsert({
			where: { clerkId },
			update: {}, // No updates needed if user exists
			create: {
				clerkId,
				email:
					clerkUser.emailAddresses[0]?.emailAddress || "unknown@example.com",
				firstName: clerkUser.firstName || "User",
				lastName: clerkUser.lastName || "",
			},
		});

		const body = await req.json();
		const subscription = body.subscription;
		if (!subscription)
			return NextResponse.json(
				{ error: "Missing subscription" },
				{ status: 400 },
			);
		// Use dbUser.id (the CUID), not clerkId
		await saveSubscription(dbUser.id, subscription);
		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[NOTIFICATIONS_SUBSCRIBE]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
