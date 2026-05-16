import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface EntryPage {
	items: unknown[];
	nextCursor: string | null;
}

async function fetchEntriesPage(
	entityType: string,
	pageParam: string | null,
): Promise<EntryPage> {
	const params: Record<string, string> = { limit: "20" };
	if (pageParam) params.cursor = pageParam;
	const res = await apiClient.get<{ ok: boolean; data: EntryPage }>(
		`/api/v1/${entityType}`,
		{ params },
	);
	if (!res.data.ok || !res.data.data) throw new Error("Failed to load entries");
	return res.data.data;
}

export function useEntries(entityType: string) {
	return useInfiniteQuery({
		queryKey: ["entries", entityType],
		queryFn: ({ pageParam }) => fetchEntriesPage(entityType, pageParam as string | null),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage: EntryPage) => lastPage.nextCursor ?? null,
		staleTime: 30_000,
	});
}

export function useSubmitEntry(entityType: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient.post(`/api/v1/${entityType}`, { action: "submit", id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["entries", entityType] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
			qc.invalidateQueries({ queryKey: ["inbox"] });
		},
	});
}

export function useDeleteEntry(entityType: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient.post(`/api/v1/${entityType}`, { action: "delete", id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["entries", entityType] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}
