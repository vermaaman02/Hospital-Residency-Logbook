"use server";

import crypto from "crypto";

export async function getCloudinarySignature() {
	const timestamp = Math.round(new Date().getTime() / 1000);
	const apiSecret = process.env.CLOUDINARY_API_SECRET;

	if (!apiSecret) {
		throw new Error("CLOUDINARY_API_SECRET is not configured");
	}

	const signature = crypto
		.createHash("sha1")
		.update(`timestamp=${timestamp}${apiSecret}`)
		.digest("hex");

	return { timestamp, signature };
}
