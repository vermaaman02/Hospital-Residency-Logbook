/**
 * Fetches dashboard stats from GET /api/v1/dashboard.
 * Returns per-module entry counts grouped by status.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ModuleStatusMap = Record<string, number>;

export type DashboardData = {
	caseManagement: ModuleStatusMap;
	procedures: ModuleStatusMap;
	diagnostics: ModuleStatusMap;
	imaging: ModuleStatusMap;
	clinicalSkillsAdult: ModuleStatusMap;
	clinicalSkillsPediatric: ModuleStatusMap;
	casePresentations: ModuleStatusMap;
	rotationPostings: ModuleStatusMap;
	attendance: ModuleStatusMap;
};

function sumAll(m: ModuleStatusMap): number {
	return Object.values(m).reduce((a, b) => a + b, 0);
}

function sumByStatus(m: ModuleStatusMap, status: string): number {
	return m[status] ?? 0;
}

export function computeTotals(data: DashboardData) {
	const modules = [
		data.caseManagement,
		data.procedures,
		data.diagnostics,
		data.imaging,
		data.clinicalSkillsAdult,
		data.clinicalSkillsPediatric,
		data.casePresentations,
		data.rotationPostings,
	];

	const totalEntries = modules.reduce((s, m) => s + sumAll(m), 0);
	const totalSigned = modules.reduce((s, m) => s + sumByStatus(m, "SIGNED"), 0);
	const totalPending = modules.reduce((s, m) => s + sumByStatus(m, "SUBMITTED"), 0);
	const totalDraft = modules.reduce((s, m) => s + sumByStatus(m, "DRAFT"), 0);

	return { totalEntries, totalSigned, totalPending, totalDraft };
}

async function fetchDashboard(): Promise<DashboardData> {
	const res = await apiClient.get<{ ok: boolean; data: DashboardData }>(
		"/api/v1/dashboard",
	);
	if (!res.data.ok || !res.data.data) {
		throw new Error("Failed to load dashboard");
	}
	return res.data.data;
}

export function useDashboard() {
	return useQuery({
		queryKey: ["dashboard"],
		queryFn: fetchDashboard,
		staleTime: 2 * 60 * 1000,
		retry: 2,
	});
}
