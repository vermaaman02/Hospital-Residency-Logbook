/**
 * @module Profile Actions
 * @description Server actions for users to manage their own profile.
 * Updates both Clerk (for auth) and local DB (for app data).
 *
 * @see https://clerk.com/docs/references/backend/user
 */

"use server";

import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const updateProfileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
});

/**
 * Update current user's profile (name) in both Clerk and local DB.
 * Any authenticated user can update their own profile.
 */
export async function updateProfile(formData: {
	firstName: string;
	lastName: string;
}) {
	const clerkId = await requireAuth();

	const validated = updateProfileSchema.parse(formData);

	const client = await clerkClient();

	// Update Clerk user
	try {
		await client.users.updateUser(clerkId, {
			firstName: validated.firstName,
			lastName: validated.lastName,
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to update profile in Clerk";
		console.error("[UPDATE_PROFILE_CLERK]", err);
		return { success: false, message };
	}

	// Update local DB
	try {
		await prisma.user.update({
			where: { clerkId },
			data: {
				firstName: validated.firstName,
				lastName: validated.lastName,
			},
		});
	} catch (err) {
		console.error("[UPDATE_PROFILE_DB]", err);
		return { success: false, message: "Failed to update profile in database" };
	}

	revalidatePath("/dashboard/profile");
	return { success: true, message: "Profile updated successfully" };
}

/**
 * Sync profile image URL from Clerk to local DB.
 * Called after successful image upload via Clerk's client-side API.
 */
export async function syncProfileImage(imageUrl: string) {
	const clerkId = await requireAuth();

	if (!imageUrl) {
		return { success: false, message: "Image URL is required" };
	}

	// Update local DB with new image URL
	try {
		await prisma.user.update({
			where: { clerkId },
			data: {
				profileImage: imageUrl,
			},
		});
	} catch (err) {
		console.error("[SYNC_PROFILE_IMAGE_DB]", err);
		return { success: false, message: "Failed to sync profile image" };
	}

	revalidatePath("/dashboard/profile");
	return { success: true, message: "Profile image synced successfully" };
}
