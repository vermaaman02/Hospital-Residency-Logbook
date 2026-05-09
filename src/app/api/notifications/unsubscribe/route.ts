import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { removeSubscription } from "@/lib/notifications";

export async function POST(req: Request) {
	try {
		const { userId: clerkId } = await auth();
		if (!clerkId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		// Get the actual user ID (CUID) from database
		const user = await prisma.user.findUnique({ where: { clerkId } });
		if (!user)
			return NextResponse.json({ error: "User not found" }, { status: 404 });

		const body = await req.json();
		const { endpoint } = body;
		if (!endpoint)
			return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
		await removeSubscription(user.id, endpoint);
		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[NOTIFICATIONS_UNSUBSCRIBE]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
