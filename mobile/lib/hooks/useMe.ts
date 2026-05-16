/**
 * Fetches the current user from GET /api/v1/me.
 * Returns the full MeUser object including role.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MeUser } from "@logbook/shared/types";

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
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});
}
