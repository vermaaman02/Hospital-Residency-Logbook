import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DiagnosticSkillEntry {
	id: string;
	userId: string;
	diagnosticCategory: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: "VC" | "FC" | "SC" | "NC" | null;
	totalTimesPerformed: number;
	imageUrls: string[];
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyId: string | null;
	facultyRemark: string | null;
	createdAt: string;
	updatedAt: string;
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		batchRelation?: { name: string };
	};
}

export interface DiagnosticFacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface DiagnosticSummaryData {
	totalByCategory: Record<string, number>;
	signedByCategory: Record<string, number>;
	faculty: DiagnosticFacultyOption[];
}

export function useDiagnosticSkills({
	category,
	mode = "student",
}: {
	category?: string;
	mode?: "student" | "review";
} = {}) {
	const queryClient = useQueryClient();

	// 1. Category entries list query
	const entriesQuery = useQuery({
		queryKey: ["diagnostic-skills", "entries", category, mode],
		queryFn: async () => {
			if (mode === "review") {
				const res = await apiClient.get(
					`/api/v1/diagnostics?mode=review${category ? `&category=${category}` : ""}`,
				);
				const payload = res.data?.data || res.data;
				return (payload?.entries || []) as DiagnosticSkillEntry[];
			}
			if (!category) return [];
			const res = await apiClient.get(`/api/v1/diagnostics?category=${category}`);
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as DiagnosticSkillEntry[];
		},
		enabled: mode === "review" || Boolean(category),
	});

	// 2. Summary query (3 categories stats & available faculty list)
	const summaryQuery = useQuery({
		queryKey: ["diagnostic-skills", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/diagnostics?view=summary");
			const payload = res.data?.data || res.data;
			return payload as DiagnosticSummaryData;
		},
		enabled: mode === "student",
	});

	// Mutations
	const addRowMutation = useMutation({
		mutationFn: async ({ category, skillName, slNo }: { category: string; skillName?: string; slNo?: number }) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "add",
				category,
				data: { skillName, slNo },
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: {
				skillName: string;
				representativeDiagnosis?: string | null;
				confidenceLevel?: string | null;
				totalTimesPerformed?: number;
				imageUrls?: string[];
				facultyId?: string | null;
				diagnosticCategory: string;
			};
		}) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "update",
				id,
				data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "submit",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "delete",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "sign",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const res = await apiClient.post("/api/v1/diagnostics", {
				action: "reject",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["diagnostic-skills"] });
		},
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		refetchEntries: entriesQuery.refetch,

		summary: summaryQuery.data,
		isLoadingSummary: summaryQuery.isLoading,
		refetchSummary: summaryQuery.refetch,

		addRow: (category: string, skillName?: string, slNo?: number) =>
			addRowMutation.mutateAsync({ category, skillName, slNo }),
		isAddingRow: addRowMutation.isPending,

		updateEntry: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,

		submitEntry: submitMutation.mutateAsync,
		isSubmitting: submitMutation.isPending,

		deleteEntry: deleteMutation.mutateAsync,
		isDeleting: deleteMutation.isPending,

		signEntry: signMutation.mutateAsync,
		isSigning: signMutation.isPending,

		rejectEntry: rejectMutation.mutateAsync,
		isRejecting: rejectMutation.isPending,
	};
}
