/**
 * @module Face Image Proxy
 * @description Proxies external profile images (e.g., Clerk CDN) to avoid
 * CORS restrictions when loading images into face-api.js for descriptor extraction.
 *
 * GET /api/face-proxy?url=<encoded-image-url>
 *
 * Returns the image as a binary response with proper content-type headers
 * and CORS headers allowing the face-api.js canvas to read the image data.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
	try {
		// Auth check — only logged-in users can proxy images
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const imageUrl = searchParams.get("url");

		if (!imageUrl) {
			return NextResponse.json(
				{ error: "Missing url parameter" },
				{ status: 400 },
			);
		}

		// Validate URL is a reasonable image source (Clerk CDN or common image hosts)
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(imageUrl);
		} catch {
			return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
		}

		// Allow Clerk CDN, common image hosts, and localhost for dev
		const allowedHosts = [
			"img.clerk.com",
			"images.clerk.dev",
			"img.clerk.dev",
			"res.cloudinary.com",
			"lh3.googleusercontent.com",
			"avatars.githubusercontent.com",
			"localhost",
		];

		const isAllowed = allowedHosts.some(
			(host) =>
				parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`),
		);

		if (!isAllowed) {
			return NextResponse.json(
				{ error: "Image host not allowed" },
				{ status: 403 },
			);
		}

		// Fetch the image server-side (no CORS restrictions)
		const imageResponse = await fetch(imageUrl, {
			headers: {
				Accept: "image/*",
			},
		});

		if (!imageResponse.ok) {
			return NextResponse.json(
				{ error: `Failed to fetch image: ${imageResponse.status}` },
				{ status: 502 },
			);
		}

		const contentType =
			imageResponse.headers.get("content-type") ?? "image/jpeg";
		const imageBuffer = await imageResponse.arrayBuffer();

		return new NextResponse(imageBuffer, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=3600",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("[FACE_PROXY_GET]", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
