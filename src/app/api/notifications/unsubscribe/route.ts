import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { removeSubscription } from "@/lib/notifications";

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		const body = await req.json();
		const { endpoint } = body;
		if (!endpoint)
			return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
		await removeSubscription(userId, endpoint);
		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[NOTIFICATIONS_UNSUBSCRIBE]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
