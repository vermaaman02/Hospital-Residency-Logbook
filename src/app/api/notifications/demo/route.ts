import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendNotificationToAllSubscribedUsers } from "@/lib/notifications";

export async function POST(req: Request) {
	try {
		const { userId, sessionClaims } = await auth();
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const role = (sessionClaims?.metadata as { role?: string } | undefined)
			?.role;
		if (role !== "HOD") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await req.json();
		const payload = body?.payload ?? {
			title: "Demo notification",
			body: "This is a demo push",
		};

		const results = await sendNotificationToAllSubscribedUsers(payload);
		return NextResponse.json({ ok: true, results });
	} catch (e) {
		console.error("[NOTIFICATIONS_DEMO]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
