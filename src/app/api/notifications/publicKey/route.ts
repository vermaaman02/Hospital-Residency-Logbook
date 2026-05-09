import { NextResponse } from "next/server";

export async function GET() {
	try {
		const publicKey =
			process.env.WEB_PUSH_VAPID_PUBLIC ||
			process.env.NEXT_PUBLIC_VAPID_PUBLIC ||
			null;
		if (!publicKey) {
			return NextResponse.json(
				{ error: "VAPID public key not configured" },
				{ status: 500 },
			);
		}
		return NextResponse.json({ publicKey });
	} catch (e) {
		console.error("[NOTIFICATIONS_PUBLICKEY_GET]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
