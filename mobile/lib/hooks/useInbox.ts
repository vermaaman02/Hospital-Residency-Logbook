import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { InboxItem } from "@logbook/shared/types";

interface InboxPage {
	items: InboxItem[];
	nextCursor: string | null;
}

async function fetchInboxPage({ pageParam }: { pageParam: string | null }): Promise<InboxPage> {
	const params: Record<string, string> = { limit: "20" };
	if (pageParam) params.cursor = pageParam;
	const res = await apiClient.get<{ ok: boolean; data: InboxPage }>("/api/v1/inbox", { params });
	if (!res.data.ok || !res.data.data) throw new Error("Failed to load inbox");
	return res.data.data;
}

export function useInbox() {
	return useInfiniteQuery({
		queryKey: ["inbox"],
		queryFn: fetchInboxPage,
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
		staleTime: 30_000,
	});
}
