/**
 * Fetches the current user from GET /api/v1/me.
 * Returns the user object including role, batch, semester etc.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type MeUser = {
	id: string;
	clerkId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	role: "student" | "faculty" | "hod";
	batch: string | null;
	currentSemester: number | null;
	department: string | null;
	imageUrl: string | null;
	status: string;
};

async function fetchMe(): Promise<MeUser> {
	const res = await apiClient.get<{ ok: boolean; data: MeUser }>("/api/v1/me");
	if (!res.data.ok || !res.data.data) {
		throw new Error("Failed to load profile");
	}
	return res.data.data;
}

export function useMe() {
	return useQuery({
		queryKey: ["me"],
		queryFn: fetchMe,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}
