import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ResearchEntry {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	activity: string | null;
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

export interface ResearchSummaryData {
	total: number;
	signed: number;
	submitted: number;
	needsRevision: number;
	faculty: FacultyOption[];
}

export function useResearchActivities() {
	const queryClient = useQueryClient();

	const entriesQuery = useQuery({
		queryKey: ["research-activities", "entries"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/research-activities");
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as ResearchEntry[];
		},
	});

	const summaryQuery = useQuery({
		queryKey: ["research-activities", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/research-activities?view=summary");
			const payload = res.data?.data || res.data;
			return payload as ResearchSummaryData;
		},
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["research-activities"] });
	};

	const addRowMutation = useMutation({
		mutationFn: async () => {
			const res = await apiClient.post("/api/v1/research-activities", { action: "add" });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<ResearchEntry> }) => {
			const res = await apiClient.post("/api/v1/research-activities", { action: "update", id, data });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/research-activities", { action: "submit", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/research-activities", { action: "delete", id });
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
		updateEntry: (id: string, data: Partial<ResearchEntry>) => updateMutation.mutateAsync({ id, data }),
		submitEntry: (id: string) => submitMutation.mutateAsync(id),
		deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
	};
}
