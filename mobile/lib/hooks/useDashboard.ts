import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { DashboardSummary } from "@logbook/shared/types";

async function fetchDashboard(): Promise<DashboardSummary> {
	const res = await apiClient.get<{ ok: boolean; data: DashboardSummary }>("/api/v1/dashboard");
	if (!res.data.ok || !res.data.data) throw new Error("Failed to load dashboard");
	return res.data.data;
}

export function useDashboard() {
	return useQuery({
		queryKey: ["dashboard"],
		queryFn: fetchDashboard,
		staleTime: 60_000,
	});
}
