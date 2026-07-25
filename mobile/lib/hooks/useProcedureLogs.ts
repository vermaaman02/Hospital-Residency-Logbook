import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ProcedureLogEntry {
	id: string;
	userId: string;
	procedureCategory: string;
	slNo: number;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: "S" | "O" | "A" | "PS" | "PI" | "TM" | "TL" | null;
	totalProcedureTally: number | null;
	facultyId: string | null;
	facultyRemark: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
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

export interface ProcedureFacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface ProcedureSummaryData {
	totalByCategory: Record<string, number>;
	signedByCategory: Record<string, number>;
	submittedByCategory: Record<string, number>;
	needsRevisionByCategory: Record<string, number>;
	faculty: ProcedureFacultyOption[];
}

export function useProcedureLogs({
	category,
	mode = "student",
}: {
	category?: string;
	mode?: "student" | "review";
} = {}) {
	const queryClient = useQueryClient();

	// 1. Category entries list query
	const entriesQuery = useQuery({
		queryKey: ["procedure-logs", "entries", category, mode],
		queryFn: async () => {
			if (mode === "review") {
				const res = await apiClient.get(
					`/api/v1/procedures?mode=review${category ? `&category=${category}` : ""}`,
				);
				const payload = res.data?.data || res.data;
				return (payload?.entries || []) as ProcedureLogEntry[];
			}
			if (!category) return [];
			const res = await apiClient.get(`/api/v1/procedures?category=${category}`);
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as ProcedureLogEntry[];
		},
		enabled: mode === "review" || Boolean(category),
	});

	// 2. Summary query (49 categories stats & available faculty list)
	const summaryQuery = useQuery({
		queryKey: ["procedure-logs", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/procedures?view=summary");
			const payload = res.data?.data || res.data;
			return payload as ProcedureSummaryData;
		},
		enabled: mode === "student",
	});

	// Mutations
	const initCategoryMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "init",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const addRowMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "add",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<ProcedureLogEntry>;
		}) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "update",
				id,
				data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "submit",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "delete",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "sign",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const res = await apiClient.post("/api/v1/procedures", {
				action: "reject",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["procedure-logs"] });
		},
	});

	const entries = entriesQuery.data || [];
	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const totalCount = entries.length;

	return {
		entries,
		summary: summaryQuery.data,
		facultyList: summaryQuery.data?.faculty || [],
		signedCount,
		totalCount,
		isLoading: entriesQuery.isLoading || summaryQuery.isLoading,
		refetch: () => {
			entriesQuery.refetch();
			summaryQuery.refetch();
		},
		initCategory: initCategoryMutation.mutateAsync,
		isInitializing: initCategoryMutation.isPending,
		addRow: addRowMutation.mutateAsync,
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
