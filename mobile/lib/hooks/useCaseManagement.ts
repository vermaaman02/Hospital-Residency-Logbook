import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CaseManagementEntry {
	id: string;
	userId: string;
	category: string;
	slNo: number;
	caseSubCategory: string;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	competencyLevel: "CBD" | "S" | "O" | "MS" | "MI" | null;
	totalCaseTally: number;
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

export interface CaseManagementSummary {
	totalByCategory: Record<string, number>;
	signedByCategory: Record<string, number>;
	submittedByCategory: Record<string, number>;
	needsRevisionByCategory: Record<string, number>;
}

export interface FacultyUser {
	id: string;
	firstName: string;
	lastName: string;
}

interface UseCaseManagementOptions {
	category?: string;
	mode?: "student" | "review";
}

export function useCaseManagement({ category, mode = "student" }: UseCaseManagementOptions = {}) {
	const queryClient = useQueryClient();

	// 1. Fetch Summary Data (24 categories statistics)
	const summaryQuery = useQuery({
		queryKey: ["case-management-summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/case-management?view=summary");
			return res.data.data as CaseManagementSummary & { faculty: FacultyUser[] };
		},
		enabled: mode === "student",
	});

	// 2. Fetch Category Entries
	const entriesQuery = useQuery({
		queryKey: ["case-management-entries", category, mode],
		queryFn: async () => {
			if (mode === "review") {
				const res = await apiClient.get(
					`/api/v1/case-management?mode=review${category ? `&category=${category}` : ""}`
				);
				return (res.data.data.entries || []) as CaseManagementEntry[];
			}
			if (!category) return [];
			const res = await apiClient.get(`/api/v1/case-management?category=${category}`);
			return (res.data.data.entries || []) as CaseManagementEntry[];
		},
		enabled: mode === "review" || Boolean(category),
	});

	// 3. Fetch Available Faculty
	const facultyQuery = useQuery({
		queryKey: ["case-management-faculty"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/case-management?mode=faculty-list");
			return (res.data.data.faculty || []) as FacultyUser[];
		},
	});

	// Mutations
	const initMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "init",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const addRowMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "add",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<CaseManagementEntry> }) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "update",
				id,
				...data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "submit",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "delete",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "sign",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const res = await apiClient.post("/api/v1/case-management", {
				action: "reject",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["case-management-entries"] });
			queryClient.invalidateQueries({ queryKey: ["case-management-summary"] });
		},
	});

	const entries = entriesQuery.data || [];
	const summary = summaryQuery.data;
	const facultyList = facultyQuery.data || summaryQuery.data?.faculty || [];

	const signedCount = entries.filter((e) => e.status === "SIGNED").length;
	const totalCount = entries.length;

	return {
		entries,
		summary,
		facultyList,
		signedCount,
		totalCount,
		isLoading: entriesQuery.isLoading || summaryQuery.isLoading,
		refetch: () => {
			entriesQuery.refetch();
			summaryQuery.refetch();
		},
		initCategory: initMutation.mutateAsync,
		isInitializing: initMutation.isPending,
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
