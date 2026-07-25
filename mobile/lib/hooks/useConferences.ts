import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ConferenceEntry {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	conferenceName: string | null;
	conductedAt: string | null;
	participationRole: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyId: string | null;
	facultyRemark: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface ConferenceSummaryData {
	total: number;
	signed: number;
	submitted: number;
	needsRevision: number;
	faculty: FacultyOption[];
}

export function useConferences() {
	const queryClient = useQueryClient();

	const entriesQuery = useQuery({
		queryKey: ["conferences", "entries"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/conferences");
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as ConferenceEntry[];
		},
	});

	const summaryQuery = useQuery({
		queryKey: ["conferences", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/conferences?view=summary");
			const payload = res.data?.data || res.data;
			return payload as ConferenceSummaryData;
		},
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["conferences"] });
	};

	const addRowMutation = useMutation({
		mutationFn: async () => {
			const res = await apiClient.post("/api/v1/conferences", { action: "add" });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<ConferenceEntry> }) => {
			const res = await apiClient.post("/api/v1/conferences", { action: "update", id, data });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/conferences", { action: "submit", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/conferences", { action: "delete", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		refetchEntries: entriesQuery.refetch,
		summary: summaryQuery.data,
		faculty: summaryQuery.data?.faculty || [],
		addRow: () => addRowMutation.mutateAsync(),
		isAddingRow: addRowMutation.isPending,
		updateEntry: (id: string, data: Partial<ConferenceEntry>) => updateMutation.mutateAsync({ id, data }),
		submitEntry: (id: string) => submitMutation.mutateAsync(id),
		deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
	};
}
