import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveSubscription } from "@/lib/notifications";

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		const body = await req.json();
		const subscription = body.subscription;
		if (!subscription)
			return NextResponse.json(
				{ error: "Missing subscription" },
				{ status: 400 },
			);
		await saveSubscription(userId, subscription);
		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[NOTIFICATIONS_SUBSCRIBE]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
