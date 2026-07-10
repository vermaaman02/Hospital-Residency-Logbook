/**
 * Hook for managing the student's unified inbox timeline on mobile.
 * Connects to GET /api/v1/inbox.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface InboxItem {
	id: string;
	module: string;
	title: string;
	studentName: string;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	remark: string | null;
	updatedAt: string;
	href: string;
}

async function fetchInbox(): Promise<InboxItem[]> {
	const { data } = await apiClient.get("/api/v1/inbox");
	return data.data?.items ?? [];
}

export function useInbox() {
	const { data: items = [], isLoading, error, refetch } = useQuery({
		queryKey: ["inbox"],
		queryFn: fetchInbox,
	});

	return {
		items,
		isLoading,
		error,
		refetch,
	};
}
