import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface QualityImprovementEntry {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	description: string | null;
	roleInActivity: string | null;
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

export interface QualityImprovementSummaryData {
	total: number;
	filled: number;
	draft: number;
	submitted: number;
	signed: number;
	needsRevision: number;
	faculty: FacultyOption[];
}

export function useQualityImprovement() {
	const queryClient = useQueryClient();

	const entriesQuery = useQuery({
		queryKey: ["quality-improvement", "entries"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/quality-improvement");
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as QualityImprovementEntry[];
		},
	});

	const summaryQuery = useQuery({
		queryKey: ["quality-improvement", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/quality-improvement?view=summary");
			const payload = res.data?.data || res.data;
			return payload as QualityImprovementSummaryData;
		},
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["quality-improvement"] });
	};

	const addRowMutation = useMutation({
		mutationFn: async () => {
			const res = await apiClient.post("/api/v1/quality-improvement", { action: "add" });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<QualityImprovementEntry> }) => {
			const res = await apiClient.post("/api/v1/quality-improvement", { action: "update", id, data });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/quality-improvement", { action: "submit", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/quality-improvement", { action: "delete", id });
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
		updateEntry: (id: string, data: Partial<QualityImprovementEntry>) => updateMutation.mutateAsync({ id, data }),
		submitEntry: (id: string) => submitMutation.mutateAsync(id),
		deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
	};
}
